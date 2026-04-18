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
    ArrowUpRight,
    ArrowDownLeft,
} from "lucide-react";
import { GenerateLinkButton } from "@/components/GenerateLinkButton";
import { CopyableInput } from "@/components/CopyableInput";
import { AffiliateAnalyticsChart } from "@/components/AffiliateAnalyticsChart";

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
        include: {
            affiliateLinks: {
                include: { clicks: true, conversions: true, campaign: true },
            },
        },
    });

    if (!affiliate || affiliate.role !== "affiliate") {
        redirect("/onboarding");
    }

    // Calculate metrics
    let totalClicks = 0;
    let totalValidClicks = 0;
    let totalConversions = 0;

    affiliate.affiliateLinks.forEach((link) => {
        totalClicks += link.clicks.length;
        totalValidClicks += link.clicks.filter((c) => c.isValid).length;
        totalConversions += link.conversions.length;
    });

    // Fetch marketplace campaigns
    const activeCampaigns = await prisma.campaign.findMany({
        where: { isActive: true },
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

    const allClicks = affiliate.affiliateLinks.flatMap((l) => l.clicks);
    const allConversions = affiliate.affiliateLinks.flatMap((l) => l.conversions);

    const validClicks = allClicks.filter(
        (c) => c.isValid && c.createdAt >= thirtyDaysAgo
    );
    const recentConversions = allConversions.filter(
        (c) => c.createdAt >= thirtyDaysAgo
    );

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

    validClicks.forEach((c) => {
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

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
            </div>

            <Tabs defaultValue="analytics" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger
                        value="analytics"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger
                        value="marketplace"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Marketplace
                    </TabsTrigger>
                    <TabsTrigger
                        value="tracking"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Tracking Scripts
                    </TabsTrigger>
                    <TabsTrigger
                        value="transactions"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Transactions
                    </TabsTrigger>
                </TabsList>

                {/* ── Analytics ──────────────────────────────────────── */}
                <TabsContent value="analytics" className="space-y-8 pt-6">
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="border-zinc-200 shadow-sm transition-all hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Total Earnings
                                </CardTitle>
                                <div className="p-2 bg-emerald-100 rounded-full">
                                    <DollarSign className="h-5 w-5 text-emerald-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-5xl font-bold tracking-tight text-zinc-900">
                                    ${affiliate.balance.toFixed(2)}
                                </div>
                                <p className="text-sm text-emerald-600 mt-2 font-medium">
                                    Available to withdraw
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm transition-all hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Valid Clicks
                                </CardTitle>
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <MousePointerClick className="h-5 w-5 text-blue-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-5xl font-bold tracking-tight text-zinc-900">
                                    {totalValidClicks}
                                </div>
                                <p className="text-sm text-zinc-500 mt-2">
                                    Out of {totalClicks} total raw clicks
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm transition-all hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Sales Converted
                                </CardTitle>
                                <div className="p-2 bg-purple-100 rounded-full">
                                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-5xl font-bold tracking-tight text-zinc-900">
                                    {totalConversions}
                                </div>
                                <p className="text-sm text-zinc-500 mt-2">
                                    Completed PPS sales
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Time-Series Analytics Chart */}
                    <Card className="border-zinc-200 shadow-sm">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-zinc-500" /> Performance
                                Over Time (Last 30 Days)
                            </CardTitle>
                            <CardDescription>
                                Daily clicks, conversions, and earnings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <AffiliateAnalyticsChart data={chartData} />
                        </CardContent>
                    </Card>

                    {/* Performance Overview per Link */}
                    <Card className="border-zinc-200 shadow-sm">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-zinc-500" /> Link
                                Performance
                            </CardTitle>
                            <CardDescription>
                                Your link performance across all campaigns
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {affiliate.affiliateLinks.length > 0 ? (
                                <div className="space-y-4">
                                    {affiliate.affiliateLinks.map((link) => {
                                        const clicks = link.clicks.filter(
                                            (c) => c.isValid
                                        ).length;
                                        const conversions = link.conversions.length;
                                        const maxClicks = Math.max(
                                            ...affiliate.affiliateLinks.map(
                                                (l) => l.clicks.filter((c) => c.isValid).length
                                            ),
                                            1
                                        );

                                        return (
                                            <div key={link.id} className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="font-medium truncate">
                                                            {safeGetHostname(link.campaign.targetUrl)}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {link.campaign.type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-muted-foreground">
                                                        <span>{clicks} clicks</span>
                                                        <span>{conversions} conv.</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 h-6">
                                                    <div
                                                        className="bg-blue-500 rounded-sm transition-all"
                                                        style={{
                                                            width: `${(clicks / maxClicks) * 100}%`,
                                                            minWidth: clicks > 0 ? "4px" : "0",
                                                        }}
                                                        title={`${clicks} valid clicks`}
                                                    />
                                                    <div
                                                        className="bg-emerald-500 rounded-sm transition-all"
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
                                    <div className="flex items-center gap-6 pt-4 border-t text-xs text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                                            <span>Valid Clicks</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                                            <span>Conversions</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                                    <p>
                                        No performance data yet. Generate links from the Marketplace
                                        to start tracking.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <LinkIcon className="h-5 w-5 text-zinc-500" /> Active Tracking
                                Links
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {affiliate.affiliateLinks.length > 0 ? (
                                <div className="divide-y divide-zinc-100">
                                    {affiliate.affiliateLinks.map((link) => (
                                        <div
                                            key={link.id}
                                            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 hover:bg-zinc-50/80 transition-colors gap-4"
                                        >
                                            <div className="space-y-1 w-full sm:w-2/3">
                                                <div className="font-semibold flex items-center gap-2 text-lg">
                                                    {safeGetHostname(link.campaign.targetUrl)}
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-background"
                                                    >
                                                        {link.campaign.type}
                                                    </Badge>
                                                    <span className="text-sm font-normal text-emerald-600">
                                                        {link.campaign.type === "PPC"
                                                            ? `$${link.campaign.reward.toFixed(2)}/click`
                                                            : `${link.campaign.reward}%/sale`}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <LinkIcon className="w-4 h-4" />
                                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs select-all">
                                                        {`${APP_URL}/r/${link.id}`}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground pt-1 truncate max-w-[300px] sm:max-w-md">
                                                    Target: {link.campaign.targetUrl}
                                                </div>
                                            </div>
                                            <div className="flex gap-6 text-sm bg-background border rounded-md px-4 py-2 shadow-sm">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-foreground text-lg">
                                                        {
                                                            link.clicks.filter((c) => c.isValid)
                                                                .length
                                                        }
                                                    </span>
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                                        Clicks
                                                    </span>
                                                </div>
                                                <div className="w-px bg-border"></div>
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold text-foreground text-lg">
                                                        {link.conversions.length}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                                        Conv.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-4">
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
                                const existingLink = affiliate.affiliateLinks.find(
                                    (l) => l.campaignId === campaign.id
                                );

                                return (
                                    <Card key={campaign.id} className="flex flex-col">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <Badge>{campaign.type}</Badge>
                                                <span className="font-bold text-lg text-emerald-600">
                                                    {campaign.type === "PPC"
                                                        ? `$${campaign.reward.toFixed(2)}/click`
                                                        : `${campaign.reward}%/sale`}
                                                </span>
                                            </div>
                                            {campaign.discount > 0 && (
                                                <div className="mt-1">
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                                                        {campaign.discount}% user discount
                                                    </Badge>
                                                </div>
                                            )}
                                            <CardTitle
                                                className="mt-2 text-xl truncate"
                                                title={campaign.targetUrl}
                                            >
                                                {safeGetHostname(campaign.targetUrl)}
                                            </CardTitle>
                                            <CardDescription className="truncate">
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
                                                                className="text-xs"
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
                                                        className="w-fit self-center mb-2"
                                                    >
                                                        Link Generated
                                                    </Badge>
                                                    <CopyableInput
                                                        value={`${APP_URL}/r/${existingLink.id}`}
                                                    />
                                                    <p className="text-xs text-center text-muted-foreground mt-1">
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
                                <div className="col-span-full text-center py-10 text-muted-foreground">
                                    No active campaigns available at the moment.
                                </div>
                            )}
                    </div>
                </TabsContent>

                {/* ── Tracking Scripts ───────────────────────────────── */}
                <TabsContent value="tracking" className="space-y-6 pt-6">
                    <Card className="border-zinc-200 shadow-sm">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5 text-zinc-500" /> PPS Tracking Scripts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <p className="text-sm text-zinc-600">
                                For Pay-Per-Sale campaigns, share the tracking script below with
                                merchants. This script should be placed on their "Thank
                                You" or order confirmation page to track conversions.
                            </p>

                            {affiliate.affiliateLinks.filter((l) => l.campaign.type === "PPS")
                                .length > 0 ? (
                                affiliate.affiliateLinks
                                    .filter((l) => l.campaign.type === "PPS")
                                    .map((link) => (
                                        <div key={link.id} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-zinc-900">
                                                        {safeGetHostname(link.campaign.targetUrl)}
                                                    </h4>
                                                    <p className="text-xs text-zinc-500 truncate max-w-md">
                                                        {link.campaign.targetUrl}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                                >
                                                    {link.campaign.reward}% Commission
                                                </Badge>
                                            </div>
                                            <div className="relative">
                                                <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto">
                                                    <code
                                                        dangerouslySetInnerHTML={{
                                                            __html: `<script>
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
</script>`,
                                                        }}
                                                    />
                                                </pre>
                                            </div>
                                            <p className="text-xs text-zinc-500">
                                                Replace{" "}
                                                <code className="bg-zinc-100 px-1 rounded">
                                                    ORDER_ID_HERE
                                                </code>{" "}
                                                and{" "}
                                                <code className="bg-zinc-100 px-1 rounded">
                                                    ORDER_TOTAL_HERE
                                                </code>{" "}
                                                with dynamic order values.
                                            </p>
                                        </div>
                                    ))
                            ) : (
                                <div className="text-center py-8 text-zinc-500">
                                    <Code className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
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
                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-zinc-500" /> Earnings
                                History
                            </CardTitle>
                            <CardDescription>
                                All incoming transactions to your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right pr-6">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow
                                            key={tx.id}
                                            className="hover:bg-zinc-50/50"
                                        >
                                            <TableCell className="text-sm text-zinc-600">
                                                {tx.createdAt.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        tx.type === "PPC_CLICK"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : "bg-purple-50 text-purple-700 border-purple-200"
                                                    }
                                                >
                                                    {tx.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-zinc-600 max-w-xs truncate">
                                                {tx.description || tx.referenceId}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-semibold text-emerald-600">
                                                +${tx.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="text-center py-12 text-zinc-500"
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
