import Link from "next/link"
import { cn } from "@/lib/utils"
import { Users, Swords, Trophy, Medal, ChevronLeft } from "lucide-react"

interface ActionCardProps {
  href: string
  title: string
  description?: string
  iconName: "users" | "swords" | "trophy" | "medal"
  variant?: "default" | "primary" | "accent"
}

const icons = {
  users: Users,
  swords: Swords,
  trophy: Trophy,
  medal: Medal,
}

export function ActionCard({ href, title, description, iconName, variant = "default" }: ActionCardProps) {
  const Icon = icons[iconName]

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 transition-colors active:scale-[0.98]",
        variant === "default" && "bg-card border-border hover:bg-secondary/40",
        variant === "primary" &&
          "bg-primary/10 border-primary/30 hover:bg-primary/15 hover:border-primary/45",
        variant === "accent" && "bg-accent/10 border-accent/30 hover:bg-accent/15 hover:border-accent/45",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className={cn(
            "rounded-lg p-1.5",
            variant === "default" && "bg-secondary",
            variant === "primary" && "bg-primary/20",
            variant === "accent" && "bg-accent/20",
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              variant === "default" && "text-foreground",
              variant === "primary" && "text-primary",
              variant === "accent" && "text-accent",
            )}
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">{title}</h3>
          {description ? <p className="truncate text-[11px] text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
