"use client"

import { cn } from "@/lib/utils"
import { Users, Swords, Trophy, TrendingUp, TrendingDown, Target } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import * as React from "react"

interface StatsCardProps {
  title: string
  value: string | number
  iconName: "users" | "swords" | "trophy" | "trending-up" | "trending-down" | "target"
  className?: string
  variant?: "default" | "primary" | "accent" | "success"
}

const icons = {
  users: Users,
  swords: Swords,
  trophy: Trophy,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  target: Target,
}

export function StatsCard({ title, value, iconName, className, variant = "default" }: StatsCardProps) {
  const [open, setOpen] = React.useState(false)
  const Icon = icons[iconName]

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <div
            onClick={() => setOpen(!open)}
            className={cn(
              "rounded-2xl p-4 border border-border cursor-pointer active:scale-95 transition-transform",
              variant === "default" && "bg-card",
              variant === "primary" && "bg-primary/10 border-primary/20",
              variant === "accent" && "bg-accent/10 border-accent/20",
              variant === "success" && "bg-success/10 border-success/20",
              className,
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2.5 rounded-xl",
                  variant === "default" && "bg-secondary",
                  variant === "primary" && "bg-primary/20",
                  variant === "accent" && "bg-accent/20",
                  variant === "success" && "bg-success/20",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    variant === "default" && "text-foreground",
                    variant === "primary" && "text-primary",
                    variant === "accent" && "text-accent",
                    variant === "success" && "text-success",
                  )}
                />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{title}</p>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground border-border px-4 py-2 text-sm font-medium">
          <div className="flex flex-col gap-1 items-center">
            <span className="text-xs text-muted-foreground">{title}</span>
            <span className="text-lg font-bold">{value}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
