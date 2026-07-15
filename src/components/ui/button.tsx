"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 touch-target items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-transparent bg-clip-padding text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-100 outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_var(--pixel-shadow)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        outline:
          "border-border bg-card text-foreground shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px hover:border-primary hover:shadow-[3px_3px_0_var(--pixel-shadow)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:border-input dark:bg-input/20",
        secondary:
          "border-border bg-secondary text-secondary-foreground shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px hover:border-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        ghost:
          "border-transparent bg-transparent hover:bg-muted/55 hover:text-foreground",
        glass:
          "glass-control border-border/60 bg-card text-foreground hover:text-foreground",
        surface:
          "border-border bg-card text-foreground shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px hover:border-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        destructive:
          "border-destructive/60 bg-destructive/10 text-destructive shadow-[var(--shadow-pixel-sm)] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none dark:bg-destructive/15",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        xs: "h-9 px-3 text-xs",
        sm: "h-10 px-3.5 text-sm",
        lg: "h-12 px-5 text-sm",
        touch: "min-h-11 min-w-11 px-4",
        icon: "size-11",
        "icon-touch": "size-11",
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
