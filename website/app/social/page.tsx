"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

const modules = [
  {icon:"✦",name:"Brand Brain",desc:"Brand voice, audience, offers and content guidelines.",status:"Ready",href:"/social/brand"},
  {icon:"▦",name:"Content Planner",desc:"Create drafts, organise content and approve before publishing.",status:"Ready",href:"/social/planner"},
  {icon:"⌁",name:"Trend Research",desc:"Research travel trends, competitor content and audience demand with source evidence.",status:"Ready",href:"/social/trends"},
  {icon:"▶",name:"Reel Studio",desc:"Generate editable reel storyboards, voiceover scripts, shot lists and production briefs.",status:"Ready",href:"/social/reels"},
  {icon:"◖",name:"Voice Studio",desc:"Generate Telugu-English and English voiceover scripts with OWN.",status:"Ready",href:"/social/voice"},
  {icon:"▤",name:"Carousel Studio",desc:"Generate editable multi-slide copy and captions with OWN.",status:"Ready",href:"/social/carousel"},
  {icon:"✓",name:"Approval Library",desc:"Review, approve or return drafts before publishing.",status:"Approval-first",href:"/social/approvals"},
  {icon:"◎",name:"Instagram Manager",desc:"Check official Meta connection readiness and publishing safeguards.",status:"Not connected",href:"/social/instagram"},
  {icon:"↗",name:"Analytics",desc:"Track drafts, approvals and content workflow activity.",status:"Ready",href:"/social/analytics"},
];

export default function SocialDashboardPage() {
  const router=useRouter();
  const [session,setSession]=useState<Session|null>(null);
  const [loading,setLoading]=useState(true);
  const [issue,setIssue]=useState("");
  useEffect(()=>{
    let alive=true; let subscription:{unsubscribe:()=>void}|undefined;
    try {
      const supabase=getSocialSupabase();
      supabase.auth.getSession().then(({data,error})=>{
        if(!alive)return;
        if(error)setIssue(error.message);
        setSession(data.session); setLoading(false);
        if(!data.session)router.replace("/social/login");
      });
      const {data}=supabase.auth.onAuthStateChange((_event,next)=>{
        if(!alive)return; setSession(next); if(!next)router.replace("/social/login");
      });
      subscription=data.subscription;
    } catch(e) { setIssue(e instanceof Error?e.message:"Social AI configuration is missing."); setLoading(false); }
    return ()=>{alive=false;subscription?.unsubscribe();};
  },[router]);
  async function signOut(){try{await getSocialSupabase().auth.signOut();}finally{router.replace("/social/login");}}
  if(loading)return <main style={loadingStyle}>Loading your Social AI workspace…</main>;
  if(issue&&!session)return <main style={loadingStyle}><section style={panel}><h1>Setup required</h1><p>{issue}</p><Link href="/social/login">Back to login</Link></section></main>;
  if(!session)return null;
  return <main style={app}>
    <aside style={sidebar}>
      <Link href="/social" style={brand}><span style={brandMark}>▲</span><span><b>ON A TRIP HOLIDAYS</b><strong>OAT Social AI</strong></span></Link>
      <div style={navLabel}>WORKSPACE</div>
      <Link href="/social" style={navActive}>⌂　Workspace</Link>
      {modules.map(m=><Link key={m.name} href={m.href||"/social"} style={navLink}><span style={{color:"#1685e8",fontSize:17,width:20}}>{m.icon}</span>{m.name}{!m.href&&<small style={planned}>Soon</small>}</Link>)}
      <div style={sidebarFoot}><span style={onlineDot}/> Private Social AI workspace <small>Publishing remains disabled</small></div>
    </aside>
    <section style={main}>
      <header style={topbar}><div><div style={eyebrow}>ON A TRIP HOLIDAYS</div><h1 style={heading}>Social AI workspace</h1><p style={subtitle}>Plan smarter. Create consistently. Approve before publishing.</p></div><div style={account}><span>{session.user.email}</span><button onClick={signOut} style={secondaryButton}>Sign out</button></div></header>
      <section style={hero}><div><div style={{fontSize:10,fontWeight:800,letterSpacing:".16em",color:"#d6edff"}}>YOUR BRAND WORKSPACE</div><h2 style={{fontSize:32,letterSpacing:"-.04em",margin:"12px 0 8px"}}>On A Trip Holidays</h2><p style={{fontSize:13,lineHeight:1.7,maxWidth:560,margin:0,color:"#e5f3ff"}}>A dedicated home for travel campaigns, Instagram content, reels and brand assets. OWN remains a separate product.</p></div><div style={heroIcon}>✈</div></section>
      <div style={sectionHead}><div><h2 style={{fontSize:20,margin:"0 0 5px",color:"#10264a"}}>Creative tools</h2><p style={{fontSize:12,color:"#62758e",margin:0}}>Choose a workspace to get started.</p></div><span style={publishing}>PUBLISHING DISABLED</span></div>
      <section style={grid}>{modules.map(m=><article key={m.name} style={card}><div style={cardTop}><span style={moduleIcon}>{m.icon}</span><span style={status(m.status)}>{m.status}</span></div><h3 style={{fontSize:16,margin:"15px 0 7px",color:"#10264a"}}>{m.name}</h3><p style={{fontSize:12,color:"#60738d",lineHeight:1.65,margin:0,minHeight:40}}>{m.desc}</p>{m.href?<Link href={m.href} style={openLink}>Open module　→</Link>:<span style={{...openLink,color:"#8192a8"}}>Coming soon</span>}</article>)}</section>
      <p style={{fontSize:11,color:"#71839a",marginTop:25,lineHeight:1.7}}>Safety: no Instagram publishing, messaging, ad changes or external account actions are enabled.</p>
    </section>
  </main>;
}

const app:CSSProperties={minHeight:"100vh",display:"flex",background:"#f4f8fd",color:"#10264a",fontFamily:"Arial, sans-serif"};
const sidebar:CSSProperties={width:258,flexShrink:0,position:"sticky",top:0,height:"100vh",display:"flex",flexDirection:"column",padding:"25px 15px 16px",background:"linear-gradient(180deg,#073d78,#062b56)",color:"#fff",boxSizing:"border-box"};
const brand:CSSProperties={display:"flex",alignItems:"center",gap:12,padding:"3px 8px 28px",textDecoration:"none",color:"#fff"};
const brandMark:CSSProperties={width:42,height:42,borderRadius:12,display:"grid",placeItems:"center",background:"#0788ee",fontSize:22};
const navLabel:CSSProperties={fontSize:9,letterSpacing:".16em",color:"#a8c9e9",padding:"10px 10px"};
const navActive:CSSProperties={display:"block",padding:"12px 13px",borderRadius:9,background:"linear-gradient(90deg,#0788ee,#0874d2)",color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",marginBottom:8};
const navLink:CSSProperties={display:"flex",alignItems:"center",gap:10,padding:"10px 11px",borderRadius:8,color:"#e1efff",fontSize:12,textDecoration:"none"};
const planned:CSSProperties={marginLeft:"auto",fontSize:9,color:"#a9c6e3"};
const sidebarFoot:CSSProperties={marginTop:"auto",borderTop:"1px solid #ffffff26",padding:"16px 8px 2px",fontSize:10,color:"#d9eaff",lineHeight:1.8};
const onlineDot:CSSProperties={display:"inline-block",width:7,height:7,borderRadius:10,background:"#58d6a2",marginRight:8};
const main:CSSProperties={minWidth:0,flex:1,padding:"36px clamp(22px,4vw,58px) 30px"};
const topbar:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,flexWrap:"wrap",marginBottom:27};
const eyebrow:CSSProperties={fontSize:10,letterSpacing:".18em",color:"#0878d8",fontWeight:800};
const heading:CSSProperties={fontSize:34,letterSpacing:"-.05em",margin:"8px 0 4px",color:"#10264a"};
const subtitle:CSSProperties={fontSize:13,color:"#62758e",margin:0};
const account:CSSProperties={display:"flex",alignItems:"center",gap:12,fontSize:11,color:"#5c7089"};
const hero:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,minHeight:205,padding:"30px 34px",borderRadius:18,background:"linear-gradient(115deg,#07539a 0%,#0788e8 62%,#56b9f5 100%)",color:"#fff",boxShadow:"0 12px 32px #0b68ad20",overflow:"hidden"};
const heroIcon:CSSProperties={fontSize:82,color:"#d9efff",padding:"0 24px"};
const sectionHead:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"end",gap:12,margin:"30px 0 14px"};
const publishing:CSSProperties={fontSize:9,letterSpacing:".08em",padding:"7px 10px",borderRadius:20,border:"1px solid #d9a441",color:"#9b6a10",background:"#fff9e9"};
const grid:CSSProperties={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(215px,1fr))",gap:14};
const card:CSSProperties={border:"1px solid #dce8f5",borderRadius:14,padding:18,background:"#fff",minHeight:165,boxShadow:"0 5px 18px #174b7810"};
const cardTop:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center"};
const moduleIcon:CSSProperties={fontSize:22,color:"#087fe0"};
const status=(value:string):CSSProperties=>({fontSize:9,padding:"5px 8px",borderRadius:20,border:"1px solid "+(value==="Ready"?"#b5e5d0":"#d8e4f0"),background:value==="Ready"?"#e9fbf2":"#f2f6fb",color:value==="Ready"?"#137b4e":"#62758e"});
const openLink:CSSProperties={display:"inline-block",marginTop:14,color:"#0878d8",fontSize:11,fontWeight:700,textDecoration:"none"};
const panel:CSSProperties={background:"#fff",padding:24,borderRadius:14};
const loadingStyle:CSSProperties={minHeight:"100vh",display:"grid",placeContent:"center",background:"#f4f8fd",color:"#31506f"};
const secondaryButton:CSSProperties={padding:"9px 13px",borderRadius:8,border:"1px solid #cbdced",background:"#fff",color:"#174a7c",fontSize:11,fontWeight:700,cursor:"pointer"};
