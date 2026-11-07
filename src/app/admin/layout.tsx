"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { StaffBrand, StaffSignature } from "@/components/brand/brand";

import {
  Home,
  Users,
  Calendar,
  MessageSquare,
  BarChart,
  Star,
  Mic,
  FileText,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

type NavItem = {
  title: string;
  href: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const adminNavItems: NavItem[] = [
  { title: "Stand ANSUT", href: "/dashboard/stand", description: "Invitations, présences, bilan", icon: Home },
  { title: "Animations", href: "/dashboard/stand/animations", description: "Quiz, nuage de mots, sondages", icon: BarChart },
  { title: "Utilisateurs", href: "/admin/users", description: "Comptes de l'équipe", icon: Users },
  { title: "Événements", href: "/admin/events", description: "Tous les événements et panels", icon: Calendar },
  { title: "Réglages IA", href: "/admin/settings", description: "Clé d'API des agents IA", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  const initials = useMemo(() => {
    const n = session?.user?.name || "Admin";
    return n
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [session?.user?.name]);

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin" || pathname === "/admin/";
    }
    // Pour éviter les conflits avec les sous-routes similaires
    return pathname === href ||
           (pathname.startsWith(`${href}/`) &&
            !pathname.startsWith(`${href}/[id]`));
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error during sign out:", error);
      toast({
        title: "Erreur lors de la déconnexion",
        description: "Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "itf-orange-rule border-r bg-white transition-[width] duration-300 ease-in-out",
            collapsed ? "w-[72px]" : "w-64"
          )}
          aria-label="Navigation latérale d'administration"
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className={cn("flex items-center gap-2 border-b px-3 py-4", collapsed && "flex-col")}>
              <StaffBrand collapsed={collapsed} role={session?.user?.role} />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed((v) => !v)}
                className={cn("ml-auto", collapsed && "mx-auto")}
                aria-label={collapsed ? "Déplier la barre latérale" : "Replier la barre latérale"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
              <nav className="grid gap-1 p-3">
                {adminNavItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  const linkInner = (
                    <div
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                        "text-itf-navy hover:bg-itf-sky",
                        active && "bg-itf-navy text-white hover:bg-itf-navy-deep",
                        collapsed && "justify-center"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <div className="min-w-0">
                          <div className="truncate">{item.title}</div>
                          <div
                            className={cn(
                              "text-xs",
                              active ? "text-white/80" : "text-muted-foreground"
                            )}
                          >
                            {item.description}
                          </div>
                        </div>
                      )}
                    </div>
                  );

                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link href={item.href} aria-current={active ? "page" : undefined} aria-label={item.title}>
                          {linkInner}
                        </Link>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                    </Tooltip>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* User Section */}
            <div className="border-t p-3">
              <div className={cn("flex items-center gap-3", collapsed && "flex-col gap-2")}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-itf-navy">
                  <span className="text-xs font-medium text-primary-foreground">{initials}</span>
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{session?.user?.name || "Admin"}</p>
                    <p className="truncate text-xs text-muted-foreground">{session?.user?.email}</p>
                  </div>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSignOut}
                      className={cn(collapsed && "w-full")}
                      aria-label="Déconnexion"
                      title="Déconnexion"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Déconnexion</TooltipContent>}
                </Tooltip>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="itf-hero-bg flex-1 overflow-auto">
          <div className="mx-auto max-w-[1400px] p-6 md:p-10">
            <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-itf-cyan/20 md:p-10">
              {children}
            </div>
            <StaffSignature />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
