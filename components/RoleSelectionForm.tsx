"use client";

import { Button } from "@/components/ui/button";

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
                className="w-full h-12 text-lg"
            >
                I am an Affiliate
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit("merchant")}
                className="w-full h-12 text-lg"
            >
                I am a Merchant
            </Button>
            <Button
                type="button"
                variant="outline"
                onClick={() => handleSubmit("admin")}
                className="w-full h-12 text-lg border-red-200 text-red-700 hover:bg-red-50"
            >
                I am an Admin
            </Button>
        </form>
    );
}
