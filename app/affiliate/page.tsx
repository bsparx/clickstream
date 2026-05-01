import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DollarSign,
    MousePointerClick,
    ShoppingCart,
    Link as LinkIcon,
    Code,
    TrendingUp,
} from "lucide-react";
import { GenerateLinkButton } from "@/components/GenerateLinkButton";
import { CopyableInput } from "@/components/CopyableInput";
import { AffiliateAnalyticsChartDynamic } from "@/components/AffiliateAnalyticsChartDynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function safeGetHostname(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

export default async function AffiliatePage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const affiliate = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!affiliate || affiliate.role !== "affiliate") {
        redirect("/onboarding");
    }

    // Fetch links with campaigns only (no heavy click/conversion includes)
    const affiliateLinks = await prisma.link.findMany({
        where: { affiliateId: userId },
        include: { campaign: true },
        take: 200,
    });

    const linkIds = affiliateLinks.map((l) => l.id);

    // Aggregate totals in a single batch
    const [
        totalClicksAgg,
        totalValidClicksAgg,
        totalConversionsAgg,
    ] = linkIds.length > 0
        ? await Promise.all([
              prisma.click.count({ where: { linkId: { in: linkIds } } }),
              prisma.click.count({ where: { linkId: { in: linkIds }, isValid: true } }),
              prisma.conversion.count({ where: { linkId: { in: linkIds } } }),
          ])
        : [0, 0, 0];

    // Fetch marketplace campaigns (limit to prevent unbounded growth)
    const activeCampaigns = await prisma.campaign.findMany({
        where: { isActive: true },
        take: 200,
    });

    // Fetch transaction history
    const transactions = await prisma.transaction.findMany({
        where: { toUserId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    // Build time-series data for analytics chart (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [recentValidClicks, recentConversions] = linkIds.length > 0
        ? await Promise.all([
              prisma.click.findMany({
                  where: { linkId: { in: linkIds }, isValid: true, createdAt: { gte: thirtyDaysAgo } },
                  select: { createdAt: true },
                  take: 1000,
              }),
              prisma.conversion.findMany({
                  where: { linkId: { in: linkIds }, createdAt: { gte: thirtyDaysAgo } },
                  select: { createdAt: true, amount: true },
                  take: 1000,
              }),
          ])
        : [[], []];

    // Group by date
    const clicksByDate: Record<string, number> = {};
    const conversionsByDate: Record<string, number> = {};
    const earningsByDate: Record<string, number> = {};

    for (let i = 0; i < 30; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        clicksByDate[key] = 0;
        conversionsByDate[key] = 0;
        earningsByDate[key] = 0;
    }

    recentValidClicks.forEach((c) => {
        const key = c.createdAt.toISOString().split("T")[0];
        if (key in clicksByDate) clicksByDate[key]++;
    });

    recentConversions.forEach((c) => {
        const key = c.createdAt.toISOString().split("T")[0];
        if (key in conversionsByDate) {
            conversionsByDate[key]++;
            earningsByDate[key] += c.amount;
        }
    });

    const chartData = Object.keys(clicksByDate)
        .sort()
        .map((date) => ({
            date,
            clicks: clicksByDate[date] || 0,
            conversions: conversionsByDate[date] || 0,
            earnings: Number((earningsByDate[date] || 0).toFixed(2)),
        }));

    // Per-link stats via groupBy (2 queries instead of N*2)
    const [clicksGrouped, conversionsGrouped] = linkIds.length > 0
        ? await Promise.all([
              prisma.click.groupBy({
                  by: ["linkId"],
                  where: { linkId: { in: linkIds }, isValid: true },
                  _count: { id: true },
              }),
              prisma.conversion.groupBy({
                  by: ["linkId"],
                  where: { linkId: { in: linkIds } },
                  _count: { id: true },
              }),
          ])
        : [[], []];

    const clicksByLink = new Map(clicksGrouped.map((g) => [g.linkId, g._count.id]));
    const conversionsByLink = new Map(conversionsGrouped.map((g) => [g.linkId, g._count.id]));

    const maxClicks = Math.max(
        ...affiliateLinks.map((l) => clicksByLink.get(l.id) || 0),
        1
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Affiliate Dashboard</h1>
            </div>

            <Tabs defaultValue="analytics" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 p-1 bg-[#232428] rounded-lg border border-white/5">
                    <TabsTrigger
                        value="analytics"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-[#949ba4]"
                    >
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger
                        value="marketplace"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-[#949ba4]"
                    >
                        Marketplace
                    </TabsTrigger>
                    <TabsTrigger
                        value="tracking"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-[#949ba4]"
                    >
                        Tracking Scripts
                    </TabsTrigger>
                    <TabsTrigger
                        value="transactions"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-[#949ba4]"
                    >
                        Transactions
                    </TabsTrigger>
                </TabsList>

                {/* ── Analytics ──────────────────────────────────────── */}
                <TabsContent value="analytics" className="space-y-8 pt-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="bg-[#232428] border-white/5 hover:border-[#57F287]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Total Earnings
                                </CardTitle>
                                <div className="p-2 bg-[#57F287]/10 rounded-full border border-[#57F287]/20">
                                    <DollarSign className="h-5 w-5 text-[#57F287]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-5xl font-bold tracking-tight text-white">
                                    ${affiliate.balance.toFixed(2)}
                                </div>
                                <p className="text-sm text-[#57F287] mt-2 font-medium">
                                    Available to withdraw
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5 hover:border-[#5865F2]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Valid Clicks
                                </CardTitle>
                                <div className="p-2 bg-[#5865F2]/20 rounded-full border border-[#5865F2]/20">
                                    <MousePointerClick className="h-5 w-5 text-[#5865F2]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-5xl font-bold tracking-tight text-white">
                                    {totalValidClicksAgg}
                                </div>
                                <p className="text-sm text-[#949ba4] mt-2">
                                    Out of {totalClicksAgg} total raw clicks
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5 hover:border-[#bd00ff]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Sales Converted
                                </CardTitle>
                                <div className="p-2 bg-[#bd00ff]/10 rounded-full border border-[#bd00ff]/20">
                                    <ShoppingCart className="h-5 w-5 text-[#bd00ff]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-5xl font-bold tracking-tight text-white">
                                    {totalConversionsAgg}
                                </div>
                                <p className="text-sm text-[#949ba4] mt-2">
                                    Completed PPS sales
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Time-Series Analytics Chart */}
                    <Card className="bg-[#232428] border-white/5">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <TrendingUp className="h-5 w-5 text-[#5865F2]" /> Performance
                                Over Time (Last 30 Days)
                            </CardTitle>
                            <CardDescription className="text-[#949ba4]">
                                Daily clicks, conversions, and earnings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <AffiliateAnalyticsChartDynamic data={chartData} />
                        </CardContent>
                    </Card>

                    {/* Performance Overview per Link */}
                    <Card className="bg-[#232428] border-white/5">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <TrendingUp className="h-5 w-5 text-[#5865F2]" /> Link
                                Performance
                            </CardTitle>
                            <CardDescription className="text-[#949ba4]">
                                Your link performance across all campaigns
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {affiliateLinks.length > 0 ? (
                                <div className="space-y-4">
                                    {affiliateLinks.map((link) => {
                                        const clicks = clicksByLink.get(link.id) || 0;
                                        const conversions = conversionsByLink.get(link.id) || 0;

                                        return (
                                            <div key={link.id} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="font-medium truncate text-white">
                                                            {safeGetHostname(link.campaign.targetUrl)}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs border-white/10 text-[#949ba4]">
                                                            {link.campaign.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[#949ba4]">
                                                        <span>{clicks} clicks</span>
                                                        <span>{conversions} conv.</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 h-6">
                                                    <div
                                                        className="bg-[#5865F2] rounded-sm transition-all"
                                                        style={{
                                                            width: `${(clicks / maxClicks) * 100}%`,
                                                            minWidth: clicks > 0 ? "4px" : "0",
                                                        }}
                                                        title={`${clicks} valid clicks`}
                                                    />
                                                    <div
                                                        className="bg-[#57F287] rounded-sm transition-all"
                                                        style={{
                                                            width: `${(conversions / maxClicks) * 100}%`,
                                                            minWidth: conversions > 0 ? "4px" : "0",
                                                        }}
                                                        title={`${conversions} conversions`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex items-center gap-6 pt-4 border-t border-white/5 text-xs text-[#949ba4]">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-[#5865F2] rounded-sm" />
                                            <span>Valid Clicks</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-[#57F287] rounded-sm" />
                                            <span>Conversions</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-[#949ba4]">
                                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-[#949ba4]/30" />
                                    <p>
                                        No performance data yet. Generate links from the Marketplace
                                        to start tracking.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <LinkIcon className="h-5 w-5 text-[#5865F2]" /> Active Tracking
                                Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {affiliateLinks.length > 0 ? (
                                <div className="divide-y divide-white/5">
                                    {affiliateLinks.map((link) => {
                                        const validClicks = clicksByLink.get(link.id) || 0;
                                        const conversions = conversionsByLink.get(link.id) || 0;

                                        return (
                                            <div
                                                key={link.id}
                                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 hover:bg-white/5 transition-colors gap-4"
                                            >
                                                <div className="space-y-1 w-full sm:w-2/3">
                                                    <div className="font-semibold flex items-center gap-2 text-lg text-white">
                                                        {safeGetHostname(link.campaign.targetUrl)}
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-[#1a1b1e] border-white/10 text-[#949ba4]"
                                                        >
                                                            {link.campaign.type}
                                                        </Badge>
                                                        <span className="text-sm font-normal text-[#57F287]">
                                                            {link.campaign.type === "PPC"
                                                                ? `$${link.campaign.reward.toFixed(2)}/click`
                                                                : `${link.campaign.reward}%/sale`}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-[#949ba4] flex items-center gap-2">
                                                        <LinkIcon className="w-4 h-4" />
                                                        <span className="font-mono bg-[#1a1b1e] px-1.5 py-0.5 rounded text-xs select-all text-[#949ba4]">
                                                            {`${APP_URL}/r/${link.id}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-[#949ba4] pt-1 truncate max-w-[300px] sm:max-w-md">
                                                        Target: {link.campaign.targetUrl}
                                                    </div>
                                                </div>
                                                <div className="flex gap-6 text-sm bg-[#1a1b1e] border border-white/5 rounded-md px-4 py-2">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-white text-lg">
                                                            {validClicks}
                                                        </span>
                                                        <span className="text-xs text-[#949ba4] uppercase tracking-wider">
                                                            Clicks
                                                        </span>
                                                    </div>
                                                    <div className="w-px bg-white/5"></div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-white text-lg">
                                                            {conversions}
                                                        </span>
                                                        <span className="text-xs text-[#949ba4] uppercase tracking-wider">
                                                            Conv.
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-[#949ba4] py-4">
                                    No active links. Generate some from the Marketplace!
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Marketplace ────────────────────────────────────── */}
                <TabsContent value="marketplace" className="space-y-6 pt-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeCampaigns.length > 0
                            ? activeCampaigns.map((campaign) => {
                                const existingLink = affiliateLinks.find(
                                    (l) => l.campaignId === campaign.id
                                );

                                return (
                                    <Card key={campaign.id} className="flex flex-col bg-[#232428] border-white/5 hover:border-[#5865F2]/20 transition-all">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <Badge className="bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]/20">{campaign.type}</Badge>
                                                <span className="font-bold text-lg text-[#57F287]">
                                                    {campaign.type === "PPC"
                                                        ? `$${campaign.reward.toFixed(2)}/click`
                                                        : `${campaign.reward}%/sale`}
                                                </span>
                                            </div>
                                            {campaign.discount > 0 && (
                                                <div className="mt-1">
                                                    <Badge variant="secondary" className="bg-[#FEE75C]/10 text-[#FEE75C] border-[#FEE75C]/20">
                                                        {campaign.discount}% user discount
                                                    </Badge>
                                                </div>
                                            )}
                                            <CardTitle
                                                className="mt-2 text-xl truncate text-white"
                                                title={campaign.targetUrl}
                                            >
                                                {safeGetHostname(campaign.targetUrl)}
                                            </CardTitle>
                                            <CardDescription className="truncate text-[#949ba4]">
                                                {campaign.targetUrl}
                                            </CardDescription>
                                            {campaign.allowedCountries && (
                                                <div className="flex gap-1 flex-wrap mt-1">
                                                    {campaign.allowedCountries
                                                        .split(",")
                                                        .map((code) => (
                                                            <Badge
                                                                key={code}
                                                                variant="secondary"
                                                                className="text-xs bg-white/5 text-[#949ba4] border-white/10"
                                                            >
                                                                {code}
                                                            </Badge>
                                                        ))}
                                                </div>
                                            )}
                                        </CardHeader>
                                        <CardContent className="mt-auto pt-4">
                                            {existingLink ? (
                                                <div className="flex flex-col gap-2">
                                                    <Badge
                                                        variant="secondary"
                                                        className="w-fit self-center mb-2 bg-[#57F287]/10 text-[#57F287] border-[#57F287]/20"
                                                    >
                                                        Link Generated
                                                    </Badge>
                                                    <CopyableInput
                                                        value={`${APP_URL}/r/${existingLink.id}`}
                                                    />
                                                    <p className="text-xs text-center text-[#949ba4] mt-1">
                                                        Click to copy
                                                    </p>
                                                </div>
                                            ) : (
                                                <GenerateLinkButton campaignId={campaign.id} />
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })
                            : activeCampaigns.length === 0 && (
                                <div className="col-span-full text-center py-10 text-[#949ba4]">
                                    No active campaigns available at the moment.
                                </div>
                            )}
                    </div>
                </TabsContent>

                {/* ── Tracking Scripts ───────────────────────────────── */}
                <TabsContent value="tracking" className="space-y-6 pt-6">
                    <Card className="bg-[#232428] border-white/5">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Code className="h-5 w-5 text-[#5865F2]" /> PPS Tracking Scripts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <p className="text-sm text-[#949ba4]">
                                For Pay-Per-Sale campaigns, share the tracking script below with
                                merchants. This script should be placed on their &quot;Thank
                                You&quot; or order confirmation page to track conversions.
                            </p>

                            {affiliateLinks.filter((l) => l.campaign.type === "PPS")
                                .length > 0 ? (
                                affiliateLinks
                                    .filter((l) => l.campaign.type === "PPS")
                                    .map((link) => (
                                        <div key={link.id} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-white">
                                                        {safeGetHostname(link.campaign.targetUrl)}
                                                    </h4>
                                                    <p className="text-xs text-[#949ba4] truncate max-w-md">
                                                        {link.campaign.targetUrl}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-[#57F287]/10 text-[#57F287] border-[#57F287]/20"
                                                >
                                                    {link.campaign.reward}% Commission
                                                </Badge>
                                            </div>
                                            <div className="relative">
                                                <pre className="bg-[#1a1b1e] text-[#00f0ff] p-4 rounded-lg text-xs overflow-x-auto border border-white/5 font-mono">
                                                    <code
                                                        dangerouslySetInnerHTML={{
                                                            __html: `&lt;script&gt;
  (function() {
    const cookieMatch = document.cookie.match(/cs_ref=([^;]+)/);
    const ref = cookieMatch ? cookieMatch[1] : null;
    const orderId = 'ORDER_ID_HERE';
    const orderTotal = ORDER_TOTAL_HERE;
    
    if (ref && orderId && orderTotal) {
      fetch('${APP_URL}/api/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, orderId, orderTotal })
      });
    }
  })();
&lt;/script&gt;`,
                                                        }}
                                                    />
                                                </pre>
                                            </div>
                                            <p className="text-xs text-[#949ba4]">
                                                Replace{" "}
                                                <code className="bg-[#1a1b1e] px-1 rounded border border-white/5 text-[#00f0ff]">
                                                    ORDER_ID_HERE
                                                </code>{" "}
                                                and{" "}
                                                <code className="bg-[#1a1b1e] px-1 rounded border border-white/5 text-[#00f0ff]">
                                                    ORDER_TOTAL_HERE
                                                </code>{" "}
                                                with dynamic order values.
                                            </p>
                                        </div>
                                    ))
                            ) : (
                                <div className="text-center py-8 text-[#949ba4]">
                                    <Code className="h-8 w-8 text-[#949ba4]/30 mx-auto mb-2" />
                                    <p>
                                        No PPS campaigns found. Generate links from PPS campaigns in
                                        the Marketplace to get tracking scripts.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Transaction History ────────────────────────────── */}
                <TabsContent value="transactions" className="space-y-6 pt-6">
                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <DollarSign className="h-5 w-5 text-[#5865F2]" /> Earnings
                                History
                            </CardTitle>
                            <CardDescription className="text-[#949ba4]">
                                All incoming transactions to your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">Date</TableHead>
                                        <TableHead className="text-[#949ba4]">Type</TableHead>
                                        <TableHead className="text-[#949ba4]">Description</TableHead>
                                        <TableHead className="text-right pr-6 text-[#949ba4]">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow
                                            key={tx.id}
                                            className="border-white/5 hover:bg-white/5"
                                        >
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {tx.createdAt.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        tx.type === "PPC_CLICK"
                                                            ? "bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20"
                                                            : "bg-[#bd00ff]/10 text-[#bd00ff] border-[#bd00ff]/20"
                                                    }
                                                >
                                                    {tx.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4] max-w-xs truncate">
                                                {tx.description || tx.referenceId}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-semibold text-[#57F287]">
                                                +${tx.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="text-center py-12 text-[#949ba4]"
                                            >
                                                No earnings yet. Generate links and share them to start
                                                earning.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
