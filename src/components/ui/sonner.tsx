"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        className: "[&_[data-title]]:text-gray-900 [&_[data-title]]:font-semibold [&_[data-description]]:text-gray-800 [&_[data-description]]:opacity-100 [&_[data-description]]:font-medium",
      }}
      {...props}
    />
  )
}

export { Toaster }
