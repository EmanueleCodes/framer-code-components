import { useEffect, useState } from "react"

type Breakpoint = "sm" | "md" | "lg" | "xl"

const breakpointMinWidth: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
}

type ScreenSize = {
  width: number
  height: number
  lessThan: (bp: Breakpoint) => boolean
}

export default function useScreenSize(): ScreenSize {
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  }))

  useEffect(() => {
    const handle = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    handle()
    window.addEventListener("resize", handle)
    return () => window.removeEventListener("resize", handle)
  }, [])

  const lessThan = (bp: Breakpoint) => size.width < breakpointMinWidth[bp]

  return { width: size.width, height: size.height, lessThan }
}


