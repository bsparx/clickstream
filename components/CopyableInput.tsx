'use client';

import { Input } from '@/components/ui/input';

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
        <Input
            readOnly
            value={value}
            className="focus-visible:ring-1 bg-muted font-mono text-sm"
            onClick={handleClick}
            title="Click to copy"
        />
    );
}