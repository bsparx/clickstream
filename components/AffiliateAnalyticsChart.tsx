"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

interface ChartDataPoint {
    date: string;
    clicks: number;
    conversions: number;
    earnings: number;
    label?: string;
}

export interface AffiliateAnalyticsChartProps {
    data: ChartDataPoint[];
}

function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
}) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-[#232428] border border-white/10 rounded-lg p-3 shadow-xl text-sm">
            <p className="font-medium text-white mb-1">{label}</p>
            {payload.map((entry, index) => {
                const nameMap: Record<string, string> = {
                    clicks: "Valid Clicks",
                    conversions: "Conversions",
                    earnings: "Earnings",
                };
                return (
                    <div key={index} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-[#949ba4]">
                            {nameMap[entry.dataKey] || entry.dataKey}:
                        </span>
                        <span className="font-semibold text-white">
                            {entry.dataKey === "earnings"
                                ? `$${entry.value.toFixed(2)}`
                                : entry.value}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function AffiliateAnalyticsChart({ data }: AffiliateAnalyticsChartProps) {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-[#949ba4]">
                <p>No data available yet.</p>
            </div>
        );
    }

    // Format date labels to be shorter (e.g., "Apr 16" instead of "2026-04-16")
    const formattedData = data.map((d) => {
        const dateObj = new Date(d.date + "T00:00:00");
        const label = dateObj.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        return { ...d, label };
    });

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={formattedData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#5865F2" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#5865F2" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient
                            id="colorConversions"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="5%" stopColor="#57F287" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#57F287" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#bd00ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#bd00ff" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "#949ba4" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 12, fill: "#949ba4" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12, fill: "#949ba4" }}
                        tickLine={false}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickFormatter={(value: number) => `$${value}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        formatter={(value: string) => {
                            const nameMap: Record<string, string> = {
                                clicks: "Valid Clicks",
                                conversions: "Conversions",
                                earnings: "Earnings ($)",
                            };
                            return (
                                <span style={{ color: "#949ba4" }}>
                                    {nameMap[value] || value}
                                </span>
                            );
                        }}
                    />
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="clicks"
                        stroke="#5865F2"
                        fillOpacity={1}
                        fill="url(#colorClicks)"
                        strokeWidth={2}
                    />
                    <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="conversions"
                        stroke="#57F287"
                        fillOpacity={1}
                        fill="url(#colorConversions)"
                        strokeWidth={2}
                    />
                    <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="earnings"
                        stroke="#bd00ff"
                        fillOpacity={1}
                        fill="url(#colorEarnings)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
