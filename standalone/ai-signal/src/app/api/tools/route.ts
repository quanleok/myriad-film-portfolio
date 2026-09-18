import { NextResponse } from "next/server";

import { tools } from "@/lib/sample-data";

export function GET() {
  return NextResponse.json({
    tools,
    persisted: false,
  });
}
