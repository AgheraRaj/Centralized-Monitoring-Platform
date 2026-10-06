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

export type NavigationLink = {
  title: string
  href: string
}

export type NavigationItem = NavigationLink & { icon: LucideIcon }

// A parent entry with sub links. The parent itself opens its first child.
export type NavigationGroup = {
  title: string
  icon: LucideIcon
  children: NavigationLink[]
}

export type NavigationEntry = NavigationItem | NavigationGroup

export function isNavigationGroup(entry: NavigationEntry): entry is NavigationGroup {
  return "children" in entry
}

// Add one entry here for each dashboard page as it is built.
// The sidebar and the header title both read from this list.
export const NAVIGATION_ITEMS: NavigationEntry[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "Map view", href: "/map", icon: MapPin },
  { title: "Daily vehicles", href: "/vehicles", icon: Car },
  { title: "Full-fill rate", href: "/full-fill", icon: Fuel },
  { title: "Station uptime", href: "/uptime", icon: Activity },
  {
    title: "Outages",
    icon: Zap,
    children: [
      { title: "Power outages", href: "/power" },
      { title: "Gas outages", href: "/gas-outage" },
    ],
  },
  {
    title: "Utilization",
    icon: Gauge,
    children: [
      { title: "Dispenser utilization", href: "/capacity" },
      { title: "Compressor utilization", href: "/compressor-utilization" },
    ],
  },
]

// Every page link, with the sub links of groups included. Used for header titles.
export const FLAT_NAVIGATION_LINKS: NavigationLink[] = NAVIGATION_ITEMS.flatMap(
  (entry) => (isNavigationGroup(entry) ? entry.children : [entry])
)

export function isActiveNavigationItem(pathname: string, item: NavigationLink) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}