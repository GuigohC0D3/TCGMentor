import { NextRequest } from "next/server";
import { proxySSE } from "@/lib/sse-proxy";

export async function POST(req: NextRequest) {
  return proxySSE(req, "/api/v1/chat/regenerate");
}
