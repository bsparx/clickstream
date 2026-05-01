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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import {
    Wallet,
    Megaphone,
    PlusCircle,
    Code,
    TrendingUp,
    MousePointerClick,
    ShoppingCart,
    DollarSign,
    ArrowUpRight,
    ArrowDownLeft,
    Globe,
} from "lucide-react";
import { revalidatePath } from "next/cache";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function safeGetHostname(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

export default async function MerchantPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const merchant = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!merchant || merchant.role !== "merchant") {
        redirect("/onboarding");
    }

    // Fetch campaigns only (no heavy relation includes)
    const merchantCampaigns = await prisma.campaign.findMany({
        where: { merchantId: userId },
        orderBy: { createdAt: "desc" },
        take: 200,
    });

    const campaignIds = merchantCampaigns.map((c) => c.id);

    // Fetch all links for these campaigns
    const campaignLinks = campaignIds.length > 0
        ? await prisma.link.findMany({
              where: { campaignId: { in: campaignIds } },
              select: { id: true, campaignId: true },
              take: 1000,
          })
        : [];

    const linkIds = campaignLinks.map((l) => l.id);
    const linkToCampaign = new Map(campaignLinks.map((l) => [l.id, l.campaignId]));

    // Aggregate totals in a single batch
    const [totalClicksAgg, totalValidClicksAgg, totalConversionsAgg] =
        linkIds.length > 0
            ? await Promise.all([
                  prisma.click.count({ where: { linkId: { in: linkIds } } }),
                  prisma.click.count({ where: { linkId: { in: linkIds }, isValid: true } }),
                  prisma.conversion.count({ where: { linkId: { in: linkIds } } }),
              ])
            : [0, 0, 0];

    // Grouped stats by linkId (2 queries total instead of N*2)
    const [clicksGrouped, conversionsGrouped, conversionsSum] =
        linkIds.length > 0
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
                  prisma.conversion.aggregate({
                      where: { linkId: { in: linkIds } },
                      _sum: { amount: true },
                  }),
              ])
            : [[], [], { _sum: { amount: 0 } }];

    const clicksByLink = new Map(clicksGrouped.map((g) => [g.linkId, g._count.id]));
    const conversionsByLink = new Map(conversionsGrouped.map((g) => [g.linkId, g._count.id]));

    // Calculate total spent efficiently
    let totalSpent = 0;
    const campaignRewardMap = new Map(merchantCampaigns.map((c) => [c.id, c.reward]));
    const campaignTypeMap = new Map(merchantCampaigns.map((c) => [c.id, c.type]));

    // PPC: sum valid clicks per link * campaign reward
    for (const [linkId, count] of clicksByLink) {
        const cid = linkToCampaign.get(linkId);
        if (cid && campaignTypeMap.get(cid) === "PPC") {
            totalSpent += count * (campaignRewardMap.get(cid) || 0);
        }
    }

    // PPS: add conversion sums
    totalSpent += conversionsSum._sum.amount || 0;

    // Per-campaign stats aggregated from link-level groupBy
    const campaignStatsMap = new Map<
        string,
        { validClicks: number; conversions: number }
    >();
    for (const c of merchantCampaigns) {
        campaignStatsMap.set(c.id, { validClicks: 0, conversions: 0 });
    }
    for (const [linkId, count] of clicksByLink) {
        const cid = linkToCampaign.get(linkId);
        if (cid) {
            const s = campaignStatsMap.get(cid);
            if (s) s.validClicks += count;
        }
    }
    for (const [linkId, count] of conversionsByLink) {
        const cid = linkToCampaign.get(linkId);
        if (cid) {
            const s = campaignStatsMap.get(cid);
            if (s) s.conversions += count;
        }
    }

    const maxClicks = Math.max(
        ...Array.from(campaignStatsMap.values()).map((s) => s.validClicks),
        1
    );

    // Fetch transaction history
    const transactions = await prisma.transaction.findMany({
        where: {
            OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    // ── Server Actions ──────────────────────────────────────────

    async function depositFunds(formData: FormData) {
        "use server";
        const amount = parseFloat(formData.get("amount") as string);
        if (isNaN(amount) || amount <= 0) return;

        const { userId } = await auth();
        if (!userId) return;

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { balance: { increment: amount } },
            });

            await tx.transaction.create({
                data: {
                    fromUserId: userId,
                    toUserId: userId,
                    amount,
                    type: "DEPOSIT",
                    referenceId: `deposit-${Date.now()}`,
                    description: "Wallet deposit (mock payment)",
                },
            });
        });

        revalidatePath("/merchant");
    }

    async function createCampaign(formData: FormData) {
        "use server";
        const targetUrl = formData.get("targetUrl") as string;
        const type = formData.get("type") as string;
        const reward = parseFloat(formData.get("reward") as string);
        const discount = parseFloat(formData.get("discount") as string) || 0;
        const allowedCountries = (formData.get("allowedCountries") as string) || "";

        if (!targetUrl || !["PPC", "PPS"].includes(type) || isNaN(reward)) return;

        const { userId } = await auth();
        if (!userId) return;

        await prisma.campaign.create({
            data: {
                merchantId: userId,
                targetUrl,
                type,
                reward,
                discount,
                allowedCountries: allowedCountries
                    .split(",")
                    .map((c: string) => c.trim().toUpperCase())
                    .filter(Boolean)
                    .join(","),
                isActive: true,
            },
        });

        revalidatePath("/merchant");
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Merchant Dashboard</h1>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 p-1 bg-[#232428] rounded-lg border border-white/5">
                    <TabsTrigger
                        value="overview"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-[#949ba4]"
                    >
                        Overview & Wallet
                    </TabsTrigger>
                    <TabsTrigger
                        value="campaigns"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-[#949ba4]"
                    >
                        Campaigns
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

                {/* ── Overview & Wallet ──────────────────────────────── */}
                <TabsContent value="overview" className="space-y-6 pt-6">
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="bg-[#232428] border-white/5 hover:border-[#57F287]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Available Balance
                                </CardTitle>
                                <div className="p-2 bg-[#57F287]/10 rounded-full border border-[#57F287]/20">
                                    <Wallet className="h-5 w-5 text-[#57F287]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    ${merchant.balance.toFixed(2)}
                                </div>
                                <p className="text-sm text-[#949ba4] mt-2">Current funds</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5 hover:border-red-500/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Total Spent
                                </CardTitle>
                                <div className="p-2 bg-red-500/10 rounded-full border border-red-500/20">
                                    <DollarSign className="h-5 w-5 text-red-400" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    ${totalSpent.toFixed(2)}
                                </div>
                                <p className="text-sm text-[#949ba4] mt-2">
                                    Across all campaigns
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
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    {totalValidClicksAgg}
                                </div>
                                <p className="text-sm text-[#949ba4] mt-2">
                                    Out of {totalClicksAgg} total
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5 hover:border-[#bd00ff]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Conversions
                                </CardTitle>
                                <div className="p-2 bg-[#bd00ff]/10 rounded-full border border-[#bd00ff]/20">
                                    <ShoppingCart className="h-5 w-5 text-[#bd00ff]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    {totalConversionsAgg}
                                </div>
                                <p className="text-sm text-[#949ba4] mt-2">PPS sales tracked</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="bg-[#232428] border-white/5">
                            <CardHeader className="border-b border-white/5">
                                <CardTitle className="text-lg text-white">Deposit Funds</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form action={depositFunds} className="flex flex-col gap-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949ba4]">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                name="amount"
                                                placeholder="0.00"
                                                step="0.01"
                                                min="1"
                                                className="pl-8 text-lg bg-[#1a1b1e] border-white/10 text-white placeholder:text-[#949ba4]/50 focus-visible:ring-[#5865F2]"
                                                required
                                            />
                                        </div>
                                        <Button type="submit" size="lg" className="px-8 bg-gradient-to-r from-[#5865F2] to-[#7289DA] hover:opacity-90 text-white border-0 glow-blurple">
                                            Deposit
                                        </Button>
                                    </div>
                                    <p className="text-xs text-[#949ba4] text-center">
                                        Mock payment system. Funds are instantly credited.
                                    </p>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5">
                            <CardHeader className="border-b border-white/5">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <TrendingUp className="h-5 w-5 text-[#5865F2]" /> Campaign
                                    Performance
                                </CardTitle>
                                <CardDescription className="text-[#949ba4]">
                                    Click and conversion metrics by campaign
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {merchantCampaigns.length > 0 ? (
                                    <div className="space-y-4">
                                        {merchantCampaigns.map((campaign) => {
                                            const stats = campaignStatsMap.get(campaign.id);
                                            const campaignClicks = stats?.validClicks || 0;
                                            const campaignConversions = stats?.conversions || 0;

                                            return (
                                                <div key={campaign.id} className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span className="font-medium truncate text-white">
                                                                {safeGetHostname(campaign.targetUrl)}
                                                            </span>
                                                            <Badge variant="outline" className="text-xs border-white/10 text-[#949ba4]">
                                                                {campaign.type}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-[#949ba4]">
                                                            <span>{campaignClicks} clicks</span>
                                                            <span>{campaignConversions} conv.</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 h-6">
                                                        <div
                                                            className="bg-[#5865F2] rounded-sm transition-all"
                                                            style={{
                                                                width: `${(campaignClicks / maxClicks) * 100}%`,
                                                                minWidth: campaignClicks > 0 ? "4px" : "0",
                                                            }}
                                                            title={`${campaignClicks} valid clicks`}
                                                        />
                                                        <div
                                                            className="bg-[#57F287] rounded-sm transition-all"
                                                            style={{
                                                                width: `${(campaignConversions / maxClicks) * 100}%`,
                                                                minWidth: campaignConversions > 0
                                                                    ? "4px"
                                                                    : "0",
                                                            }}
                                                            title={`${campaignConversions} conversions`}
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
                                            No campaign data yet. Create a campaign to see performance
                                            metrics.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── Campaigns ──────────────────────────────────────── */}
                <TabsContent value="campaigns" className="space-y-8 pt-6">
                    <Card className="bg-[#232428]/50 border-dashed border-2 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-white">
                                <PlusCircle className="h-6 w-6 text-[#5865F2]" /> Create New
                                Campaign
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                action={createCampaign}
                                className="flex flex-col lg:flex-row gap-6 items-end bg-[#232428] p-6 rounded-xl border border-white/5 shadow-lg"
                            >
                                <div className="space-y-2 flex-grow w-full">
                                    <label className="text-sm font-semibold text-[#f2f3f5]">
                                        Product / Store
                                    </label>
                                    <select
                                        name="targetUrl"
                                        className="flex h-11 w-full rounded-md border border-white/10 bg-[#1a1b1e] px-3 py-2 text-base text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                        required
                                    >
                                        <option value="https://hci-project-beta.vercel.app/">
                                            HCI Project Store — hci-project-beta.vercel.app
                                        </option>
                                        <option value="http://localhost:3001/">
                                            HCI Project Store — localhost:3001
                                        </option>
                                    </select>
                                </div>
                                <div className="space-y-2 w-full lg:w-48">
                                    <label className="text-sm font-semibold text-[#f2f3f5]">
                                        Campaign Type
                                    </label>
                                    <select
                                        name="type"
                                        className="flex h-11 w-full rounded-md border border-white/10 bg-[#1a1b1e] px-3 py-2 text-base text-white ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                        required
                                    >
                                        <option value="PPC">PPC (Cost Per Click)</option>
                                        <option value="PPS">PPS (Commission %)</option>
                                    </select>
                                </div>
                                <div className="space-y-2 w-full lg:w-48">
                                    <label className="text-sm font-semibold text-[#f2f3f5]">
                                        Reward Rate ($/%)
                                    </label>
                                    <Input
                                        type="number"
                                        name="reward"
                                        placeholder="e.g. 0.20 or 10"
                                        step="0.01"
                                        min="0.01"
                                        className="h-11 bg-[#1a1b1e] border-white/10 text-white placeholder:text-[#949ba4]/50 focus-visible:ring-[#5865F2]"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 w-full lg:w-48">
                                    <label className="text-sm font-semibold text-[#f2f3f5]">
                                        Discount % (for end user)
                                    </label>
                                    <Input
                                        type="number"
                                        name="discount"
                                        placeholder="e.g. 5"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        className="h-11 bg-[#1a1b1e] border-white/10 text-white placeholder:text-[#949ba4]/50 focus-visible:ring-[#5865F2]"
                                    />
                                </div>
                                <div className="space-y-2 w-full lg:w-56">
                                    <label className="text-sm font-semibold text-[#f2f3f5] flex items-center gap-1">
                                        <Globe className="w-4 h-4 text-[#5865F2]" /> Geo-Target (optional)
                                    </label>
                                    <Input
                                        name="allowedCountries"
                                        placeholder="US, GB, PK (comma-separated)"
                                        className="h-11 bg-[#1a1b1e] border-white/10 text-white placeholder:text-[#949ba4]/50 focus-visible:ring-[#5865F2]"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full lg:w-auto h-11 px-8 bg-gradient-to-r from-[#5865F2] to-[#7289DA] hover:opacity-90 text-white border-0 glow-blurple"
                                >
                                    Launch
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Megaphone className="h-5 w-5 text-[#5865F2]" /> Active Campaigns
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="w-[25%] text-[#949ba4]">Target URL</TableHead>
                                        <TableHead className="text-[#949ba4]">Type</TableHead>
                                        <TableHead className="text-[#949ba4]">Reward</TableHead>
                                        <TableHead className="text-[#949ba4]">Discount</TableHead>
                                        <TableHead className="text-[#949ba4]">Geo-Target</TableHead>
                                        <TableHead className="text-right pr-6 text-[#949ba4]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {merchantCampaigns.map((campaign) => (
                                        <TableRow
                                            key={campaign.id}
                                            className="border-white/5 hover:bg-white/5"
                                        >
                                            <TableCell
                                                className="font-medium text-white max-w-xs truncate"
                                                title={campaign.targetUrl}
                                            >
                                                {campaign.targetUrl}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-[#1a1b1e] border-white/10 text-[#949ba4]">{campaign.type}</Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold text-[#57F287]">
                                                {campaign.type === "PPC"
                                                    ? `$${campaign.reward.toFixed(2)}`
                                                    : `${campaign.reward}%`}
                                            </TableCell>
                                            <TableCell>
                                                {campaign.discount > 0 ? (
                                                    <Badge variant="outline" className="bg-[#FEE75C]/10 text-[#FEE75C] border-[#FEE75C]/20">
                                                        {campaign.discount}% off
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-[#949ba4]">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {campaign.allowedCountries ? (
                                                    <div className="flex gap-1 flex-wrap">
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
                                                ) : (
                                                    <span className="text-xs text-[#949ba4]">All</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Badge
                                                    variant={campaign.isActive ? "default" : "secondary"}
                                                    className={
                                                        campaign.isActive
                                                            ? "bg-[#57F287]/20 text-[#57F287] border-[#57F287]/20 hover:bg-[#57F287]/30"
                                                            : "bg-white/5 text-[#949ba4] border-white/10"
                                                    }
                                                >
                                                    {campaign.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {merchantCampaigns.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="text-center py-12 text-[#949ba4]"
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <Megaphone className="h-8 w-8 text-[#949ba4]/30" />
                                                    <p>
                                                        No campaigns found. Create one above to get started!
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
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
                                For Pay-Per-Sale campaigns, copy the tracking script below and
                                paste it on your &quot;Thank You&quot; or order confirmation
                                page. This script will automatically report conversions to
                                ClickStream.
                            </p>

                            {merchantCampaigns.filter((c) => c.type === "PPS")
                                .length > 0 ? (
                                merchantCampaigns
                                    .filter((c) => c.type === "PPS")
                                    .map((campaign) => (
                                        <div key={campaign.id} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-white">
                                                        {safeGetHostname(campaign.targetUrl)}
                                                    </h4>
                                                    <p className="text-xs text-[#949ba4] truncate max-w-md">
                                                        {campaign.targetUrl}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-[#57F287]/10 text-[#57F287] border-[#57F287]/20"
                                                >
                                                    {campaign.reward}% Commission
                                                </Badge>
                                            </div>
                                            <div className="relative">
                                                <pre className="bg-[#1a1b1e] text-[#00f0ff] p-4 rounded-lg text-xs overflow-x-auto border border-white/5 font-mono">
                                                    <code
                                                        dangerouslySetInnerHTML={{
                                                            __html: `&lt;script&gt;
  (function() {
    // Read the cs_ref cookie set by ClickStream redirect
    const cookieMatch = document.cookie.match(/cs_ref=([^;]+)/);
    const ref = cookieMatch ? cookieMatch[1] : null;
    const orderId = 'ORDER_ID_HERE'; // Replace with your order ID
    const orderTotal = ORDER_TOTAL_HERE; // Replace with order total
    
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
                                                with your dynamic order values.
                                            </p>
                                        </div>
                                    ))
                            ) : (
                                <div className="text-center py-8 text-[#949ba4]">
                                    <Code className="h-8 w-8 text-[#949ba4]/30 mx-auto mb-2" />
                                    <p>
                                        No PPS campaigns found. Create a PPS campaign to get your
                                        tracking script.
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
                                <DollarSign className="h-5 w-5 text-[#5865F2]" /> Transaction
                                Ledger
                            </CardTitle>
                            <CardDescription className="text-[#949ba4]">
                                All financial transactions for your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">Date</TableHead>
                                        <TableHead className="text-[#949ba4]">Type</TableHead>
                                        <TableHead className="text-[#949ba4]">Description</TableHead>
                                        <TableHead className="text-[#949ba4]">Amount</TableHead>
                                        <TableHead className="text-right pr-6 text-[#949ba4]">Direction</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => {
                                        const isDeposit = tx.type === "DEPOSIT";
                                        const isOutgoing =
                                            tx.fromUserId === userId && !isDeposit;
                                        return (
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
                                                            tx.type === "DEPOSIT"
                                                                ? "bg-[#57F287]/10 text-[#57F287] border-[#57F287]/20"
                                                                : tx.type === "PPC_CLICK"
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
                                                <TableCell
                                                    className={`font-semibold ${isOutgoing ? "text-red-400" : "text-[#57F287]"}`}
                                                >
                                                    {isOutgoing ? "-" : "+"}${tx.amount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {isDeposit ? (
                                                        <ArrowDownLeft className="h-4 w-4 text-[#57F287] inline" />
                                                    ) : isOutgoing ? (
                                                        <ArrowUpRight className="h-4 w-4 text-red-400 inline" />
                                                    ) : (
                                                        <ArrowDownLeft className="h-4 w-4 text-[#57F287] inline" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center py-12 text-[#949ba4]"
                                            >
                                                No transactions yet. Deposit funds to get started.
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
