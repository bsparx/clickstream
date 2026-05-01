import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="bg-[#1a1b1e] flex justify-center items-center h-screen w-screen relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#5865F2]/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#bd00ff]/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="p-6 rounded-2xl shadow-2xl bg-[#232428] border border-white/5 relative z-10">
                <SignIn forceRedirectUrl={'/new-user'} />
            </div>
        </div>
    );
}
