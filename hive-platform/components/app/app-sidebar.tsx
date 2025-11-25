"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, FolderOpen, Settings, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";

const menuItems = [
  {
    title: "Dashboard",
    url: "/app",
    icon: Home,
  },
  {
    title: "AI Wizard",
    url: "/app/wizard",
    icon: Sparkles,
  },
  {
    title: "File Hub",
    url: "/app/files",
    icon: FolderOpen,
  },
  {
    title: "Settings",
    url: "/app/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    api.auth.logout();
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Link href="/app" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="text-base font-medium">Hive</span>
            </Link>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
