import crypto from "node:crypto";

/**
 * Verify the `x-line-signature` header against the raw request body using
 * HMAC-SHA256 with the channel secret (base64). Always compare on the RAW body
 * bytes — re-serializing JSON will break the signature.
 * https://developers.line.biz/en/docs/messaging-api/receiving-messages/
 */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface VerifiedIdToken {
  sub: string; // LINE userId
  name?: string;
  picture?: string;
  email?: string;
}

/**
 * Verify a LIFF ID token server-side via LINE's OAuth verify endpoint, so the
 * LIFF client can prove which user it is without us trusting client-sent ids.
 * https://developers.line.biz/en/docs/liff/using-user-profile/
 */
export async function verifyLiffIdToken(idToken: string): Promise<VerifiedIdToken | null> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) throw new Error("Missing LINE_LOGIN_CHANNEL_ID");

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as VerifiedIdToken & { aud?: string };
  if (!data.sub) return null;
  return { sub: data.sub, name: data.name, picture: data.picture, email: data.email };
}
