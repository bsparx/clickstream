'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Link2, Loader2 } from 'lucide-react';

export function GenerateLinkButton({ campaignId }: { campaignId: string }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const router = useRouter();

    const handleGenerateLink = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignId }),
            });

            if (response.ok) {
                router.refresh();
            } else {
                console.error('Failed to generate link');
            }
        } catch (error) {
            console.error('Error generating link:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            onClick={handleGenerateLink}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-[#5865F2] to-[#7289DA] hover:opacity-90 text-white border-0 glow-blurple"
        >
            {isGenerating ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Link2 className="w-4 h-4 mr-2" />
                    Generate Link
                </>
            )}
        </Button>
    );
}
