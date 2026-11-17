"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const variantClasses = {
  default: "bg-gradient-to-r from-wave-blue to-wave-blue-500 text-white shadow-md shadow-wave-blue/25 hover:shadow-lg hover:shadow-wave-blue/35 hover:brightness-110",
  destructive: "bg-sunset text-white hover:bg-sunset/90 shadow-sm",
  outline: "border border-white/20 bg-transparent text-foam hover:bg-white/5",
  secondary: "bg-seafoam/15 text-seafoam hover:bg-seafoam/25 shadow-sm",
  ghost: "text-foam hover:bg-white/5",
  link: "text-wave-blue underline-offset-4 hover:underline",
}

const sizeClasses = {
  sm: "h-8 px-3 text-xs",
  default: "h-9 px-4 py-2",
  lg: "h-11 px-8 text-base",
  icon: "h-9 w-9",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button }
