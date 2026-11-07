"use client";

import Link from "next/link";

const groups: { title: string; items: { icon: string; name: string; description: string; href?: string; active?: boolean; soon?: boolean; badge?: string }[] }[] = [
  { title: "START HERE", items: [
    { icon: "▦", name: "Dashboard", description: "Your On A Trip Holidays creative workspace.", href: "/social", active: true },
    { icon: "♧", name: "First reel", description: "Start your first travel reel with OWN.", href: "/social/reels" },
  ]},
  { title: "CREATE", items: [
    { icon: "✧", name: "Idea Studio", description: "Discover travel content ideas and campaign angles.", href: "/social/trends" },
    { icon: "✎", name: "Create reel", description: "Build reel scripts, storyboards and production briefs.", href: "/social/reels" },
    { icon: "▧", name: "Create post", description: "Create an Instagram single-image post with AI copy and artwork.", href: "/social/posts" },
    { icon: "▤", name: "Create carousel", description: "Build multi-slide Instagram carousels with individual slide copy and visuals.", href: "/social/carousels" },
    { icon: "▱", name: "Creations", description: "Manage your saved drafts and creative work.", href: "/social/planner" },
    { icon: "♙", name: "AI avatar", description: "Prepare voice and avatar-led content.", href: "/social/voice", badge: "NEW" },
    { icon: "♧", name: "Brand Brain", description: "Keep your brand voice and travel offers organised.", href: "/social/brand" },
    { icon: "♧", name: "Outreach", description: "Review content and prepare customer follow-ups.", href: "/social/approvals" },
  ]},
  { title: "CONFIGURE", items: [
    { icon: "@", name: "Accounts", description: "Connect and manage your Instagram professional account.", href: "/social/instagram" },
    { icon: "⌕", name: "Reports", description: "Review Instagram performance and content results.", href: "/social/analytics" },
    { icon: "▱", name: "Billing", description: "Manage plans and workspace billing.", soon: true },
    { icon: "♙", name: "Team", description: "Manage workspace members and access.", soon: true },
    { icon: "⚙", name: "Settings", description: "Configure your workspace preferences.", soon: true },
    { icon: "▤", name: "Guide", description: "Learn how to use your OWN workspace.", soon: true, badge: "NEW" },
  ]}
];

export default function SocialDashboardPage() {
  return <div className="oat-dashboard">
    <section className="oat-dashboard-welcome">
      <div><span className="oat-section-kicker">ON A TRIP HOLIDAYS · OAT SOCIAL AI</span><h2>Your travel content workspace.</h2><p>Find ideas, create reels, manage your content and understand your audience — all in one place.</p></div>
      <div className="oat-welcome-symbol">✈</div>
    </section>
    {groups.map(group=><section key={group.title} style={{marginTop:28}}>
      <div className="oat-dashboard-heading"><div><span className="oat-section-kicker">{group.title}</span><h2>{group.title==="START HERE"?"Pick up where you want to work":group.title==="CREATE"?"Create something for your audience":"Manage your workspace"}</h2></div></div>
      <div className="oat-module-grid">
        {group.items.map(item=>{
          const card=<><div className="oat-module-card-top"><span className="oat-module-icon">{item.icon}</span><span className="oat-module-group">{item.badge|| (item.soon?"COMING SOON":group.title)}</span></div><h3>{item.name}</h3><p>{item.description}</p><span className="oat-module-open">{item.soon?"Coming soon":"Open workspace"} <b>→</b></span></>;
          return item.soon
            ? <div key={item.name} className="oat-module-card" aria-disabled="true" style={{opacity:.62,cursor:"not-allowed"}}>{card}</div>
            : <Link href={item.href||"/social"} key={item.name} className="oat-module-card">{card}</Link>;
        })}
      </div>
    </section>)}
  </div>;
}
