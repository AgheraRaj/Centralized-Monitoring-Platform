import {
  Activity,
  Car,
  Fuel,
  LayoutDashboard,
  Gauge,
  MapPin,
  Zap,
  type LucideIcon,
} from "lucide-react"

export type NavigationItem = {
  title: string
  href: string
  icon: LucideIcon
}

// Add one entry here for each dashboard page as it is built.
// The sidebar and the header title both read from this list.
export const NAVIGATION_ITEMS: NavigationItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Map view", href: "/map", icon: MapPin },
  { title: "Daily vehicles", href: "/vehicles", icon: Car },
  { title: "Full-fill rate", href: "/full-fill", icon: Fuel },
  { title: "Station uptime", href: "/uptime", icon: Activity },
  { title: "Power outages", href: "/power", icon: Zap },
  { title: "Capacity", href: "/capacity", icon: Gauge },
]

export function isActiveNavigationItem(pathname: string, item: NavigationItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}