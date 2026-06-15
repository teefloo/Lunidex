"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent bg-clip-padding text-sm font-semibold transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary text-primary-foreground shadow-[0_14px_34px_-24px_color-mix(in_oklab,var(--primary)_55%,transparent)] hover:-translate-y-0.5 hover:bg-primary/92",
        outline:
          "border-border/70 bg-card/70 text-foreground shadow-[0_14px_38px_-32px_rgba(24,36,54,0.32)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted/55 hover:text-foreground dark:border-input/60 dark:bg-input/20 dark:hover:bg-input/35",
        secondary:
          "border-border/40 bg-secondary/70 text-secondary-foreground backdrop-blur-xl hover:-translate-y-0.5 hover:bg-secondary/90",
        ghost:
          "border-transparent bg-transparent hover:bg-muted/55 hover:text-foreground",
        glass:
          "glass-control border-border/60 bg-card/65 text-foreground hover:text-foreground",
        surface:
          "border-border/60 bg-card/70 text-foreground shadow-[0_14px_38px_-32px_rgba(24,36,54,0.32)] backdrop-blur-xl hover:-translate-y-0.5 hover:bg-card/85",
        destructive:
          "border border-destructive/20 bg-destructive/10 text-destructive hover:-translate-y-0.5 hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/15 dark:hover:bg-destructive/20",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        xs: "h-9 px-3 text-xs",
        sm: "h-10 px-3.5 text-sm",
        lg: "h-12 px-5 text-sm",
        icon: "size-11",
        "icon-xs": "size-9",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
