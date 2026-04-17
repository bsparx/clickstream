'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

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
            className="w-full"
        >
            {isGenerating ? 'Generating...' : 'Generate Link'}
        </Button>
    );
}