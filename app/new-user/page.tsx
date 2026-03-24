import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "../../utils/db";
import { redirect } from "next/navigation";

export default async function connect() {
    const user = await currentUser();

    if (!user || !user.username) {
        return redirect("/sign-in");
    }

    const match = await prisma.user.upsert({
        where: {
            ClerkID: user.id as string,
        },
        update: {
            email: user.emailAddresses[0].emailAddress,
            name: user.username,
            ClerkID: user.id,
        },
        create: {
            ClerkID: user.id,
            email: user.emailAddresses[0].emailAddress,
            role: "student",
            name: user.username,
        },
    });


    redirect("/register");
}
