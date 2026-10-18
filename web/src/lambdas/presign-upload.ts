// HTTP API: POST /uploads { returnId, fileName, contentType }
// Returns a short-lived presigned PUT URL so the browser uploads inspection
// images straight to S3 (private bucket, SSE-KMS).
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

const s3 = new S3Client({});
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const body = JSON.parse(event.body ?? "{}") as { returnId?: string; fileName?: string; contentType?: string };
  if (!body.returnId || !/^RR-\d+$/.test(body.returnId) || !body.fileName || !body.contentType || !ALLOWED.has(body.contentType)) {
    return { statusCode: 400, body: JSON.stringify({ error: "returnId, fileName and an allowed contentType are required" }) };
  }
  const safe = body.fileName.replace(/[^a-z0-9.\-_]/gi, "_").slice(0, 100);
  const key = `returns/${body.returnId}/${Date.now()}-${safe}`;
  const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: key, ContentType: body.contentType }), { expiresIn: 300 });
  return { statusCode: 200, body: JSON.stringify({ url, bucket: process.env.MEDIA_BUCKET, key }) };
}
