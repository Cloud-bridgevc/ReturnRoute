// Shared PostgreSQL + event helpers for Lambda handlers.
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

async function getPool() {
  if (pool) return pool;
  const sm = new SecretsManagerClient({});
  const secret = await sm.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN! }));
  const { username, password } = JSON.parse(secret.SecretString ?? "{}");
  pool = new Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 5432), database: process.env.DB_NAME ?? "returnroute",
    user: username, password, ssl: { rejectUnauthorized: true }, max: 2,
  });
  return pool;
}

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await (await getPool()).connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export async function audit(c: PoolClient, returnId: string, kind: "human" | "ai" | "system", actor: string, action: string, detail?: unknown) {
  await c.query("INSERT INTO audit_events (return_id, actor_kind, actor, action, detail) VALUES ($1,$2,$3,$4,$5)", [returnId, kind, actor, action, detail ? JSON.stringify(detail) : null]);
}

const eb = new EventBridgeClient({});
export async function emit(detailType: string, detail: Record<string, unknown>) {
  await eb.send(new PutEventsCommand({
    Entries: [{ EventBusName: process.env.EVENT_BUS_NAME, Source: "returnroute.workflow", DetailType: detailType, Detail: JSON.stringify(detail) }],
  }));
}
