"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  FileText,
  Image,
  BarChart3,
  Lightbulb,
  ScrollText,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Megaphone,
  FileText,
  Image,
  BarChart3,
  Lightbulb,
  ScrollText,
  Settings,
};

const navItems = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/campaigns", label: "Campaigns", icon: "Megaphone" },
  { href: "/brand-brief", label: "Brand Brief", icon: "FileText" },
  { href: "/assets", label: "Assets", icon: "Image" },
  { href: "/performance", label: "Performance", icon: "BarChart3" },
  { href: "/recommendations", label: "Recommendations", icon: "Lightbulb", badge: true },
  { href: "/action-log", label: "Action Log", icon: "ScrollText" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

interface SidebarProps {
  recommendationCount?: number;
}

export function Sidebar({ recommendationCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-card border border-border"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card transition-transform duration-200 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <Logo size="sm" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                  {item.badge && recommendationCount > 0 && (
                    <Badge variant="default" className="ml-auto text-xs">
                      {recommendationCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Demo mode indicator */}
          {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <div className="border-t border-border p-4">
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
                Demo Mode Active
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
