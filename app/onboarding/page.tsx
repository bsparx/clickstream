import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RoleSelectionForm } from "@/components/RoleSelectionForm";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  // If user is already set up, redirect them
  if (user && user.role) {
    if (user.role === "merchant") redirect("/merchant");
    if (user.role === "affiliate") redirect("/affiliate");
    if (user.role === "admin") redirect("/admin");
  }

  async function updateRole(formData: FormData) {
    "use server";
    const role = formData.get("role") as string;
    const { userId } = await auth();
    const clerkUser = await currentUser();

    if (!userId || !["merchant", "affiliate", "admin"].includes(role)) return;

    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;
    const name = clerkUser?.username ?? clerkUser?.firstName ?? null;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: userId },
          data: { role, email, name },
        });
      } else {
        await prisma.user.create({
          data: { id: userId, role, balance: 0.0, email, name },
        });
      }
    } catch (e) {
      console.error(e);
    }

    if (role === "admin") redirect("/admin");
    redirect(`/${role}`);
  }

  return (
    <div className="flex h-screen items-center justify-center p-4 bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            Welcome to ClickStream
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-center text-muted-foreground">
            Are you an Affiliate, a Merchant, or an Admin?
          </p>
          <RoleSelectionForm updateRole={updateRole} />
        </CardContent>
      </Card>
    </div>
  );
}
