import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Known bot substrings for User-Agent analysis
const BOT_PATTERNS = [
  "bot",
  "crawler",
  "spider",
  "scraper",
  "curl",
  "wget",
  "python-requests",
  "httpclient",
  "java/",
  "go-http-client",
];

function isBotUserAgent(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some((p) => lower.includes(p));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const { linkId } = await params;

  if (!linkId) {
    return NextResponse.json({ error: "Missing linkId" }, { status: 400 });
  }

  const link = await prisma.link.findUnique({
    where: { id: linkId },
    include: {
      campaign: {
        include: { merchant: true },
      },
    },
  });

  if (!link || !link.campaign.isActive) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const campaign = link.campaign;

  // ── IP Address ──────────────────────────────────────────────
  const forwardedFor = request.headers.get("x-forwarded-for");
  let ipAddress = "127.0.0.1";
  if (forwardedFor) {
    ipAddress = forwardedFor.split(",")[0].trim();
  } else {
    ipAddress = request.headers.get("x-real-ip") || "127.0.0.1";
  }

  // ── IP Blacklist Check ──────────────────────────────────────
  const blacklisted = await prisma.iPBlacklist.findUnique({
    where: { ipAddress },
  });
  if (blacklisted) {
    // Log the click but mark as flagged & invalid
    await prisma.click.create({
      data: {
        linkId,
        campaignId: campaign.id,
        ipAddress,
        userAgent: request.headers.get("user-agent") || "",
        country:
          request.headers.get("x-vercel-ip-country") ||
          request.headers.get("cf-ipcountry") ||
          null,
        isValid: false,
        isFlagged: true,
      },
    });
    // Still redirect so the user doesn't see an error
    return NextResponse.redirect(campaign.targetUrl);
  }

  // ── User-Agent Analysis ─────────────────────────────────────
  const userAgent = request.headers.get("user-agent") || "";
  const botDetected = isBotUserAgent(userAgent);

  // ── Geo-Targeting ───────────────────────────────────────────
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;

  let geoBlocked = false;
  if (campaign.allowedCountries && campaign.allowedCountries.trim() !== "") {
    const allowed = campaign.allowedCountries
      .split(",")
      .map((c) => c.trim().toUpperCase());
    if (country && !allowed.includes(country.toUpperCase())) {
      geoBlocked = true;
    }
  }

  // ── Fraud Detection: Duplicate Click (IP + CampaignID in 24h) ──
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentClick = await prisma.click.findFirst({
    where: {
      campaignId: campaign.id,
      ipAddress,
      createdAt: { gte: oneDayAgo },
    },
  });

  const isDuplicate = !!recentClick;
  const isValid = !isDuplicate && !botDetected && !geoBlocked;
  const isFlagged = isDuplicate || botDetected || geoBlocked;

  // ── Log the Click ───────────────────────────────────────────
  const click = await prisma.click.create({
    data: {
      linkId,
      campaignId: campaign.id,
      ipAddress,
      userAgent,
      country,
      isValid,
      isFlagged,
    },
  });

  // ── PPC Payment Processing ──────────────────────────────────
  const isPPC = campaign.type === "PPC";
  const reward = campaign.reward;

  if (isPPC && isValid) {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read merchant balance inside tx for concurrency safety
        const merchant = await tx.user.findUnique({
          where: { id: campaign.merchantId },
        });
        if (!merchant || merchant.balance < reward) {
          // Not enough balance — mark click as invalid, skip payment
          await tx.click.update({
            where: { id: click.id },
            data: { isValid: false },
          });
          // Auto-stop campaign if balance is 0
          if (merchant && merchant.balance <= 0) {
            await tx.campaign.update({
              where: { id: campaign.id },
              data: { isActive: false },
            });
          }
          return;
        }

        // Deduct from merchant
        const updatedMerchant = await tx.user.update({
          where: { id: campaign.merchantId },
          data: { balance: { decrement: reward } },
        });

        // Credit affiliate
        await tx.user.update({
          where: { id: link.affiliateId },
          data: { balance: { increment: reward } },
        });

        // Create transaction ledger record
        await tx.transaction.create({
          data: {
            fromUserId: campaign.merchantId,
            toUserId: link.affiliateId,
            amount: reward,
            type: "PPC_CLICK",
            referenceId: click.id,
            description: `PPC click on ${campaign.targetUrl}`,
          },
        });

        // Auto-stop campaign if balance reaches $0
        if (updatedMerchant.balance <= 0) {
          await tx.campaign.update({
            where: { id: campaign.id },
            data: { isActive: false },
          });
        }
      });
    } catch (e) {
      console.error("Transaction failed for PPC click:", e);
    }
  }

  // ── Set Tracking Cookie for PPS Attribution ─────────────────
  const targetUrl = new URL(campaign.targetUrl);
  targetUrl.searchParams.set("ref", linkId);

  const response = NextResponse.redirect(targetUrl.toString());

  // Store only the linkId in cookie — the conversion script reads this
  response.cookies.set("cs_ref", linkId, {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    httpOnly: false, // Allow merchant sites to read this cookie
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
