import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PhoneCall,
  Activity,
  Users,
  History,
  Bot,
  BarChart3,
  Settings,
  ChevronRight,
  Phone,
  LogOut,
  User,
  TestTube,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Navigation items from SPEC.md
const navigationItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/" },
  { title: "Campaigns", icon: PhoneCall, url: "/campaigns" },
  { title: "Monitoring", icon: Activity, url: "/monitoring" },
  { title: "Customers", icon: Users, url: "/customers" },
  { title: "Call Records", icon: History, url: "/calls" },
  { title: "AI Voice Agents", icon: Bot, url: "/voice-agents" },
  { title: "Reports", icon: BarChart3, url: "/reports" },
  { title: "Call Simulator", icon: TestTube, url: "/call-simulator" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

// Brand Logo Component
function BrandLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(250_95%_60%)]">
        <Phone className="h-5 w-5 text-white" />
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-white">Phony AI</span>
          <span className="text-xs text-white/60">Enterprise AI Outbound Platform</span>
        </div>
      )}
    </div>
  );
}

// Navigation Item Component
function NavItem({
  item,
  isActive,
}: {
  item: { title: string; icon: React.ElementType; url: string };
  isActive: boolean;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={collapsed ? item.title : undefined}
        className={cn(
          "group/menu-button relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
          "hover:bg-white/10 hover:text-white",
          isActive
            ? "bg-[hsl(250_95%_60%)]/20 text-white font-medium"
            : "text-white/70"
        )}
      >
        <Link to={item.url} className="flex items-center gap-3">
          <item.icon
            className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              isActive ? "text-[hsl(250_95%_60%)]" : "text-white/70 group-hover/menu-button:text-white"
            )}
          />
          <span className="truncate">{item.title}</span>
          {isActive && (
            <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[hsl(25_95%_55%)]" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// User Profile Component
function UserProfile() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="group/menu-button data-[state=open]:bg-white/10 data-[state=open]:text-white"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-white/20">
                <AvatarImage src="" alt="User" />
                <AvatarFallback className="rounded-lg bg-[hsl(250_95%_60%)] text-white text-sm">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-white">Admin</span>
                  <span className="truncate text-xs text-white/60">
                    admin@phony.ai
                  </span>
                </div>
              )}
              {!collapsed && (
                <ChevronRight className="ml-auto h-4 w-4 text-white/60" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-white/10 bg-[hsl(222_47%_11%)] text-white"
            side="right"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg border border-white/20">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback className="rounded-lg bg-[hsl(250_95%_60%)] text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Administrator</span>
                  <span className="truncate text-xs text-white/60">
                    admin@phony.ai
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-white/70 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/70 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white">
              <Settings className="mr-2 h-4 w-4" />
              Account Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// App Sidebar Component
function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 border-white/10 bg-[hsl(222_47%_11%)]"
    >
      <SidebarHeader className="pb-4 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <BrandLogo collapsed={false} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="bg-white/10" />

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-medium text-white/40 uppercase tracking-wider">
            主导航
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url))}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="bg-white/10" />

      <SidebarFooter className="pb-4">
        <UserProfile />
      </SidebarFooter>

      <SidebarRail className="border-r border-white/10 bg-[hsl(222_47%_11%)]" />
    </Sidebar>
  );
}

// Header Component
function AppHeader() {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    const item = navigationItems.find(
      (nav) => nav.url === path || (nav.url !== "/" && path.startsWith(nav.url))
    );
    return item?.title || "Phony AI";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="h-8 w-8 text-foreground/60 hover:bg-accent hover:text-foreground" />
      <div className="flex flex-1 items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{getPageTitle()}</h1>
        <div className="flex items-center gap-4">
          {/* Global actions can be added here */}
        </div>
      </div>
    </header>
  );
}

// Main App Layout Component
interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[hsl(210_40%_98%)] dark:bg-[hsl(222_47%_7%)]">
        <AppSidebar />
        <SidebarInset className="flex flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
