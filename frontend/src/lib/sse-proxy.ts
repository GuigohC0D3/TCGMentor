import { NextRequest } from "next/server";

const BACKEND =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

/** Proxy a POST to a backend SSE endpoint, forwarding cookies and streaming the body. */
export async function proxySSE(req: NextRequest, backendPath: string): Promise<Response> {
  const body = await req.text();
  const cookie = req.headers.get("cookie") ?? "";

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND}${backendPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body,
    });
  } catch {
    return new Response(JSON.stringify({ detail: "Backend unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversationId = upstream.headers.get("X-Conversation-Id");
  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  };
  if (conversationId) headers["X-Conversation-Id"] = conversationId;

  return new Response(upstream.body, { status: 200, headers });
}
