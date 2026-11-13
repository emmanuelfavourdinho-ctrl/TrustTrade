"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Compass,
  House,
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { getCurrentUser, logout, type CurrentUser } from "@/lib/api/auth";

const customerLinks = [
  { href: "/feed", label: "Feed", icon: House },
  { href: "/explore", label: "Explore professionals", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "My profile", icon: UserRound },
];

const artisanLinks = [
  { href: "/artisan/dashboard", label: "Workspace", icon: BriefcaseBusiness },
  { href: "/artisan/verification", label: "Verification", icon: BadgeCheck },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageCircle },
];

const adminLinks = [
  { href: "/admin", label: "Overview", icon: Shield },
  { href: "/admin/verifications", label: "Verification queue", icon: BadgeCheck },
];

export function useCurrentUser() {
  return useQuery({
    queryKey: ["session", "current-user"],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 30_000,
  });
}

function homeForRole(user: CurrentUser) {
  if (user.role === "admin") return "/admin";
  if (user.role === "artisan") return "/artisan/dashboard";
  return "/feed";
}

export function AuthenticatedApp({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: CurrentUser["role"][];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user, error, isPending } = useCurrentUser();
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [error, pathname, router]);

  useEffect(() => {
    if (user && allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(homeForRole(user));
    }
  }, [allowedRoles, router, user]);

  if (isPending || !user) {
    if (error && !(error instanceof ApiError && error.status === 401)) {
      return (
        <main className="mx-auto max-w-page px-5 py-20 sm:px-8">
          <p className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            {error instanceof Error ? error.message : "Your account could not be loaded."}
          </p>
        </main>
      );
    }
    return (
      <main className="mx-auto max-w-page px-5 py-20 sm:px-8" aria-live="polite">
        <p className="text-sm text-muted">Checking your session…</p>
      </main>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <main className="mx-auto max-w-page px-5 py-20 sm:px-8" aria-live="polite">
        <p className="text-sm text-muted">Taking you to your workspace…</p>
      </main>
    );
  }

  const links =
    user.role === "admin" ? adminLinks : user.role === "artisan" ? artisanLinks : customerLinks;

  async function signOut() {
    setSignOutError("");
    try {
      await logout();
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      router.replace("/");
    } catch (signOutError) {
      console.error("Could not sign out.", signOutError);
      setSignOutError(
        signOutError instanceof Error ? signOutError.message : "Sign out failed. Please try again.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex min-h-16 max-w-[88rem] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-3 font-semibold tracking-[-0.03em]" href={homeForRole(user)} aria-label="TrustTrade workspace">
            <span className="grid size-9 place-items-center border border-brand text-sm font-bold tracking-[-0.12em] text-brand">TT</span>
            <span>trusttrade</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user.fullName}</span>
            <button
              className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-ink hover:text-brand"
              onClick={() => void signOut()}
              type="button"
            >
              <LogOut aria-hidden="true" size={17} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      {signOutError && (
        <p className="mx-auto max-w-[88rem] border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 sm:px-6 lg:px-8" role="alert">
          {signOutError}
        </p>
      )}

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[88rem] lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-paper px-4 py-7 lg:block">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            {user.role === "admin" ? "Administration" : user.role === "artisan" ? "Professional" : "Your account"}
          </p>
          <nav className="mt-4 space-y-1" aria-label="Workspace navigation">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 px-3 text-sm font-medium transition-colors ${
                    active ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-cream hover:text-ink"
                  }`}
                  href={href}
                  key={href}
                >
                  <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                  {label}
                </Link>
              );
            })}
          </nav>
          {user.role !== "admin" && (
            <div className="mt-8 border-t border-line pt-5">
              <Link className="flex min-h-11 items-center gap-3 px-3 text-sm text-muted hover:text-brand" href="/settings">
                <Menu aria-hidden="true" size={18} strokeWidth={1.8} />
                Settings
              </Link>
            </div>
          )}
        </aside>

        <main className="min-w-0 px-4 pb-24 pt-7 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-paper px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Mobile workspace navigation">
        {links.slice(0, 4).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] ${
                active ? "font-semibold text-brand" : "text-muted"
              }`}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
