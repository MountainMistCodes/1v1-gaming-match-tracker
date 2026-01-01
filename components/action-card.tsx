import Link from "next/link"
import { cn } from "@/lib/utils"
import { Users, Swords, Trophy, Medal, ChevronLeft } from "lucide-react"

interface ActionCardProps {
  href: string
  title: string
  description: string
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
        "block rounded-2xl p-4 border transition-all duration-200 active:scale-[0.98]",
        variant === "default" && "bg-card border-border hover:border-muted-foreground/30",
        variant === "primary" &&
          "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:border-primary/50",
        variant === "accent" && "bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30 hover:border-accent/50",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-3 rounded-xl",
              variant === "default" && "bg-secondary",
              variant === "primary" && "bg-primary/20",
              variant === "accent" && "bg-accent/20",
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                variant === "default" && "text-foreground",
                variant === "primary" && "text-primary",
                variant === "accent" && "text-accent",
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  )
}
