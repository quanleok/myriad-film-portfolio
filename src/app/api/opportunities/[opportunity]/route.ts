import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getOpportunityBySlugForApi } from "@/lib/opportunities-server";

interface RouteContext {
  params: Promise<{ opportunity: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const rateLimited = await checkRateLimit("opportunity-detail", 120);
    if (rateLimited) return rateLimited;

    const { opportunity } = await params;
    const slug = opportunity.trim();

    if (!slug) {
      return NextResponse.json({ error: "Missing opportunity slug" }, { status: 400 });
    }

    const listing = await getOpportunityBySlugForApi(slug);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("[api] opportunity detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
