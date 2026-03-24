import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="bg-background flex justify-center items-center h-screen w-screen">
            <div className="p-4 rounded-xl shadow-xl bg-card border border-border">
                <SignIn />
            </div>
        </div>
    );
}
