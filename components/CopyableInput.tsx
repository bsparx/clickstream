'use client';

import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';

interface CopyableInputProps {
    value: string;
}

export function CopyableInput({ value }: CopyableInputProps) {
    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        target.select();
        navigator.clipboard.writeText(target.value);
    };

    return (
        <div className="relative group">
            <Input
                readOnly
                value={value}
                className="focus-visible:ring-1 bg-[#1a1b1e] border-white/10 font-mono text-sm text-[#949ba4] pr-10 group-hover:border-[#5865F2]/30 transition-colors cursor-pointer"
                onClick={handleClick}
                title="Click to copy"
            />
            <Copy className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4] group-hover:text-[#5865F2] transition-colors pointer-events-none" />
        </div>
    );
}
