"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChartConfig {
    [key: string]: {
        label?: string
        color?: string
    }
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    config: ChartConfig
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
    ({ className, config, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("w-full", className)}
                style={
                    Object.fromEntries(
                        Object.entries(config).map(([key, value]) => [
                            `--color-${key}`,
                            value.color,
                        ])
                    ) as React.CSSProperties
                }
                {...props}
            >
                {children}
            </div>
        )
    }
)
ChartContainer.displayName = "ChartContainer"

interface ChartTooltipProps {
    content?: React.ComponentType<Record<string, unknown>>
    cursor?: boolean
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ content: Content, cursor = true }) => {
    if (!Content) return null
    return <Content />
}

interface ChartTooltipContentProps {
    className?: string
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
    ({ className, indicator = "dot", nameKey, labelKey, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-lg border bg-background p-2 shadow-md",
                    className
                )}
                {...props}
            />
        )
    }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig }