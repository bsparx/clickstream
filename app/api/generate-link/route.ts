import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID required" },
        { status: 400 }
      );
    }

    // Check if link already exists for this affiliate + campaign
    const existingLink = await prisma.link.findFirst({
      where: { affiliateId: userId, campaignId },
    });

    if (existingLink) {
      return NextResponse.json({ success: true, linkId: existingLink.id });
    }

    // Create new link
    const link = await prisma.link.create({
      data: {
        affiliateId: userId,
        campaignId,
      },
    });

    return NextResponse.json({ success: true, linkId: link.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating link:", message);
    return NextResponse.json(
      { error: "Failed to generate link" },
      { status: 500 }
    );
  }
}
