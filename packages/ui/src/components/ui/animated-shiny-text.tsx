import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FC,
} from "react"

import { cn } from "@repo/ui/lib/utils"

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number
  duration?: number // duration in seconds
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  duration = 1, // Default to 1 second
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          "--shiny-duration": `${duration}s`,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-neutral-600/70 dark:text-neutral-400/70",
        
        // Shine effect logic
        "animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%]",
        
        // The Gradient
        "bg-gradient-to-r from-transparent via-current via-50% to-transparent",
        
        // Transition using the custom duration variable
        "[transition:background-position_var(--shiny-duration)_cubic-bezier(.6,.6,0,1)_infinite]",
        
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}