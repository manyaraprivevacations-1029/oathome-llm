"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

const modules = [
  { icon:"✦", name:"AI Social Publisher", desc:"Turn one instruction into an Instagram creative and caption, ready for review.", href:"/social/publisher", group:"CREATE" },
  { icon:"✦", name:"Idea Studio", desc:"Find content angles and campaign ideas for your travel audience.", href:"/social/trends", group:"CREATE" },
  { icon:"▤", name:"Content Planner", desc:"Create drafts, organise ideas and approve content before publishing.", href:"/social/planner", group:"CREATE" },
  { icon:"▻", name:"Reel Studio", desc:"Build editable reel storyboards, scripts and production briefs.", href:"/social/reels", group:"CREATE" },
  { icon:"▧", name:"Carousel Studio", desc:"Create structured multi-slide copy and captions.", href:"/social/carousel", group:"CREATE" },
  { icon:"◖", name:"Voice Studio", desc:"Prepare Telugu-English and English voiceover scripts.", href:"/social/voice", group:"CREATE" },
  { icon:"✓", name:"Approval Library", desc:"Review, approve or return drafts before publishing.", href:"/social/approvals", group:"MANAGE" },
  { icon:"▥", name:"Reports", desc:"Review Instagram performance and your content workflow.", href:"/social/analytics", group:"MANAGE" },
  { icon:"◎", name:"Accounts", desc:"Connect and manage your Instagram professional account.", href:"/social/instagram", group:"CONFIGURE" },
  { icon:"♧", name:"Brand Brain", desc:"Keep your brand voice, audience and travel offers organised.", href:"/social/brand", group:"CONFIGURE" },
];

export default function SocialDashboardPage() {
  const [instagramStatus,setInstagramStatus] = useState("Checking connection…");
  useEffect(()=>{
    let alive=true;
    (async()=>{
      try {
        const {data:{session}}=await getSocialSupabase().auth.getSession();
        if(!session)return;
        const response=await fetch("/api/social/instagram/status",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"});
        const result=await response.json();
        if(alive)setInstagramStatus(result.connected?"Instagram connected":"Instagram not connected");
      } catch { if(alive)setInstagramStatus("Connection status unavailable"); }
    })();
    return()=>{alive=false;};
  },[]);
  return <div className="oat-dashboard">
    <section className="oat-dashboard-welcome"><div><span className="oat-section-kicker">YOUR CREATIVE WORKSPACE</span><h2>Everything for your next great trip campaign.</h2><p>Plan, create, review and understand your travel content — all from one workspace.</p></div><div className="oat-welcome-symbol">✈</div></section>
    <div className="oat-dashboard-heading"><div><span className="oat-section-kicker">WORKSPACE TOOLS</span><h2>Pick up where you want to work</h2></div><span className="oat-safety-pill">APPROVAL FIRST · PUBLISHING DISABLED</span></div>
    <section className="oat-module-grid">{modules.map(module=><Link href={module.href} key={module.name} className="oat-module-card"><div className="oat-module-card-top"><span className="oat-module-icon">{module.icon}</span><span className="oat-module-group">{module.group}</span></div><h3>{module.name}</h3><p>{module.desc}</p><span className="oat-module-open">Open workspace <b>→</b></span></Link>)}</section>
    <section className="oat-dashboard-status"><span className="oat-status-dot"/><div><b>{instagramStatus}</b><p>Manage your connected account from Accounts. Publishing and messaging remain disabled until explicitly implemented.</p></div><Link href="/social/instagram">Manage account →</Link></section>
  </div>;
}
