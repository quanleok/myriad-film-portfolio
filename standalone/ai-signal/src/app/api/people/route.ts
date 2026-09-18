import { NextResponse } from "next/server";

import { people } from "@/lib/sample-data";

export function GET() {
  return NextResponse.json({
    people,
    persisted: false,
  });
}
