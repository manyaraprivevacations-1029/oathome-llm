"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

const modules = [
  {icon:"✦",name:"Brand Brain",desc:"Brand voice, audience, offers and content guidelines.",status:"Foundation"},
  {icon:"⌁",name:"Trend Research",desc:"Collect travel trends and turn them into campaign ideas.",status:"Planned"},
  {icon:"▦",name:"Content Planner",desc:"Organise weekly posts, reels and campaign calendars.",status:"Planned"},
  {icon:"▶",name:"Reel Studio",desc:"Build scripts and reels from your footage or supported AI tools.",status:"Planned"},
  {icon:"◖",name:"Voice Studio",desc:"Prepare voiceovers and narration for travel content.",status:"Planned"},
  {icon:"▤",name:"Carousel Studio",desc:"Create structured multi-slide Instagram content.",status:"Planned"},
  {icon:"✓",name:"Approval Library",desc:"Review and approve every creative before publishing.",status:"Approval-first"},
  {icon:"◎",name:"Instagram Manager",desc:"Connect and manage the Instagram business account.",status:"Not connected"},
  {icon:"↗",name:"Analytics",desc:"Review reach, engagement and content performance.",status:"Planned"},
];

export default function SocialDashboardPage() {
  const router = useRouter();
  const [session,setSession] = useState<Session|null>(null);
  const [loading,setLoading] = useState(true);
  const [issue,setIssue] = useState("");

  useEffect(()=>{
    let alive=true;
    let subscription: {unsubscribe:()=>void}|undefined;
    try {
      const supabase=getSocialSupabase();
      supabase.auth.getSession().then(({data,error})=>{
        if(!alive)return;
        if(error)setIssue(error.message);
        setSession(data.session);
        setLoading(false);
        if(!data.session)router.replace("/social/login");
      });
      const {data}=supabase.auth.onAuthStateChange((_event,nextSession)=>{
        if(!alive)return;
        setSession(nextSession);
        if(!nextSession)router.replace("/social/login");
      });
      subscription=data.subscription;
    } catch(e) {
      setIssue(e instanceof Error?e.message:"Social AI configuration is missing.");
      setLoading(false);
    }
    return ()=>{alive=false;subscription?.unsubscribe();};
  },[router]);

  async function signOut(){
    try { await getSocialSupabase().auth.signOut(); }
    finally { router.replace("/social/login"); }
  }

  if(loading)return <main style={shell}><p style={{color:"#a7b8ab"}}>Loading your Social AI workspace…</p></main>;
  if(issue && !session)return <main style={shell}><section style={panel}><h1>Setup required</h1><p style={{color:"#aab7ad",lineHeight:1.7}}>{issue}</p><Link href="/social/login" style={link}>Back to login</Link></section></main>;
  if(!session)return null;

  return <main style={shell}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:34}}>
      <div><div style={{fontSize:10,letterSpacing:".18em",color:"#8fc9a2"}}>ON A TRIP HOLIDAYS</div><h1 style={{fontSize:36,letterSpacing:"-.05em",margin:"9px 0 5px"}}>Social AI workspace</h1><p style={{color:"#91a096",fontSize:13,margin:0}}>Plan smarter. Create consistently. Approve before publishing.</p></div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:11,color:"#9eafa3"}}>{session.user.email}</span><button onClick={signOut} style={secondaryButton}>Sign out</button></div>
    </header>
    <section style={{...panel,marginBottom:24,background:"linear-gradient(120deg,#17291e,#111914)"}}>
      <div style={{fontSize:10,letterSpacing:".14em",color:"#8fc9a2"}}>YOUR BRAND WORKSPACE</div>
      <h2 style={{fontSize:22,margin:"10px 0"}}>On A Trip Holidays</h2>
      <p style={{color:"#a5b2a8",fontSize:13,lineHeight:1.7,maxWidth:700,margin:0}}>A dedicated home for travel campaigns, Instagram content, reels and brand assets. OWN remains a separate product and is not modified by this workspace.</p>
    </section>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,marginBottom:14}}><div><h2 style={{fontSize:18,margin:"0 0 5px"}}>Creative tools</h2><p style={{fontSize:11,color:"#829087",margin:0}}>The dashboard foundation is ready; modules will be enabled in stages.</p></div><span style={pill}>PUBLISHING DISABLED</span></div>
    <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(235px,1fr))",gap:13}}>
      {modules.map(m=><article key={m.name} style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:21,color:"#9bd0aa"}}>{m.icon}</span><span style={smallPill}>{m.status}</span></div><h3 style={{fontSize:15,margin:"17px 0 7px"}}>{m.name}</h3><p style={{fontSize:12,color:"#91a096",lineHeight:1.65,margin:0}}>{m.desc}</p></article>)}
    </section>
    <p style={{fontSize:11,color:"#748078",marginTop:25,lineHeight:1.7}}>Safety: no Instagram publishing, messaging, ad changes or external account actions are enabled in this initial foundation.</p>
  </main>;
}

const shell:CSSProperties={minHeight:"100vh",padding:"42px clamp(20px,5vw,72px)",background:"radial-gradient(ellipse at 75% 0%,#173021 0%,#090d0b 48%)",color:"#eef4ef"};
const panel:React.CSSProperties={border:"1px solid #2a3b30",borderRadius:16,padding:24,background:"#111914"};
const card:React.CSSProperties={border:"1px solid #293a30",borderRadius:13,padding:18,background:"#111914",minHeight:150};
const link:React.CSSProperties={color:"#9bd0aa"};
const pill:React.CSSProperties={fontSize:9,letterSpacing:".08em",padding:"7px 9px",borderRadius:20,border:"1px solid #735b32",color:"#e4c58a"};
const smallPill:React.CSSProperties={fontSize:9,padding:"5px 7px",borderRadius:20,border:"1px solid #304338",color:"#9eb5a4"};
const secondaryButton:React.CSSProperties={padding:"9px 12px",borderRadius:8,border:"1px solid #3a4d40",background:"#152019",color:"#dce8df",fontSize:11};
