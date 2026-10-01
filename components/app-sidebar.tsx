"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { UserMenu } from "@/components/user-menu"
import { isActiveNavigationItem, NAVIGATION_ITEMS } from "@/lib/navigation"

type AppSidebarProps = {
  userName: string
  userEmail: string
}

export function AppSidebar({ userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  // Keep the selected station when moving between dashboards.
  const selectedStation = useSearchParams().get("station")
  const query = selectedStation
    ? `?station=${encodeURIComponent(selectedStation)}`
    : ""

  // On mobile the sidebar is a drawer; close it after navigating.
  const closeMobileDrawer = () => setOpenMobile(false)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href={`/dashboard${query}`} onClick={closeMobileDrawer} />
              }
            >
              <div className="relative flex aspect-square size-8 items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Centralized Monitoring Platform logo"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">CMP</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  Centralized Monitoring Platform
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAVIGATION_ITEMS.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActiveNavigationItem(pathname, item)}
                    render={
                      <Link
                        href={`${item.href}${query}`}
                        // Native tooltip for icon-only mode (the sidebar `tooltip`
                        // prop is skipped because it can override `render`).
                        title={item.title}
                        onClick={closeMobileDrawer}
                      />
                    }
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu userName={userName} userEmail={userEmail} />
      </SidebarFooter>
    </Sidebar>
  )
}