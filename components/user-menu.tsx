"use client"

import { ChevronsUpDown, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

type UserMenuProps = {
  userName: string
  userEmail: string
}

function getInitials(fullName: string) {
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("")

  return initials || "U"
}

function UserAvatar({ userName }: { userName: string }) {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-xs font-medium text-primary-foreground">
      {getInitials(userName)}
    </div>
  )
}

// Must be rendered inside <Sidebar>. Shows the signed-in user and a dropdown with Sign out.
export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const router = useRouter()
  const { isMobile } = useSidebar()

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-sidebar-accent"
              />
            }
          >
            <UserAvatar userName={userName} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userName}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">
                {userEmail}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            className="min-w-56"
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
              <UserAvatar userName={userName} />
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{userName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {userEmail}
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}