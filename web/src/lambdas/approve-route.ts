// HTTP API: POST /returns/{id}/decision  (Cognito JWT authoriser)
// The ONLY path that turns a recommendation into a binding decision. It checks
// the caller's role against explicit business rules, records the decision and
// the staff refund decision, then emits "RouteApproved" for task creation.
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from "aws-lambda";
import type { Decision, RecoveryRoute, Role, RouteOption } from "../lib/domain/types";
import { canApprove } from "../lib/engine/recovery";
import { audit, emit, tx } from "./shared/db";

const res = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({ statusCode, body: JSON.stringify(body) });

export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer): Promise<APIGatewayProxyResultV2> {
  const returnId = event.pathParameters?.id;
  const email = event.requestContext.authorizer.jwt.claims.email as string | undefined;
  const body = JSON.parse(event.body ?? "{}") as { route?: RecoveryRoute; note?: string; refundDecision?: Decision["refundDecision"] };
  if (!returnId || !email || !body.route || !body.refundDecision) return res(400, { error: "route and refundDecision are required" });

  try {
    const decisionId = await tx(async (c) => {
      const { rows: [staff] } = await c.query<{ id: string; name: string; role: Role }>("SELECT id, name, role FROM staff WHERE email = $1 AND active", [email]);
      if (!staff) throw new HttpError(403, "Unknown or inactive staff member");

      const { rows: [rec] } = await c.query(
        `SELECT rec.id, rec.route, rec.options, rec.approval_level, rec.verification_id, r.stage
         FROM recommendations rec JOIN returns r ON r.id = rec.return_id
         WHERE rec.return_id = $1 ORDER BY rec.created_at DESC LIMIT 1 FOR UPDATE OF r`, [returnId]);
      if (!rec || rec.stage !== "approval") throw new HttpError(409, "Return is not awaiting approval");
      if (!rec.verification_id) throw new HttpError(409, "Condition grade has not been verified by an inspector");
      if (!canApprove(staff.role, rec.approval_level)) throw new HttpError(403, `Requires ${rec.approval_level} approval`);
      if (body.route === "RECYCLE" && staff.role !== "supervisor") throw new HttpError(403, "Disposal requires supervisor approval");
      const opt = (rec.options as RouteOption[]).find((o) => o.route === body.route);
      if (!opt || !opt.eligible) throw new HttpError(422, `Route not permitted: ${opt?.blockedBy[0] ?? "unknown route"}`);
      const overridden = body.route !== rec.route;
      if (overridden && !body.note?.trim()) throw new HttpError(422, "Override reason required");

      const { rows: [d] } = await c.query(
        `INSERT INTO decisions (return_id, recommendation_id, route, decided_by, decided_role, overridden, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [returnId, rec.id, body.route, staff.id, staff.role, overridden, body.note ?? null]);
      await c.query("INSERT INTO refund_decisions (decision_id, outcome, decided_by) VALUES ($1,$2,$3)", [d.id, body.refundDecision, staff.id]);
      await audit(c, returnId, "human", staff.name, overridden ? "Route approved with override" : "Recommended route approved",
        { route: body.route, refund: body.refundDecision, note: body.note });
      return d.id as string;
    });
    await emit("RouteApproved", { decisionId });
    return res(200, { decisionId });
  } catch (e) {
    if (e instanceof HttpError) return res(e.status, { error: e.message });
    throw e;
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
