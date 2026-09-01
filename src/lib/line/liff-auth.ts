import { verifyLiffIdToken } from "@/lib/line/verify";
import { getOrCreateUser } from "@/lib/domain/repo";
import type { AppUser } from "@/lib/supabase/types";

/**
 * Authenticate a LIFF API request. The client sends its LINE ID token as
 * `Authorization: Bearer <idToken>`; we verify it server-side and resolve the
 * KnowBody user. Returns null when unauthenticated.
 */
export async function authLiff(req: Request): Promise<AppUser | null> {
  const auth = req.headers.get("authorization");
  const idToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!idToken) return null;

  const verified = await verifyLiffIdToken(idToken);
  if (!verified) return null;

  return getOrCreateUser(verified.sub, async () =>
    verified.name ? { displayName: verified.name, pictureUrl: verified.picture } : null,
  );
}
