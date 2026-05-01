"use client";

import dynamic from "next/dynamic";
import type { AffiliateAnalyticsChartProps } from "./AffiliateAnalyticsChart";

const AffiliateAnalyticsChart = dynamic(
    () => import("./AffiliateAnalyticsChart").then((mod) => mod.AffiliateAnalyticsChart),
    { ssr: false, loading: () => <div className="h-[350px] flex items-center justify-center text-[#949ba4]">Loading chart...</div> }
);

export function AffiliateAnalyticsChartDynamic(props: AffiliateAnalyticsChartProps) {
    return <AffiliateAnalyticsChart {...props} />;
}
