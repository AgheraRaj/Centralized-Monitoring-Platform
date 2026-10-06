"use client"

import { ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { useState } from "react"

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { UserMenu } from "@/components/user-menu"
import {
  isActiveNavigationItem,
  isNavigationGroup,
  NAVIGATION_ITEMS,
  type NavigationGroup,
} from "@/lib/navigation"

type AppSidebarProps = {
  userName: string
  userEmail: string
}

type NavGroupProps = {
  entry: NavigationGroup
  pathname: string
  query: string
  isIconMode: boolean
  onNavigate: () => void
}

// A parent link that opens and closes its sub links. It starts open when the
// current page is one of its children.
function NavGroup({ entry, pathname, query, isIconMode, onNavigate }: NavGroupProps) {
  const isGroupActive = entry.children.some((child) =>
    isActiveNavigationItem(pathname, child)
  )
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  const isOpen = manualOpen ?? isGroupActive

  return (
    <SidebarMenuItem>
      {isIconMode ? (
        // Icon-only sidebar has no room for sub links, so open the first page.
        <SidebarMenuButton
          isActive={isGroupActive}
          render={
            <Link
              href={`${entry.children[0].href}${query}`}
              title={entry.title}
              onClick={onNavigate}
            />
          }
        >
          <entry.icon />
          <span>{entry.title}</span>
        </SidebarMenuButton>
      ) : (
        <SidebarMenuButton
          isActive={isGroupActive}
          aria-expanded={isOpen}
          onClick={() => setManualOpen(!isOpen)}
        >
          <entry.icon />
          <span>{entry.title}</span>
          <ChevronRight
            className={`ml-auto transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        </SidebarMenuButton>
      )}

      {isOpen && !isIconMode && (
        <SidebarMenuSub>
          {entry.children.map((child) => (
            <SidebarMenuSubItem key={child.href}>
              <SidebarMenuSubButton
                isActive={isActiveNavigationItem(pathname, child)}
                render={<Link href={`${child.href}${query}`} onClick={onNavigate} />}
              >
                <span>{child.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  )
}

export function AppSidebar({ userName, userEmail }: AppSidebarProps) {
  const pathname = usePathname()
  const { setOpenMobile, state, isMobile } = useSidebar()
  const isIconMode = state === "collapsed" && !isMobile

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
                <Link
                  href={`/dashboard${query}`}
                  aria-label="Altrex home"
                  onClick={closeMobileDrawer}
                />
              }
            >
              <div className="relative hidden size-6 ml-1 shrink-0 group-data-[collapsible=icon]:block">
                <Image
                  src="/logo.png"
                  alt=""
                  fill
                  sizes="24px"
                  className="object-contain"
                />
              </div>
              <div className="relative h-[25px] w-[125px] shrink-0 group-data-[collapsible=icon]:hidden">
                <Image
                  src="/AltrexLogo-light-mode.png"
                  alt=""
                  width={125}
                  height={25}
                  sizes="125px"
                  className="h-full w-full object-contain dark:hidden"
                />
                <Image
                  src="/AltrexLogo-dark-mode.png"
                  alt=""
                  width={125}
                  height={25}
                  sizes="125px"
                  className="hidden h-full w-full object-contain dark:block"
                />
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
              {NAVIGATION_ITEMS.map((entry) => {
                if (isNavigationGroup(entry)) {
                  return (
                    <NavGroup
                      key={entry.title}
                      entry={entry}
                      pathname={pathname}
                      query={query}
                      isIconMode={isIconMode}
                      onNavigate={closeMobileDrawer}
                    />
                  )
                }

                return (
                  <SidebarMenuItem key={entry.href}>
                    <SidebarMenuButton
                      isActive={isActiveNavigationItem(pathname, entry)}
                      render={
                        <Link
                          href={`${entry.href}${query}`}
                          // Native tooltip for icon-only mode (the sidebar `tooltip`
                          // prop is skipped because it can override `render`).
                          title={entry.title}
                          onClick={closeMobileDrawer}
                        />
                      }
                    >
                      <entry.icon />
                      <span>{entry.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
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