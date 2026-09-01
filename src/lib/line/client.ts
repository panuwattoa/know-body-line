import type { LineOutgoingMessage } from "@/lib/line/types";

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";

function token(): string {
  const t = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!t) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");
  return t;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  };
}

/** Reply to a message using its (single-use) reply token. */
export async function reply(replyToken: string, messages: LineOutgoingMessage[]): Promise<void> {
  const res = await fetch(`${API}/message/reply`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
  });
  if (!res.ok) {
    console.error("LINE reply failed", res.status, await res.text());
  }
}

/** Push a message proactively (used by cron reminders + async results). */
export async function push(to: string, messages: LineOutgoingMessage[]): Promise<void> {
  const res = await fetch(`${API}/message/push`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ to, messages: messages.slice(0, 5) }),
  });
  if (!res.ok) {
    console.error("LINE push failed", res.status, await res.text());
  }
}

/** Download the binary content (image) a user sent. */
export async function getMessageContent(messageId: string): Promise<{
  buffer: Buffer;
  mediaType: string;
}> {
  const res = await fetch(`${DATA_API}/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) {
    throw new Error(`getMessageContent failed: ${res.status}`);
  }
  const mediaType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mediaType };
}

/** Fetch the user's LINE profile (display name, picture). */
export async function getProfile(userId: string): Promise<{
  displayName: string;
  pictureUrl?: string;
} | null> {
  const res = await fetch(`${API}/profile/${userId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { displayName: string; pictureUrl?: string };
}

/** Show the typing/loading animation in the 1:1 chat while we process. */
export async function showLoading(userId: string, seconds = 20): Promise<void> {
  try {
    await fetch(`${API}/chat/loading/start`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ chatId: userId, loadingSeconds: Math.min(seconds, 60) }),
    });
  } catch {
    // non-fatal
  }
}
