"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  NotebookText,
  BarChart3,
  Settings,
  LucideIcon,
  LogOut,
  Building2,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LogoAtmos from "@/public/images/logoAtmos.svg";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pesquisas", label: "Pesquisas", icon: NotebookText },
  { href: "/resultados", label: "Resultados", icon: BarChart3 },
  { href: "/setores", label: "Setores", icon: Building2 },
  { href: "/ciclos", label: "Ciclos", icon: CalendarDays },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const Sidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside
      className={cn(
        "bg-background text-foreground h-screen p-3 border-r flex flex-col sticky top-0 left-0 z-40 print:hidden",
        "w-[72px] hover:w-64 transition-all duration-300 ease-in-out group"
      )}
    >
      <div className="flex justify-center items-center mb-10 px-2">
        <h1 className="text-xl font-bold">
          <Image src={LogoAtmos} alt="Logo Atmos" width={50} height={50} />
        </h1>
      </div>

      <nav className="flex flex-col gap-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link href={link.href} key={link.label}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start cursor-pointer",
                  !isActive && "hover:bg-blue-600 hover:text-white"
                )}
              >
                <Icon className="h-6 w-6 mr-2" />
                <span
                  className={cn(
                    "ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200",

                    "w-0 opacity-0",
                    "group-hover:w-auto group-hover:opacity-100"
                  )}
                >
                  {link.label}
                </span>
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full justify-start cursor-pointer hover:bg-red-600 hover:text-white"
          )}
        >
          <LogOut className="h-6 w-6 mr-2" />
          <span
            className={cn(
              "ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200",
              "w-0 opacity-0",
              "group-hover:w-auto group-hover:opacity-100"
            )}
          >
            Sair
          </span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
