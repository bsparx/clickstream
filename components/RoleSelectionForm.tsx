"use client";

import { Button } from "@/components/ui/button";
import { Link2, Store, ShieldCheck } from "lucide-react";

export function RoleSelectionForm({
    updateRole,
}: {
    updateRole: (formData: FormData) => Promise<void>;
}) {
    const handleSubmit = async (role: string) => {
        const formData = new FormData();
        formData.set("role", role);
        await updateRole(formData);
    };

    return (
        <form className="flex flex-col gap-3">
            <Button
                type="button"
                onClick={() => handleSubmit("affiliate")}
                className="w-full h-12 text-lg bg-gradient-to-r from-[#5865F2] to-[#7289DA] hover:opacity-90 text-white border-0 glow-blurple"
            >
                <Link2 className="w-5 h-5 mr-2" />
                I am an Affiliate
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit("merchant")}
                className="w-full h-12 text-lg border-white/10 hover:bg-white/5 hover:border-[#00f0ff]/30 text-[#f2f3f5]"
            >
                <Store className="w-5 h-5 mr-2" />
                I am a Merchant
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit("admin")}
                className="w-full h-12 text-lg border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
            >
                <ShieldCheck className="w-5 h-5 mr-2" />
                I am an Admin
            </Button>
        </form>
    );
}
