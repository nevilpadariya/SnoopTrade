import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        purchase:
          "border-transparent bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25",
        sale:
          "border-transparent bg-red-500/15 text-red-400 hover:bg-red-500/25",
        grant:
          "border-transparent bg-teal-500/15 text-teal-400 hover:bg-teal-500/25",
        exercise:
          "border-transparent bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25",
        payment:
          "border-transparent bg-violet-500/15 text-violet-400 hover:bg-violet-500/25",
        gift:
          "border-transparent bg-green-500/15 text-green-400 hover:bg-green-500/25",
        discretionary:
          "border-transparent bg-lime-500/15 text-lime-400 hover:bg-lime-500/25",
        neutral:
          "border-transparent bg-slate-500/15 text-slate-400 hover:bg-slate-500/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
