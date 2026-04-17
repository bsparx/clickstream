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
        include: {
            merchantCampaigns: {
                include: {
                    links: {
                        include: {
                            clicks: true,
                            conversions: true,
                        },
                    },
                },
            },
        },
    });

    if (!merchant || merchant.role !== "merchant") {
        redirect("/onboarding");
    }

    // Calculate campaign statistics
    let totalClicks = 0;
    let totalValidClicks = 0;
    let totalConversions = 0;
    let totalSpent = 0;

    merchant.merchantCampaigns.forEach((campaign) => {
        campaign.links.forEach((link) => {
            totalClicks += link.clicks.length;
            totalValidClicks += link.clicks.filter((c) => c.isValid).length;
            totalConversions += link.conversions.length;

            if (campaign.type === "PPC") {
                totalSpent +=
                    link.clicks.filter((c) => c.isValid).length * campaign.reward;
            } else {
                totalSpent += link.conversions.reduce(
                    (sum, conv) => sum + conv.amount,
                    0
                );
            }
        });
    });

    // Fetch transaction history
    const transactions = await prisma.transaction.findMany({
        where: {
            OR: [{ fromUserId: userId }, { toUserId: userId }],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
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

            // Create deposit transaction ledger record
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
                <h1 className="text-3xl font-bold">Merchant Dashboard</h1>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger
                        value="overview"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Overview & Wallet
                    </TabsTrigger>
                    <TabsTrigger
                        value="campaigns"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        Campaigns
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

                {/* ── Overview & Wallet ──────────────────────────────── */}
                <TabsContent value="overview" className="space-y-6 pt-6">
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="border-zinc-200 shadow-sm transition-all hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Available Balance
                                </CardTitle>
                                <div className="p-2 bg-emerald-100 rounded-full">
                                    <Wallet className="h-5 w-5 text-emerald-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    ${merchant.balance.toFixed(2)}
                                </div>
                                <p className="text-sm text-zinc-500 mt-2">Current funds</p>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm transition-all hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Total Spent
                                </CardTitle>
                                <div className="p-2 bg-red-100 rounded-full">
                                    <DollarSign className="h-5 w-5 text-red-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    ${totalSpent.toFixed(2)}
                                </div>
                                <p className="text-sm text-zinc-500 mt-2">
                                    Across all campaigns
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
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    {totalValidClicks}
                                </div>
                                <p className="text-sm text-zinc-500 mt-2">
                                    Out of {totalClicks} total
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm transition-all hover:shadow-md">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Conversions
                                </CardTitle>
                                <div className="p-2 bg-purple-100 rounded-full">
                                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    {totalConversions}
                                </div>
                                <p className="text-sm text-zinc-500 mt-2">PPS sales tracked</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="bg-zinc-50/50 rounded-t-xl border-b border-zinc-100">
                                <CardTitle className="text-lg">Deposit Funds</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <form action={depositFunds} className="flex flex-col gap-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                name="amount"
                                                placeholder="0.00"
                                                step="0.01"
                                                min="1"
                                                className="pl-8 text-lg"
                                                required
                                            />
                                        </div>
                                        <Button type="submit" size="lg" className="px-8">
                                            Deposit
                                        </Button>
                                    </div>
                                    <p className="text-xs text-zinc-500 text-center">
                                        Mock payment system. Funds are instantly credited.
                                    </p>
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-zinc-500" /> Campaign
                                    Performance
                                </CardTitle>
                                <CardDescription>
                                    Click and conversion metrics by campaign
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {merchant.merchantCampaigns.length > 0 ? (
                                    <div className="space-y-4">
                                        {merchant.merchantCampaigns.map((campaign) => {
                                            const campaignClicks = campaign.links.reduce(
                                                (sum, l) =>
                                                    sum + l.clicks.filter((c) => c.isValid).length,
                                                0
                                            );
                                            const campaignConversions = campaign.links.reduce(
                                                (sum, l) => sum + l.conversions.length,
                                                0
                                            );
                                            const maxClicks = Math.max(
                                                ...merchant.merchantCampaigns.map((c) =>
                                                    c.links.reduce(
                                                        (sum, l) =>
                                                            sum +
                                                            l.clicks.filter((cl) => cl.isValid).length,
                                                        0
                                                    )
                                                ),
                                                1
                                            );

                                            return (
                                                <div key={campaign.id} className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <span className="font-medium truncate">
                                                                {safeGetHostname(campaign.targetUrl)}
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {campaign.type}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-muted-foreground">
                                                            <span>{campaignClicks} clicks</span>
                                                            <span>{campaignConversions} conv.</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 h-6">
                                                        <div
                                                            className="bg-blue-500 rounded-sm transition-all"
                                                            style={{
                                                                width: `${(campaignClicks / maxClicks) * 100}%`,
                                                                minWidth: campaignClicks > 0 ? "4px" : "0",
                                                            }}
                                                            title={`${campaignClicks} valid clicks`}
                                                        />
                                                        <div
                                                            className="bg-emerald-500 rounded-sm transition-all"
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
                    <Card className="border-dashed border-2 bg-zinc-50/30 shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-zinc-800">
                                <PlusCircle className="h-6 w-6 text-indigo-500" /> Create New
                                Campaign
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                action={createCampaign}
                                className="flex flex-col lg:flex-row gap-6 items-end bg-white p-6 rounded-xl border shadow-sm"
                            >
                                <div className="space-y-2 flex-grow w-full">
                                    <label className="text-sm font-semibold text-zinc-700">
                                        Target Destination URL
                                    </label>
                                    <Input
                                        name="targetUrl"
                                        placeholder="https://yourstore.com/product"
                                        className="h-11"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 w-full lg:w-48">
                                    <label className="text-sm font-semibold text-zinc-700">
                                        Campaign Type
                                    </label>
                                    <select
                                        name="type"
                                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                        required
                                    >
                                        <option value="PPC">PPC (Cost Per Click)</option>
                                        <option value="PPS">PPS (Commission %)</option>
                                    </select>
                                </div>
                                <div className="space-y-2 w-full lg:w-48">
                                    <label className="text-sm font-semibold text-zinc-700">
                                        Reward Rate ($/%)
                                    </label>
                                    <Input
                                        type="number"
                                        name="reward"
                                        placeholder="e.g. 0.20 or 10"
                                        step="0.01"
                                        min="0.01"
                                        className="h-11"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 w-full lg:w-56">
                                    <label className="text-sm font-semibold text-zinc-700 flex items-center gap-1">
                                        <Globe className="w-4 h-4" /> Geo-Target (optional)
                                    </label>
                                    <Input
                                        name="allowedCountries"
                                        placeholder="US, GB, PK (comma-separated)"
                                        className="h-11"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full lg:w-auto h-11 px-8 bg-zinc-900 text-white hover:bg-zinc-800"
                                >
                                    Launch
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-zinc-500" /> Active Campaigns
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead className="w-[30%]">Target URL</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Reward</TableHead>
                                        <TableHead>Geo-Target</TableHead>
                                        <TableHead className="text-right pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {merchant.merchantCampaigns.map((campaign) => (
                                        <TableRow
                                            key={campaign.id}
                                            className="hover:bg-zinc-50/50"
                                        >
                                            <TableCell
                                                className="font-medium text-zinc-700 max-w-xs truncate"
                                                title={campaign.targetUrl}
                                            >
                                                {campaign.targetUrl}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-white">
                                                    {campaign.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-semibold text-emerald-600">
                                                {campaign.type === "PPC"
                                                    ? `$${campaign.reward.toFixed(2)}`
                                                    : `${campaign.reward}%`}
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
                                                                    className="text-xs"
                                                                >
                                                                    {code}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-zinc-400">All</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Badge
                                                    variant={campaign.isActive ? "default" : "secondary"}
                                                    className={
                                                        campaign.isActive
                                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                                            : ""
                                                    }
                                                >
                                                    {campaign.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {merchant.merchantCampaigns.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center py-12 text-zinc-500 bg-zinc-50/30"
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <Megaphone className="h-8 w-8 text-zinc-300" />
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
                    <Card className="border-zinc-200 shadow-sm">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5 text-zinc-500" /> PPS Tracking Scripts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <p className="text-sm text-zinc-600">
                                For Pay-Per-Sale campaigns, copy the tracking script below and
                                paste it on your "Thank You" or order confirmation
                                page. This script will automatically report conversions to
                                ClickStream.
                            </p>

                            {merchant.merchantCampaigns.filter((c) => c.type === "PPS")
                                .length > 0 ? (
                                merchant.merchantCampaigns
                                    .filter((c) => c.type === "PPS")
                                    .map((campaign) => (
                                        <div key={campaign.id} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-zinc-900">
                                                        {safeGetHostname(campaign.targetUrl)}
                                                    </h4>
                                                    <p className="text-xs text-zinc-500 truncate max-w-md">
                                                        {campaign.targetUrl}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                                                >
                                                    {campaign.reward}% Commission
                                                </Badge>
                                            </div>
                                            <div className="relative">
                                                <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto">
                                                    <code
                                                        dangerouslySetInnerHTML={{
                                                            __html: `<script>
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
                                                with your dynamic order values.
                                            </p>
                                        </div>
                                    ))
                            ) : (
                                <div className="text-center py-8 text-zinc-500">
                                    <Code className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
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
                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-zinc-500" /> Transaction
                                Ledger
                            </CardTitle>
                            <CardDescription>
                                All financial transactions for your account
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-right pr-6">Direction</TableHead>
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
                                                className="hover:bg-zinc-50/50"
                                            >
                                                <TableCell className="text-sm text-zinc-600">
                                                    {tx.createdAt.toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            tx.type === "DEPOSIT"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : tx.type === "PPC_CLICK"
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
                                                <TableCell
                                                    className={`font-semibold ${isOutgoing ? "text-red-600" : "text-emerald-600"}`}
                                                >
                                                    {isOutgoing ? "-" : "+"}${tx.amount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {isDeposit ? (
                                                        <ArrowDownLeft className="h-4 w-4 text-emerald-600 inline" />
                                                    ) : isOutgoing ? (
                                                        <ArrowUpRight className="h-4 w-4 text-red-600 inline" />
                                                    ) : (
                                                        <ArrowDownLeft className="h-4 w-4 text-emerald-600 inline" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={5}
                                                className="text-center py-12 text-zinc-500"
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
