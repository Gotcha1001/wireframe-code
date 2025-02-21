import { NextRequest } from "next/server";

// Simple ping endpoint for keep-alive requests
export async function GET(req: NextRequest) {
  return new Response(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
  );
}
