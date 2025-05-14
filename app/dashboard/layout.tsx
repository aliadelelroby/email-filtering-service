"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Settings,
  Menu,
  Download,
  Bell,
  Search,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isMobile?: boolean;
}

function SidebarLink({ href, icon, label, isMobile }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all hover:bg-secondary",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
        isMobile && "w-full"
      )}
    >
      {icon}
      <span>{label}</span>
      {isActive && isMobile && <div className="ml-auto">•</div>}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-10">
        <div className="flex flex-col flex-grow bg-background border-r pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 px-4">
            <Download className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Data Manager</span>
          </div>

          <div className="px-4 mb-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full bg-background pl-8"
              />
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            <SidebarLink
              href="/dashboard"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
            />
            <SidebarLink
              href="/dashboard/contacts"
              icon={<Users className="h-4 w-4" />}
              label="Contacts"
            />
            <SidebarLink
              href="/dashboard/imports"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              label="Data Imports"
            />

            <Separator className="my-4" />

            <SidebarLink
              href="/dashboard/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
            />
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:pl-64">
        <header className="sticky top-0 z-10 bg-background border-b h-16 flex items-center px-4 md:px-6 shadow-sm">
          {/* Mobile Sidebar */}
          <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  <span>Data Manager</span>
                </SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <nav className="space-y-1">
                  <SidebarLink
                    href="/dashboard"
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label="Dashboard"
                    isMobile
                  />
                  <SidebarLink
                    href="/dashboard/contacts"
                    icon={<Users className="h-4 w-4" />}
                    label="Contacts"
                    isMobile
                  />
                  <SidebarLink
                    href="/dashboard/imports"
                    icon={<FileSpreadsheet className="h-4 w-4" />}
                    label="Data Imports"
                    isMobile
                  />

                  <Separator className="my-4" />

                  <SidebarLink
                    href="/dashboard/settings"
                    icon={<Settings className="h-4 w-4" />}
                    label="Settings"
                    isMobile
                  />
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-8 p-1"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
