"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

const groups = [
  { label: "WORKSPACE", items: [
    { label: "Dashboard", icon: "▦", href: "/social" },
    { label: "First reel", icon: "♧", href: "/social/reels?mode=first" },
  ] },
  { label: "CREATE", items: [
    { label: "Idea Studio", icon: "✧", href: "/social/trends" },
    { label: "Create reel", icon: "✎", href: "/social/reels" },
    { label: "Creations", icon: "▱", href: "/social/planner" },
    { label: "AI avatar", icon: "♙", href: "/social/voice", badge: "NEW" },
    { label: "Brand Brain", icon: "♧", href: "/social/brand" },
    { label: "Reel style", icon: "◉", href: "/social/reels?mode=style" },
    { label: "Outreach", icon: "♧", href: "/social/approvals" },
  ] },
  { label: "CONFIGURE", items: [
    { label: "Accounts", icon: "@", href: "/social/instagram" },
    { label: "Reports", icon: "⌕", href: "/social/analytics" },
    { label: "Billing", icon: "▱", href: "/social/settings?tab=billing", badge: "SOON" },
    { label: "Team", icon: "♙", href: "/social/settings?tab=team", badge: "SOON" },
    { label: "Settings", icon: "⚙", href: "/social/settings", badge: "SOON" },
    { label: "Guide", icon: "▤", href: "/social/guide", badge: "NEW" },
  ] },
];
const titles: Record<string,string> = Object.fromEntries(groups.flatMap(group => group.items.map(item => [item.href.split("?")[0],item.label])));

function isNavItemActive(href: string, pathname: string, mode: string | null) {
  if (pathname !== href.split("?")[0]) return false;
  const requestedMode = new URLSearchParams(href.split("?")[1] || "").get("mode");
  if (requestedMode) return requestedMode === mode;
  return pathname !== "/social/reels" || !mode;
}

function SocialLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const authPage = pathname === "/social/login" || pathname === "/social/reset-password";
  const [email,setEmail] = useState("");
  const [checking,setChecking] = useState(true);
  const [mobileOpen,setMobileOpen] = useState(false);
  const [collapsed,setCollapsed] = useState(false);

  useEffect(() => {
    if (authPage) { setChecking(false); return; }
    let alive = true;
    const supabase = getSocialSupabase();
    supabase.auth.getSession().then(({data}) => {
      if (!alive) return;
      if (!data.session) router.replace("/social/login");
      else setEmail(data.session.user.email || "Workspace account");
      setChecking(false);
    }).catch(() => { if (alive) { setChecking(false); router.replace("/social/login"); } });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => {
      if (!alive) return;
      if (!session && !authPage) router.replace("/social/login");
      else if (session) setEmail(session.user.email || "Workspace account");
    });
    return () => { alive=false; subscription.unsubscribe(); };
  },[authPage,router]);

  useEffect(() => { setMobileOpen(false); },[pathname]);

  const pageTitle = useMemo(() => pathname === "/social/reels" && mode === "first" ? "First reel" : pathname === "/social/reels" && mode === "style" ? "Reel style" : titles[pathname] || "Social AI workspace",[pathname,mode]);
  async function signOut() {
    await getSocialSupabase().auth.signOut();
    router.replace("/social/login");
  }

  if (authPage) return <>{children}</>;
  if (checking) return <div className="oat-shell-loading">Loading your workspace…</div>;

  return <div className={"oat-workspace"+(collapsed?" is-collapsed":"")}>
    {mobileOpen && <button className="oat-mobile-scrim" aria-label="Close navigation" onClick={()=>setMobileOpen(false)} />}
    <aside className={"oat-sidebar"+(mobileOpen?" mobile-open":"")}>
      <div className="oat-brand-row">
        <Link href="/social" className="oat-brand"><span className="oat-brand-mark">▲</span><span className="oat-brand-copy"><b>OWN</b><small>OAT SOCIAL AI</small></span></Link>
        <button className="oat-collapse" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?"›":"‹"}</button>
      </div>
      <nav className="oat-nav" aria-label="Main navigation">
        {groups.map(group=><div className="oat-nav-group" key={group.label}>
          <div className="oat-nav-label">{group.label}</div>
          {group.items.map(item=><Link key={item.href+item.label} href={item.href} title={collapsed?item.label:undefined} aria-current={pathname===item.href.split("?")[0]?"page":undefined} className={"oat-nav-link" + (isNavItemActive(item.href, pathname, mode) ? " active" : "")}>
            <span className="oat-nav-icon">{item.icon}</span><span className="oat-nav-text">{item.label}</span>{item.badge&&<span className="oat-nav-badge">{item.badge}</span>}
          </Link>)}
        </div>)}
      </nav>
      <div className="oat-sidebar-help"><span className="oat-help-icon">✉</span><div><b>Stuck somewhere?</b><small>Need help with your workspace?</small></div></div>
      <div className="oat-sidebar-footer"><span className="oat-avatar">ON</span><span className="oat-user-email" title={email}>{email}</span><button onClick={()=>void signOut()} title="Sign out" className="oat-signout">↗</button></div>
    </aside>
    <div className="oat-main-column">
      <header className="oat-topbar">
        <div className="oat-topbar-left"><button className="oat-mobile-menu" onClick={()=>setMobileOpen(true)} aria-label="Open navigation">☰</button><div><div className="oat-top-eyebrow">ON A TRIP HOLIDAYS <span> / </span> WORKSPACE</div><h1>{pageTitle}</h1></div></div>
        <div className="oat-topbar-right"><span className="oat-private-pill"><i/> PRIVATE WORKSPACE</span><span className="oat-account-pill">{email}</span></div>
      </header>
      <main className="oat-page-content">{children}</main>
    </div>
  </div>;
}

export default function SocialLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="oat-shell-loading">Loading your workspace…</div>}>
    <SocialLayoutContent>{children}</SocialLayoutContent>
  </Suspense>;
}
