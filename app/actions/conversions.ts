"use server";

import { prisma } from "@/lib/prisma";

export async function recordConversion(data: {
  ref: string;
  orderId: string;
  orderTotal: number;
}) {
  try {
    const { ref, orderId, orderTotal } = data;

    if (!ref || !orderId || typeof orderTotal !== "number") {
      return { error: "Missing or invalid fields (ref, orderId, orderTotal)" };
    }

    if (orderTotal <= 0) {
      return { error: "Order total must be greater than 0" };
    }

    const link = await prisma.link.findUnique({
      where: { id: ref },
      include: {
        campaign: {
          include: { merchant: true },
        },
      },
    });

    if (!link || link.campaign.type !== "PPS" || !link.campaign.isActive) {
      return { error: "Invalid link or campaign is not PPS/active" };
    }

    // Idempotency: check for existing conversion with same orderId
    const existingConversion = await prisma.conversion.findUnique({
      where: { orderId },
    });

    if (existingConversion) {
      return { success: true, message: "Conversion already recorded" };
    }

    // Fraud: Validate that a valid click exists for this link (PPS attribution)
    const validClick = await prisma.click.findFirst({
      where: {
        linkId: ref,
        isValid: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!validClick) {
      return {
        error: "No valid click found for this referral — conversion rejected",
      };
    }

    const rewardPercentage = link.campaign.reward;
    const commission = orderTotal * (rewardPercentage / 100);

    await prisma.$transaction(async (tx) => {
      // Re-read merchant balance inside tx for concurrency safety
      const merchant = await tx.user.findUnique({
        where: { id: link.campaign.merchantId },
      });

      if (!merchant) {
        throw new Error("Merchant not found");
      }

      if (merchant.balance < commission) {
        // Not enough balance — flag the conversion but don't pay
        await tx.conversion.create({
          data: {
            linkId: ref,
            orderId,
            amount: commission,
            isFlagged: true,
          },
        });
        // Auto-stop campaign if balance is 0
        if (merchant.balance <= 0) {
          await tx.campaign.update({
            where: { id: link.campaign.id },
            data: { isActive: false },
          });
        }
        return;
      }

      // Deduct commission from merchant
      const updatedMerchant = await tx.user.update({
        where: { id: link.campaign.merchantId },
        data: { balance: { decrement: commission } },
      });

      // Credit affiliate
      await tx.user.update({
        where: { id: link.affiliateId },
        data: { balance: { increment: commission } },
      });

      // Create conversion record
      const conversion = await tx.conversion.create({
        data: {
          linkId: ref,
          orderId,
          amount: commission,
        },
      });

      // Create transaction ledger record
      await tx.transaction.create({
        data: {
          fromUserId: link.campaign.merchantId,
          toUserId: link.affiliateId,
          amount: commission,
          type: "PPS_CONVERSION",
          referenceId: conversion.id,
          description: `PPS conversion for order ${orderId} on ${link.campaign.targetUrl}`,
        },
      });

      // Auto-stop campaign if balance reaches $0
      if (updatedMerchant.balance <= 0) {
        await tx.campaign.update({
          where: { id: link.campaign.id },
          data: { isActive: false },
        });
      }
    });

    return { success: true, message: "Conversion recorded" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Conversion recording error:", message);
    return { error: "Internal Server Error" };
  }
}
