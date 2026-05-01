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
    Users,
    Megaphone,
    Shield,
    AlertTriangle,
    DollarSign,
    Trash2,
    Ban,
} from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function AdminPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== "admin") {
        redirect("/onboarding");
    }

    // Fetch paginated data for admin (prevent unbounded memory growth)
    const allUsers = await prisma.user.findMany({
        orderBy: { balance: "desc" },
        take: 100,
    });

    const allCampaigns = await prisma.campaign.findMany({
        include: { merchant: true },
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    const allTransactions = await prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    const flaggedClicks = await prisma.click.findMany({
        where: { isFlagged: true },
        include: { link: { include: { campaign: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    const flaggedConversions = await prisma.conversion.findMany({
        where: { isFlagged: true },
        include: { link: { include: { campaign: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
    });

    const blacklistedIPs = await prisma.iPBlacklist.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
    });

    // Compute stats via DB aggregation instead of loading all records into memory
    const [merchantCount, affiliateCount, revenueAgg] = await Promise.all([
        prisma.user.count({ where: { role: "merchant" } }),
        prisma.user.count({ where: { role: "affiliate" } }),
        prisma.transaction.aggregate({
            where: {
                type: { in: ["PPC_CLICK", "PPS_CONVERSION"] },
            },
            _sum: { amount: true },
        }),
    ]);

    const totalMerchants = merchantCount;
    const totalAffiliates = affiliateCount;
    const totalRevenue = revenueAgg._sum.amount || 0;

    // ── Server Actions ──────────────────────────────────────────

    async function addIPBlacklist(formData: FormData) {
        "use server";
        const ipAddress = (formData.get("ipAddress") as string)?.trim();
        const reason = (formData.get("reason") as string)?.trim() || "Admin blacklisted";

        if (!ipAddress) return;

        try {
            await prisma.iPBlacklist.upsert({
                where: { ipAddress },
                update: { reason },
                create: { ipAddress, reason },
            });
        } catch (e) {
            console.error("Failed to blacklist IP:", e);
        }

        revalidatePath("/admin");
    }

    async function removeIPBlacklist(formData: FormData) {
        "use server";
        const ipAddress = formData.get("ipAddress") as string;
        if (!ipAddress) return;

        try {
            await prisma.iPBlacklist.delete({ where: { ipAddress } });
        } catch (e) {
            console.error("Failed to remove IP from blacklist:", e);
        }

        revalidatePath("/admin");
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1 hover:bg-red-500/30">
                    <Shield className="w-4 h-4 mr-1" /> Admin
                </Badge>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-5 p-1 bg-[#232428] rounded-lg border border-white/5">
                    <TabsTrigger
                        value="overview"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-xs text-[#949ba4]"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="users"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-xs text-[#949ba4]"
                    >
                        Users
                    </TabsTrigger>
                    <TabsTrigger
                        value="campaigns"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-xs text-[#949ba4]"
                    >
                        Campaigns
                    </TabsTrigger>
                    <TabsTrigger
                        value="fraud"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-xs text-[#949ba4]"
                    >
                        Fraud
                    </TabsTrigger>
                    <TabsTrigger
                        value="blacklist"
                        className="rounded-md data-[state=active]:bg-[#5865F2] data-[state=active]:text-white text-xs text-[#949ba4]"
                    >
                        IP Blacklist
                    </TabsTrigger>
                </TabsList>

                {/* ── Overview ───────────────────────────────────────── */}
                <TabsContent value="overview" className="space-y-6 pt-6">
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="bg-[#232428] border-white/5 hover:border-[#5865F2]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Merchants
                                </CardTitle>
                                <div className="p-2 bg-[#5865F2]/20 rounded-full border border-[#5865F2]/20">
                                    <Users className="h-5 w-5 text-[#5865F2]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    {totalMerchants}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5 hover:border-[#00f0ff]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Affiliates
                                </CardTitle>
                                <div className="p-2 bg-[#00f0ff]/10 rounded-full border border-[#00f0ff]/20">
                                    <Users className="h-5 w-5 text-[#00f0ff]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    {totalAffiliates}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5 hover:border-[#bd00ff]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Total Campaigns
                                </CardTitle>
                                <div className="p-2 bg-[#bd00ff]/10 rounded-full border border-[#bd00ff]/20">
                                    <Megaphone className="h-5 w-5 text-[#bd00ff]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    {allCampaigns.length}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#232428] border-white/5 hover:border-[#57F287]/20 transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-[#949ba4] uppercase tracking-wider">
                                    Total Transacted
                                </CardTitle>
                                <div className="p-2 bg-[#57F287]/10 rounded-full border border-[#57F287]/20">
                                    <DollarSign className="h-5 w-5 text-[#57F287]" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-white">
                                    ${totalRevenue.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Transactions */}
                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <DollarSign className="h-5 w-5 text-[#5865F2]" /> Recent
                                Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">Date</TableHead>
                                        <TableHead className="text-[#949ba4]">Type</TableHead>
                                        <TableHead className="text-[#949ba4]">From</TableHead>
                                        <TableHead className="text-[#949ba4]">To</TableHead>
                                        <TableHead className="text-[#949ba4]">Amount</TableHead>
                                        <TableHead className="text-[#949ba4]">Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allTransactions.slice(0, 20).map((tx) => (
                                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
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
                                            <TableCell className="text-sm font-mono text-[#949ba4]">
                                                {tx.fromUserId.slice(0, 12)}...
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-[#949ba4]">
                                                {tx.toUserId.slice(0, 12)}...
                                            </TableCell>
                                            <TableCell className="font-semibold text-white">
                                                ${tx.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4] max-w-xs truncate">
                                                {tx.description || tx.referenceId}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {allTransactions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="text-center py-8 text-[#949ba4]"
                                            >
                                                No transactions yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Users ──────────────────────────────────────────── */}
                <TabsContent value="users" className="space-y-6 pt-6">
                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Users className="h-5 w-5 text-[#5865F2]" /> All Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">ID</TableHead>
                                        <TableHead className="text-[#949ba4]">Name</TableHead>
                                        <TableHead className="text-[#949ba4]">Email</TableHead>
                                        <TableHead className="text-[#949ba4]">Role</TableHead>
                                        <TableHead className="text-right pr-6 text-[#949ba4]">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allUsers.map((u) => (
                                        <TableRow key={u.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="text-sm font-mono text-[#949ba4]">
                                                {u.id.slice(0, 16)}...
                                            </TableCell>
                                            <TableCell className="font-medium text-white">
                                                {u.name || "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {u.email || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        u.role === "merchant"
                                                            ? "bg-[#5865F2]/10 text-[#5865F2] border-[#5865F2]/20"
                                                            : u.role === "affiliate"
                                                                ? "bg-[#00f0ff]/10 text-[#00f0ff] border-[#00f0ff]/20"
                                                                : "bg-red-500/10 text-red-400 border-red-500/20"
                                                    }
                                                >
                                                    {u.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-semibold text-white">
                                                ${u.balance.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Campaigns ──────────────────────────────────────── */}
                <TabsContent value="campaigns" className="space-y-6 pt-6">
                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Megaphone className="h-5 w-5 text-[#5865F2]" /> All Campaigns
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">ID</TableHead>
                                        <TableHead className="text-[#949ba4]">Merchant</TableHead>
                                        <TableHead className="text-[#949ba4]">Type</TableHead>
                                        <TableHead className="text-[#949ba4]">Target URL</TableHead>
                                        <TableHead className="text-[#949ba4]">Reward</TableHead>
                                        <TableHead className="text-[#949ba4]">Discount</TableHead>
                                        <TableHead className="text-[#949ba4]">Geo</TableHead>
                                        <TableHead className="text-right pr-6 text-[#949ba4]">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allCampaigns.map((c) => (
                                        <TableRow key={c.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="text-sm font-mono text-[#949ba4]">
                                                {c.id.slice(0, 12)}...
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {c.merchant?.name || c.merchant?.email || c.merchantId.slice(0, 12)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-white/10 text-[#949ba4]">{c.type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-xs truncate text-[#949ba4]">
                                                {c.targetUrl}
                                            </TableCell>
                                            <TableCell className="font-semibold text-[#57F287]">
                                                {c.type === "PPC"
                                                    ? `$${c.reward.toFixed(2)}`
                                                    : `${c.reward}%`}
                                            </TableCell>
                                            <TableCell>
                                                {c.discount > 0 ? (
                                                    <Badge variant="secondary" className="bg-[#FEE75C]/10 text-[#FEE75C] border-[#FEE75C]/20">
                                                        {c.discount}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-[#949ba4]">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {c.allowedCountries ? (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {c.allowedCountries.split(",").map((code) => (
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
                                                    variant={c.isActive ? "default" : "secondary"}
                                                    className={
                                                        c.isActive
                                                            ? "bg-[#57F287]/20 text-[#57F287] border-[#57F287]/20 hover:bg-[#57F287]/30"
                                                            : "bg-white/5 text-[#949ba4] border-white/10"
                                                    }
                                                >
                                                    {c.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Fraud Detection ────────────────────────────────── */}
                <TabsContent value="fraud" className="space-y-6 pt-6">
                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <AlertTriangle className="h-5 w-5 text-[#FEE75C]" /> Flagged
                                Clicks
                            </CardTitle>
                            <CardDescription className="text-[#949ba4]">
                                Clicks flagged as duplicates, bots, or geo-blocked
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">Date</TableHead>
                                        <TableHead className="text-[#949ba4]">IP Address</TableHead>
                                        <TableHead className="text-[#949ba4]">Country</TableHead>
                                        <TableHead className="text-[#949ba4]">User-Agent</TableHead>
                                        <TableHead className="text-[#949ba4]">Campaign</TableHead>
                                        <TableHead className="text-[#949ba4]">Valid</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flaggedClicks.map((click) => (
                                        <TableRow key={click.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {click.createdAt.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-white">
                                                {click.ipAddress}
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {click.country || "—"}
                                            </TableCell>
                                            <TableCell
                                                className="text-sm text-[#949ba4] max-w-xs truncate"
                                                title={click.userAgent}
                                            >
                                                {click.userAgent.slice(0, 50)}...
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {click.link?.campaign?.targetUrl
                                                    ? new URL(click.link.campaign.targetUrl).hostname
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={click.isValid ? "default" : "destructive"}
                                                    className={
                                                        click.isValid
                                                            ? "bg-[#57F287]/20 text-[#57F287] border-[#57F287]/20"
                                                            : "bg-red-500/20 text-red-400 border-red-500/20"
                                                    }
                                                >
                                                    {click.isValid ? "Valid" : "Invalid"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {flaggedClicks.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="text-center py-8 text-[#949ba4]"
                                            >
                                                No flagged clicks. All clear!
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <AlertTriangle className="h-5 w-5 text-red-400" /> Flagged
                                Conversions
                            </CardTitle>
                            <CardDescription className="text-[#949ba4]">
                                Conversions flagged due to insufficient merchant balance
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">Date</TableHead>
                                        <TableHead className="text-[#949ba4]">Order ID</TableHead>
                                        <TableHead className="text-[#949ba4]">Amount</TableHead>
                                        <TableHead className="text-[#949ba4]">Campaign</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flaggedConversions.map((conv) => (
                                        <TableRow key={conv.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {conv.createdAt.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-white">
                                                {conv.orderId}
                                            </TableCell>
                                            <TableCell className="font-semibold text-red-400">
                                                ${conv.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {conv.link?.campaign?.targetUrl
                                                    ? new URL(conv.link.campaign.targetUrl).hostname
                                                    : "—"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {flaggedConversions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="text-center py-8 text-[#949ba4]"
                                            >
                                                No flagged conversions. All clear!
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── IP Blacklist ───────────────────────────────────── */}
                <TabsContent value="blacklist" className="space-y-6 pt-6">
                    <Card className="bg-[#232428] border-white/5">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Ban className="h-5 w-5 text-red-400" /> Add IP to Blacklist
                            </CardTitle>
                            <CardDescription className="text-[#949ba4]">
                                Blacklisted IPs will be blocked from generating valid clicks
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form action={addIPBlacklist} className="flex gap-4 items-end">
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-semibold text-[#f2f3f5]">
                                        IP Address
                                    </label>
                                    <Input
                                        name="ipAddress"
                                        placeholder="e.g., 192.168.1.1"
                                        className="h-11 bg-[#1a1b1e] border-white/10 text-white placeholder:text-[#949ba4]/50 focus-visible:ring-[#5865F2]"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-semibold text-[#f2f3f5]">
                                        Reason
                                    </label>
                                    <Input
                                        name="reason"
                                        placeholder="e.g., Suspicious bot activity"
                                        className="h-11 bg-[#1a1b1e] border-white/10 text-white placeholder:text-[#949ba4]/50 focus-visible:ring-[#5865F2]"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="h-11 px-8 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                                >
                                    <Ban className="w-4 h-4 mr-2" /> Blacklist
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#232428] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Shield className="h-5 w-5 text-[#5865F2]" /> Blacklisted IPs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="text-[#949ba4]">IP Address</TableHead>
                                        <TableHead className="text-[#949ba4]">Reason</TableHead>
                                        <TableHead className="text-[#949ba4]">Added On</TableHead>
                                        <TableHead className="text-right pr-6 text-[#949ba4]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blacklistedIPs.map((entry) => (
                                        <TableRow key={entry.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="font-mono font-semibold text-red-400">
                                                {entry.ipAddress}
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {entry.reason}
                                            </TableCell>
                                            <TableCell className="text-sm text-[#949ba4]">
                                                {entry.createdAt.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <form action={removeIPBlacklist}>
                                                    <input
                                                        type="hidden"
                                                        name="ipAddress"
                                                        value={entry.ipAddress}
                                                    />
                                                    <Button
                                                        type="submit"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                                                    </Button>
                                                </form>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {blacklistedIPs.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="text-center py-8 text-[#949ba4]"
                                            >
                                                No blacklisted IPs yet.
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
