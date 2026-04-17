import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NewUserPage() {
    const user = await currentUser();

    if (!user) {
        return redirect("/sign-in");
    }

    const email = user.emailAddresses[0]?.emailAddress ?? null;
    const name = user.username ?? user.firstName ?? null;

    await prisma.user.upsert({
        where: {
            id: user.id,
        },
        update: {
            email: email,
            name: name,
        },
        create: {
            id: user.id,
            email: email,
            role: "",
            name: name,
        },
    });

    redirect("/onboarding");
}
