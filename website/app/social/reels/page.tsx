"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

const shell:CSSProperties={minHeight:"100vh",padding:"34px clamp(18px,5vw,64px)",background:"radial-gradient(ellipse at 75% 0%,#173021 0%,#090d0b 48%)",color:"#eef4ef"};
const panel:CSSProperties={border:"1px solid #2a3b30",borderRadius:15,padding:21,background:"#111914"};
const label:CSSProperties={display:"grid",gap:7,color:"#9eafa3",fontSize:10,letterSpacing:".09em"};
const field:CSSProperties={width:"100%",boxSizing:"border-box",padding:"11px 12px",border:"1px solid #304238",borderRadius:8,background:"#0b100d",color:"#f2f5f2",fontSize:13};
const button:CSSProperties={padding:"10px 14px",border:0,borderRadius:8,background:"#26734a",color:"white",fontWeight:700,cursor:"pointer"};

export default function ReelStudioPage(){
  const [destination,setDestination]=useState("");
  const [duration,setDuration]=useState("");
  const [price,setPrice]=useState("");
  const [highlights,setHighlights]=useState("");
  const [cta,setCta]=useState("DM us to check the latest batch details.");
  const [tone,setTone]=useState("energetic Telugu-English");
  const [script,setScript]=useState("");
  const [caption,setCaption]=useState("");
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");

  function generate(){
    if(!destination.trim()){setError("Enter a destination first.");return;}
    const offer=price.trim() ? "Offer supplied: "+price.trim()+". Confirm it is still valid before publishing." : "Price not supplied — invite viewers to enquire for the latest price.";
    const trip=duration.trim() ? "Trip duration: "+duration.trim()+"." : "Add trip duration only after confirmation.";
    const points=highlights.split("\n").map(x=>x.trim()).filter(Boolean);
    const body=[
      "HOOK\n“"+destination.trim()+" trip plan chestunnారా? Mee next holiday ki ee destination ni shortlist cheyyandi!”",
      "TRIP INTRO\n“On A Trip Holidays tho "+destination.trim()+" explore cheyyandi.”",
      "DETAILS\n“"+trip+" "+offer+"”",
      "EXPERIENCE\n"+(points.length?points.map(x=>"“"+x+"”").join("\n"):"Add two or three verified highlights from the confirmed itinerary."),
      "CTA\n“"+cta.trim()+"”",
      "PRODUCTION NOTE\nTone: "+tone+". Use real, licensed destination footage. Verify price, dates, inclusions and availability with the travel team before posting."
    ].join("\n\n");
    setScript(body);
    setCaption(destination.trim()+" is calling! 🌍\n\nPlan your next getaway with On A Trip Holidays. "+cta.trim()+"\n\n#OnATripHolidays #TravelWithUs #TravelIndia");
    setError("");setNotice("Draft created from the details you supplied. No unverified package facts were added.");
  }

  async function saveDraft(){
    if(!script){setError("Generate a script before saving.");return;}
    setSaving(true);setError("");setNotice("");
    try{
      const supabase=getSocialSupabase();
      const {data:auth}=await supabase.auth.getUser();
      if(!auth.user)throw new Error("Sign in to save this draft.");
      const {error:writeError}=await supabase.from("social_content_items").insert({user_id:auth.user.id,title:destination.trim()+" reel",content_type:"reel",status:"draft",caption,script});
      if(writeError)throw writeError;
      setNotice("Reel script and caption saved to Content Planner.");
    }catch(e){setError(e instanceof Error?e.message:"Could not save reel draft.");}
    finally{setSaving(false);}
  }

  return <main style={shell}>
    <header style={{marginBottom:24}}><Link href="/social" style={{color:"#9bd0aa",fontSize:12,textDecoration:"none"}}>← Social AI workspace</Link><h1 style={{fontSize:34,letterSpacing:"-.04em",margin:"12px 0 5px"}}>Reel Studio</h1><p style={{color:"#91a096",fontSize:13,margin:0}}>Create factual reel scripts and captions with a free-first drafting workflow.</p></header>
    <section style={{...panel,marginBottom:16}}>
      <h2 style={{fontSize:17,margin:"0 0 15px"}}>Reel brief</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:13}}>
        <label style={label}>DESTINATION<input value={destination} onChange={e=>setDestination(e.target.value)} style={field} placeholder="e.g. Shimla, Manali & Kasol"/></label>
        <label style={label}>TRIP DURATION<input value={duration} onChange={e=>setDuration(e.target.value)} style={field} placeholder="e.g. 5 Nights / 6 Days"/></label>
        <label style={label}>CONFIRMED PRICE / OFFER<input value={price} onChange={e=>setPrice(e.target.value)} style={field} placeholder="Optional — verified offer only"/></label>
        <label style={label}>VOICE STYLE<select value={tone} onChange={e=>setTone(e.target.value)} style={field}><option>energetic Telugu-English</option><option>warm Telugu-English</option><option>clear English</option><option>premium and elegant English</option></select></label>
      </div>
      <label style={{...label,marginTop:13}}>VERIFIED TRIP HIGHLIGHTS — ONE PER LINE<textarea rows={4} value={highlights} onChange={e=>setHighlights(e.target.value)} style={{...field,resize:"vertical"}} placeholder={"Use confirmed itinerary highlights only\nExample: Solang Valley sightseeing"}/></label>
      <label style={{...label,marginTop:13}}>CALL TO ACTION<input value={cta} onChange={e=>setCta(e.target.value)} style={field}/></label>
      <button onClick={generate} style={{...button,marginTop:15}}>Generate reel draft</button>
    </section>
    {script&&<section style={panel}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2 style={{fontSize:17,margin:0}}>Your reel script</h2><button onClick={saveDraft} disabled={saving} style={button}>{saving?"Saving…":"Save to Content Planner"}</button></div>
      <textarea aria-label="Editable reel script" value={script} onChange={e=>setScript(e.target.value)} rows={15} style={{...field,marginTop:14,resize:"vertical",lineHeight:1.7}}/>
      <h3 style={{fontSize:13,margin:"18px 0 8px"}}>Instagram caption</h3><textarea aria-label="Editable Instagram caption" value={caption} onChange={e=>setCaption(e.target.value)} rows={5} style={{...field,resize:"vertical",lineHeight:1.7}}/>
      <p style={{fontSize:10,color:"#829087",lineHeight:1.6}}>This is a script and caption drafting tool, not a video renderer. It does not generate footage or publish to Instagram.</p>
    </section>}
    {error&&<p role="alert" style={{color:"#ff9b9b",fontSize:12}}>{error}</p>}{notice&&<p role="status" style={{color:"#9bd9ae",fontSize:12}}>{notice}</p>}
  </main>;
}
