import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  return NextResponse.json(
    {
      accepted: true,
      persisted: false,
      received: payload,
      note: "Follow mutations are intentionally stubbed in the scaffold until auth and storage are wired.",
    },
    { status: 202 },
  );
}
