import { NextResponse } from "next/server";

import { categories } from "@/lib/sample-data";

export function GET() {
  return NextResponse.json({
    categories,
    persisted: false,
  });
}
