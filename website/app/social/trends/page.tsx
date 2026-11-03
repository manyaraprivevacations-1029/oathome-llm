"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

type Trend = { id:string; title:string; platform:string; destination:string|null; insight:string; source_url:string|null; content_angle:string|null; created_at:string };
const shell:CSSProperties={minHeight:"100vh",padding:"34px clamp(18px,5vw,64px)",background:"#f4f8fd",color:"#10264a"};
const panel:CSSProperties={border:"1px solid #dce8f5",borderRadius:15,padding:21,background:"#ffffff"};
const label:CSSProperties={display:"grid",gap:7,color:"#5d708a",fontSize:10,letterSpacing:".08em"};
const field:CSSProperties={width:"100%",boxSizing:"border-box",padding:"11px 12px",border:"1px solid #cbdced",borderRadius:8,background:"#ffffff",color:"#142b4f",fontSize:13};
const primary:CSSProperties={padding:"10px 14px",border:0,borderRadius:8,background:"#0878d8",color:"#ffffff",fontWeight:700,cursor:"pointer"};
const muted:CSSProperties={padding:"9px 12px",border:"1px solid #cbdced",borderRadius:8,background:"#edf5fc",color:"#174a7c",fontSize:11,cursor:"pointer"};

export default function TrendResearchPage(){
 const router=useRouter();
 const [trends,setTrends]=useState<Trend[]>([]);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [title,setTitle]=useState("");
 const [platform,setPlatform]=useState("Instagram");
 const [destination,setDestination]=useState("");
 const [insight,setInsight]=useState("");
 const [source,setSource]=useState("");
 const [angle,setAngle]=useState("");

 async function refresh(){
  const sb=getSocialSupabase();const {data:auth}=await sb.auth.getUser();
  if(!auth.user){router.replace("/social/login");return;}
  const {data,error}=await sb.from("social_trend_research").select("id,title,platform,destination,insight,source_url,content_angle,created_at").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(100);
  if(error)throw error;setTrends((data||[]) as Trend[]);
 }
 useEffect(()=>{let alive=true;(async()=>{try{await refresh();}catch(e){if(alive)setError(e instanceof Error?e.message:"Unable to load research. Check that the Social AI database migration has been applied.");}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[router]);

 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setError("");setNotice("");
  try{
   const sb=getSocialSupabase();const {data:auth}=await sb.auth.getUser();if(!auth.user)throw new Error("Please sign in again.");
   const {error}=await sb.from("social_trend_research").insert({user_id:auth.user.id,title:title.trim(),platform,destination:destination.trim()||null,insight:insight.trim(),source_url:source.trim()||null,content_angle:angle.trim()||null});
   if(error)throw error;
   setTitle("");setDestination("");setInsight("");setSource("");setAngle("");setNotice("Research note saved privately.");await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not save research.");}
  finally{setSaving(false);}
 }
 async function turnIntoDraft(t:Trend){
  setError("");setNotice("");
  try{
   const sb=getSocialSupabase();const {data:auth}=await sb.auth.getUser();if(!auth.user)throw new Error("Please sign in again.");
   const caption="Trend insight: "+t.insight+"\n\nContent angle: "+(t.content_angle||"Develop a useful travel post around this insight.")+"\n\nVerify all package details before publishing.\n\n#OnATripHolidays #TravelIndia";
   const script="RESEARCH-LED CONTENT BRIEF\nTrend: "+t.title+"\nPlatform: "+t.platform+"\nDestination: "+(t.destination||"Not specified")+"\n\nInsight: "+t.insight+"\n\nSuggested angle: "+(t.content_angle||"Create an informative travel post based on this trend.")+"\n\nResearch source: "+(t.source_url||"Not recorded")+"\n\nBefore publishing, verify prices, dates, availability and inclusions with the travel team.";
   const {error}=await sb.from("social_content_items").insert({user_id:auth.user.id,title:"Trend idea: "+t.title,content_type:"post",status:"draft",caption,script});
   if(error)throw error;setNotice("A content draft was created in Content Planner.");
  }catch(e){setError(e instanceof Error?e.message:"Could not create content draft.");}
 }
 return <main style={shell}>
  <header style={{marginBottom:22}}><Link href="/social" style={{color:"#0878d8",fontSize:12,textDecoration:"none"}}>← Social AI workspace</Link><h1 style={{fontSize:34,letterSpacing:"-.04em",margin:"12px 0 5px"}}>Trend Research</h1><p style={{color:"#60738d",fontSize:13,margin:0}}>Collect travel and Instagram signals, record the source, and turn useful insights into content drafts.</p></header>
  <section style={{...panel,marginBottom:16,background:"#eaf4ff"}}>
   <h2 style={{fontSize:16,margin:"0 0 8px",color:"#075da8"}}>Research workflow</h2>
   <p style={{fontSize:12,color:"#45617f",lineHeight:1.7,margin:0}}>Add a trend you have spotted from Instagram, Google Trends, competitor posts, customer enquiries or travel news. Keep the source link so your team can verify it. Turn saved research into a draft with one click.</p>
  </section>
  <section style={{...panel,marginBottom:16}}>
   <h2 style={{fontSize:17,margin:"0 0 15px"}}>Add a research insight</h2>
   <form onSubmit={save} style={{display:"grid",gap:13}}>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
     <label style={label}>TREND / TOPIC<input required value={title} onChange={e=>setTitle(e.target.value)} style={field} placeholder="e.g. Winter snowfall trips"/></label>
     <label style={label}>PLATFORM / SOURCE<select value={platform} onChange={e=>setPlatform(e.target.value)} style={field}><option>Instagram</option><option>Google Trends</option><option>YouTube</option><option>Competitor research</option><option>Customer enquiries</option><option>Travel news</option><option>Other</option></select></label>
    </div>
    <label style={label}>DESTINATION / MARKET<input value={destination} onChange={e=>setDestination(e.target.value)} style={field} placeholder="e.g. Manali, Kashmir, Hyderabad audience"/></label>
    <label style={label}>WHAT DID YOU NOTICE?<textarea required rows={3} value={insight} onChange={e=>setInsight(e.target.value)} style={{...field,resize:"vertical"}} placeholder="Describe the trend, audience question, content format or demand signal…"/></label>
    <label style={label}>SOURCE URL (OPTIONAL)<input type="url" value={source} onChange={e=>setSource(e.target.value)} style={field} placeholder="https://…"/></label>
    <label style={label}>CONTENT IDEA / ANGLE (OPTIONAL)<textarea rows={3} value={angle} onChange={e=>setAngle(e.target.value)} style={{...field,resize:"vertical"}} placeholder="How could On A Trip Holidays turn this into a useful reel, carousel or post?"/></label>
    <div><button disabled={saving} style={primary}>{saving?"Saving…":"Save research"}</button></div>
   </form>
  </section>
  <section style={panel}>
   <h2 style={{fontSize:17,margin:"0 0 14px"}}>Saved research <span style={{fontSize:11,color:"#71839a"}}>({trends.length})</span></h2>
   {error&&<p role="alert" style={{color:"#b42318",fontSize:12,whiteSpace:"pre-wrap"}}>{error}</p>}
   {notice&&<p role="status" style={{color:"#0878d8",fontSize:12}}>{notice}</p>}
   {loading?<p style={{fontSize:12,color:"#5d708a"}}>Loading research…</p>:trends.length===0?<p style={{fontSize:12,color:"#60738d"}}>No research saved yet. Add your first insight above.</p>:<div style={{display:"grid",gap:11}}>
    {trends.map(t=><article key={t.id} style={{border:"1px solid #dce8f5",borderRadius:11,padding:15,background:"#f7fbff"}}>
     <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h3 style={{fontSize:14,margin:"0 0 5px"}}>{t.title}</h3><span style={{fontSize:10,color:"#60738d"}}>{t.platform}{t.destination?" · "+t.destination:""} · {new Date(t.created_at).toLocaleDateString()}</span></div><button style={primary} onClick={()=>void turnIntoDraft(t)}>Create content draft</button></div>
     <p style={{fontSize:12,color:"#314968",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{t.insight}</p>
     {t.content_angle&&<p style={{fontSize:12,color:"#45617f",lineHeight:1.6}}><strong>Content angle:</strong> {t.content_angle}</p>}
     {t.source_url&&<a href={t.source_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#0878d8"}}>Open research source ↗</a>}
    </article>)}
   </div>}
  </section>
  <p style={{fontSize:10,color:"#71839a",lineHeight:1.6,marginTop:16}}>This version organises and converts research you provide. It does not claim live trend rankings or scrape Instagram. Research notes are private to your signed-in account.</p>
 </main>;
}
