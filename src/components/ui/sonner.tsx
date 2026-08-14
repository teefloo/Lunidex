"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { usePrimeDexStore } from "@/store/primedex"
import { markToasterReady } from "@/lib/toast"
import { useEffect, useSyncExternalStore } from "react"

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function subscribeSystemTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = usePrimeDexStore(s => s.theme)
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemTheme, () => "light" as const)
  const resolvedTheme = theme === "system" ? systemTheme : (theme as "light" | "dark")

  useEffect(() => {
    markToasterReady()
  }, [])

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          description: "text-foreground/70",
          actionButton: "bg-primary text-primary-foreground hover:bg-primary/90",
          cancelButton: "bg-muted text-foreground hover:bg-muted/80",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
