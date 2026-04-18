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

    // Fetch all data for admin
    const allUsers = await prisma.user.findMany({
        orderBy: { balance: "desc" },
    });

    const allCampaigns = await prisma.campaign.findMany({
        include: { merchant: true },
        orderBy: { createdAt: "desc" },
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
    });

    // Stats
    const totalMerchants = allUsers.filter((u) => u.role === "merchant").length;
    const totalAffiliates = allUsers.filter(
        (u) => u.role === "affiliate"
    ).length;
    const totalRevenue = allTransactions
        .filter((t) => t.type === "PPC_CLICK" || t.type === "PPS_CONVERSION")
        .reduce((sum, t) => sum + t.amount, 0);

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
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Badge className="bg-red-500 hover:bg-red-600 text-white px-3 py-1">
                    <Shield className="w-4 h-4 mr-1" /> Admin
                </Badge>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-5 p-1 bg-muted/50 rounded-lg">
                    <TabsTrigger
                        value="overview"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                    >
                        Overview
                    </TabsTrigger>
                    <TabsTrigger
                        value="users"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                    >
                        Users
                    </TabsTrigger>
                    <TabsTrigger
                        value="campaigns"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                    >
                        Campaigns
                    </TabsTrigger>
                    <TabsTrigger
                        value="fraud"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                    >
                        Fraud
                    </TabsTrigger>
                    <TabsTrigger
                        value="blacklist"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm text-xs"
                    >
                        IP Blacklist
                    </TabsTrigger>
                </TabsList>

                {/* ── Overview ───────────────────────────────────────── */}
                <TabsContent value="overview" className="space-y-6 pt-6">
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Merchants
                                </CardTitle>
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <Users className="h-5 w-5 text-blue-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    {totalMerchants}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Affiliates
                                </CardTitle>
                                <div className="p-2 bg-emerald-100 rounded-full">
                                    <Users className="h-5 w-5 text-emerald-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    {totalAffiliates}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Total Campaigns
                                </CardTitle>
                                <div className="p-2 bg-purple-100 rounded-full">
                                    <Megaphone className="h-5 w-5 text-purple-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    {allCampaigns.length}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 rounded-t-xl">
                                <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wider">
                                    Total Transacted
                                </CardTitle>
                                <div className="p-2 bg-amber-100 rounded-full">
                                    <DollarSign className="h-5 w-5 text-amber-600" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="text-4xl font-bold tracking-tight text-zinc-900">
                                    ${totalRevenue.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Transactions */}
                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-zinc-500" /> Recent
                                Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>From</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allTransactions.slice(0, 20).map((tx) => (
                                        <TableRow key={tx.id} className="hover:bg-zinc-50/50">
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
                                            <TableCell className="text-sm font-mono">
                                                {tx.fromUserId.slice(0, 12)}...
                                            </TableCell>
                                            <TableCell className="text-sm font-mono">
                                                {tx.toUserId.slice(0, 12)}...
                                            </TableCell>
                                            <TableCell className="font-semibold text-zinc-900">
                                                ${tx.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-sm text-zinc-600 max-w-xs truncate">
                                                {tx.description || tx.referenceId}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {allTransactions.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="text-center py-8 text-zinc-500"
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
                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-zinc-500" /> All Users
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right pr-6">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allUsers.map((u) => (
                                        <TableRow key={u.id} className="hover:bg-zinc-50/50">
                                            <TableCell className="text-sm font-mono">
                                                {u.id.slice(0, 16)}...
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {u.name || "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-zinc-600">
                                                {u.email || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        u.role === "merchant"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : u.role === "affiliate"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : "bg-red-50 text-red-700 border-red-200"
                                                    }
                                                >
                                                    {u.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-semibold">
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
                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <Megaphone className="h-5 w-5 text-zinc-500" /> All Campaigns
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Merchant</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Target URL</TableHead>
                                        <TableHead>Reward</TableHead>
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Geo</TableHead>
                                        <TableHead className="text-right pr-6">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allCampaigns.map((c) => (
                                        <TableRow key={c.id} className="hover:bg-zinc-50/50">
                                            <TableCell className="text-sm font-mono">
                                                {c.id.slice(0, 12)}...
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {c.merchant?.name || c.merchant?.email || c.merchantId.slice(0, 12)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{c.type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-xs truncate">
                                                {c.targetUrl}
                                            </TableCell>
                                            <TableCell className="font-semibold text-emerald-600">
                                                {c.type === "PPC"
                                                    ? `$${c.reward.toFixed(2)}`
                                                    : `${c.reward}%`}
                                            </TableCell>
                                            <TableCell>
                                                {c.discount > 0 ? (
                                                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                                        {c.discount}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-zinc-400">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {c.allowedCountries ? (
                                                    <div className="flex gap-1 flex-wrap">
                                                        {c.allowedCountries.split(",").map((code) => (
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
                                                    variant={c.isActive ? "default" : "secondary"}
                                                    className={
                                                        c.isActive
                                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                                            : ""
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
                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" /> Flagged
                                Clicks
                            </CardTitle>
                            <CardDescription>
                                Clicks flagged as duplicates, bots, or geo-blocked
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>User-Agent</TableHead>
                                        <TableHead>Campaign</TableHead>
                                        <TableHead>Valid</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flaggedClicks.map((click) => (
                                        <TableRow key={click.id} className="hover:bg-zinc-50/50">
                                            <TableCell className="text-sm text-zinc-600">
                                                {click.createdAt.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {click.ipAddress}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {click.country || "—"}
                                            </TableCell>
                                            <TableCell
                                                className="text-sm text-zinc-500 max-w-xs truncate"
                                                title={click.userAgent}
                                            >
                                                {click.userAgent.slice(0, 50)}...
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {click.link?.campaign?.targetUrl
                                                    ? new URL(click.link.campaign.targetUrl).hostname
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={click.isValid ? "default" : "destructive"}
                                                    className={
                                                        click.isValid
                                                            ? "bg-emerald-500"
                                                            : "bg-red-500"
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
                                                className="text-center py-8 text-zinc-500"
                                            >
                                                No flagged clicks. All clear!
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" /> Flagged
                                Conversions
                            </CardTitle>
                            <CardDescription>
                                Conversions flagged due to insufficient merchant balance
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Campaign</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flaggedConversions.map((conv) => (
                                        <TableRow key={conv.id} className="hover:bg-zinc-50/50">
                                            <TableCell className="text-sm text-zinc-600">
                                                {conv.createdAt.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {conv.orderId}
                                            </TableCell>
                                            <TableCell className="font-semibold text-red-600">
                                                ${conv.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-sm">
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
                                                className="text-center py-8 text-zinc-500"
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
                    <Card className="border-zinc-200 shadow-sm">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <Ban className="h-5 w-5 text-red-500" /> Add IP to Blacklist
                            </CardTitle>
                            <CardDescription>
                                Blacklisted IPs will be blocked from generating valid clicks
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form action={addIPBlacklist} className="flex gap-4 items-end">
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-semibold text-zinc-700">
                                        IP Address
                                    </label>
                                    <Input
                                        name="ipAddress"
                                        placeholder="e.g., 192.168.1.1"
                                        className="h-11"
                                        required
                                    />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-semibold text-zinc-700">
                                        Reason
                                    </label>
                                    <Input
                                        name="reason"
                                        placeholder="e.g., Suspicious bot activity"
                                        className="h-11"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="h-11 px-8 bg-red-600 hover:bg-red-700 text-white"
                                >
                                    <Ban className="w-4 h-4 mr-2" /> Blacklist
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-zinc-100">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-zinc-500" /> Blacklisted IPs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Added On</TableHead>
                                        <TableHead className="text-right pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {blacklistedIPs.map((entry) => (
                                        <TableRow key={entry.id} className="hover:bg-zinc-50/50">
                                            <TableCell className="font-mono font-semibold text-red-600">
                                                {entry.ipAddress}
                                            </TableCell>
                                            <TableCell className="text-sm text-zinc-600">
                                                {entry.reason}
                                            </TableCell>
                                            <TableCell className="text-sm text-zinc-600">
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
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                                className="text-center py-8 text-zinc-500"
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
