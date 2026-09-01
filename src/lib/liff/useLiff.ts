"use client";

import { useEffect, useState } from "react";

export interface LiffState {
  ready: boolean;
  loggedIn: boolean;
  idToken: string | null;
  profile: { userId: string; displayName: string; pictureUrl?: string } | null;
  error: string | null;
}

/**
 * Initialize LIFF, ensure the user is logged in, and expose the ID token used to
 * authenticate our API routes. Pass the per-view LIFF id.
 */
export function useLiff(liffId: string): LiffState {
  const [state, setState] = useState<LiffState>({
    ready: false,
    loggedIn: false,
    idToken: null,
    profile: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        if (!liffId) throw new Error("LIFF id ยังไม่ได้ตั้งค่า");
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return;
        }

        const [profile, idToken] = await Promise.all([liff.getProfile(), Promise.resolve(liff.getIDToken())]);
        if (cancelled) return;
        setState({
          ready: true,
          loggedIn: true,
          idToken,
          profile: { userId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl },
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({ ...s, ready: true, error: e instanceof Error ? e.message : "LIFF error" }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liffId]);

  return state;
}

/** Authenticated fetch to KnowBody API routes. */
export async function apiFetch<T>(
  path: string,
  idToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export function closeLiff() {
  import("@line/liff").then(({ default: liff }) => {
    try {
      liff.closeWindow();
    } catch {
      /* not in LINE client */
    }
  });
}
