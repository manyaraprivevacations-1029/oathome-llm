"use client";

import { useEffect, useState, type FormEvent, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import travelKnowledge from "@/data/travel-knowledge.json";

type BrandProfile = {
  id?: string;
  brand_name: string;
  website_url: string;
  instagram_handle: string;
  brand_voice: string;
  audience_notes: string;
  content_rules: { pillars?: string[]; avoid?: string; language?: string; cta?: string };
};

const defaults: BrandProfile = {
  brand_name: "On A Trip Holidays",
  website_url: "https://onatripholidays.in",
  instagram_handle: "@onatripholiday",
  brand_voice: "Friendly, trustworthy, energetic travel advisor. Use natural Telugu-English when speaking to the Hyderabad audience. Avoid exaggerated promises.",
  audience_notes: "Travel-loving people from Hyderabad, Telangana and nearby markets. Ask the team to confirm audience segments and campaign targeting.",
  content_rules: {
    pillars: ["Destination inspiration", "Verified package details", "Travel tips and FAQs", "Customer experiences", "Seasonal offers after confirmation"],
    avoid: "Do not invent prices, dates, availability, inclusions, snowfall, hotel standards or guarantees. Confirm changing details with the travel team. No misleading urgency.",
    language: "Conversational Telugu-English and clear English, depending on the post.",
    cta: "Invite people to enquire with On A Trip Holidays; confirm package details before booking."
  }
};

const shell: CSSProperties = { minHeight:"100vh", padding:"34px clamp(18px,5vw,64px)", background:"transparent",color:"#30291f" };
const panel: CSSProperties = { border:"1px solid #e7dfd1", borderRadius:15, padding:22, background:"#ffffff" };
const label: CSSProperties = { display:"grid", gap:7, color:"#746957", fontSize:10, letterSpacing:".09em" };
const input: CSSProperties = { width:"100%", boxSizing:"border-box", padding:"11px 12px", border:"1px solid #ded5c6", borderRadius:8, background:"#ffffff", color:"#30291f", fontSize:13 };
const button: CSSProperties = { padding:"11px 15px", border:0, borderRadius:9, background:"#a8752d", color:"white", fontWeight:700, cursor:"pointer" };

export default function BrandBrainPage() {
  const router = useRouter();
  const [profile,setProfile] = useState<BrandProfile>(defaults);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  const [pillarText,setPillarText] = useState(defaults.content_rules.pillars?.join("\n") || "");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const supabase = getSocialSupabase();
        const { data: auth } = await supabase.auth.getSession();
        if (!auth.session) { router.replace("/social/login"); return; }
        const { data, error: readError } = await supabase.from("social_brand_profiles").select("*").eq("user_id",auth.session.user.id).eq("brand_name","On A Trip Holidays").maybeSingle();
        if (readError) throw readError;
        if (active && data) {
          const next = { ...defaults, ...data, content_rules: { ...defaults.content_rules, ...(data.content_rules || {}) } } as BrandProfile;
          setProfile(next);
          setPillarText((next.content_rules.pillars || []).join("\n"));
        }
      } catch (e) { if(active) setError(e instanceof Error ? e.message : "Could not load brand profile."); }
      finally { if(active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  },[router]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const supabase = getSocialSupabase();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.replace("/social/login"); return; }
      const payload = {
        user_id: auth.user.id,
        brand_name: profile.brand_name.trim(),
        website_url: profile.website_url.trim(),
        instagram_handle: profile.instagram_handle.trim(),
        brand_voice: profile.brand_voice.trim(),
        audience_notes: profile.audience_notes.trim(),
        content_rules: { ...profile.content_rules, pillars: pillarText.split("\n").map(x=>x.trim()).filter(Boolean) }
      };
      const { error: writeError } = await supabase.from("social_brand_profiles").upsert(payload,{ onConflict:"user_id,brand_name" });
      if (writeError) throw writeError;
      setMessage("Brand Brain saved. Your settings are ready to guide future content drafts.");
    } catch(e) { setError(e instanceof Error ? e.message : "Could not save brand profile."); }
    finally { setSaving(false); }
  }

  function update<K extends keyof BrandProfile>(key:K,value:BrandProfile[K]) { setProfile(old=>({...old,[key]:value})); }

  return <main style={shell}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap",marginBottom:25}}>
      <div><Link href="/social" style={{color:"#a8752d",fontSize:12,textDecoration:"none"}}>← Social AI workspace</Link><h1 style={{fontSize:34,letterSpacing:"-.04em",margin:"12px 0 5px"}}>Brand Brain</h1><p style={{color:"#746957",fontSize:13,margin:0}}>One trusted source for your brand voice and content rules.</p></div>
      <span style={{fontSize:9,letterSpacing:".1em",padding:"7px 10px",border:"1px solid #c6def5",borderRadius:20,color:"#1769aa"}}>PRIVATE WORKSPACE</span>
    </header>
    <section style={{...panel,marginBottom:17}}>
      <h2 style={{fontSize:16,margin:"0 0 8px"}}>Verified starting details</h2>
      <p style={{fontSize:12,color:"#627b95",lineHeight:1.7,margin:0}}>Company name, website and Instagram handle are prefilled from the existing On A Trip Holidays project context. Review them before saving. Package information remains in the existing travel knowledge source and is not edited here.</p>
    </section>

    <section style={{...panel,marginBottom:17}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div><h2 style={{fontSize:16,margin:"0 0 6px"}}>Business knowledge connected</h2><p style={{fontSize:12,color:"#627b95",lineHeight:1.6,margin:0}}>Your Brand Brain works alongside the existing verified travel knowledge source. This keeps brand preferences separate from package facts.</p></div>
        <span style={{fontSize:10,padding:"6px 9px",borderRadius:20,background:"#e9fbf2",color:"#137b4e",border:"1px solid #b5e5d0"}}>CONNECTED</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginTop:15}}>
        <div style={{padding:13,borderRadius:10,background:"#f2f7fc"}}><strong style={{fontSize:22,color:"#a8752d"}}>{travelKnowledge.packages.length}</strong><div style={{fontSize:10,color:"#627b95",marginTop:4}}>Package records</div></div>
        <div style={{padding:13,borderRadius:10,background:"#f2f7fc"}}><strong style={{fontSize:22,color:"#a8752d"}}>{travelKnowledge.services.length}</strong><div style={{fontSize:10,color:"#627b95",marginTop:4}}>Service categories</div></div>
        <div style={{padding:13,borderRadius:10,background:"#f2f7fc"}}><strong style={{fontSize:22,color:"#a8752d"}}>1</strong><div style={{fontSize:10,color:"#627b95",marginTop:4}}>Official travel knowledge source</div></div>
      </div>
      <h3 style={{fontSize:12,margin:"17px 0 9px"}}>Available package knowledge</h3>
      <div style={{display:"grid",gap:8}}>
        {travelKnowledge.packages.map((item,index)=><div key={item.name} style={{padding:"10px 12px",border:"1px solid #e7dfd1",borderRadius:9,background:"#fbfdff"}}>
          <strong style={{fontSize:12}}>{item.name}</strong>
          <p style={{fontSize:11,color:"#627b95",margin:"4px 0 0",lineHeight:1.5}}>{item.duration} · {item.destination}</p>
          <p style={{fontSize:10,color:"#9b6a10",margin:"5px 0 0"}}>Price and departure details must be reconfirmed before promotion.</p>
        </div>)}
      </div>
      <p style={{fontSize:10,color:"#71839a",lineHeight:1.6,margin:"12px 0 0"}}>Package records are displayed from the existing knowledge file; this page does not edit them. Ask the travel team to update the source when package information changes.</p>
    </section>
    {loading ? <p style={{color:"#746957"}}>Loading your brand profile…</p> : <form onSubmit={save} style={{display:"grid",gap:15}}>
      <section style={panel}>
        <h2 style={{fontSize:16,margin:"0 0 17px"}}>Brand identity</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:14}}>
          <label style={label}>BRAND NAME<input required value={profile.brand_name} onChange={e=>update("brand_name",e.target.value)} style={input}/></label>
          <label style={label}>WEBSITE<input type="url" value={profile.website_url} onChange={e=>update("website_url",e.target.value)} style={input}/></label>
          <label style={label}>INSTAGRAM HANDLE<input value={profile.instagram_handle} onChange={e=>update("instagram_handle",e.target.value)} style={input}/></label>
        </div>
      </section>
      <section style={panel}>
        <h2 style={{fontSize:16,margin:"0 0 15px"}}>Audience and voice</h2>
        <div style={{display:"grid",gap:14}}>
          <label style={label}>BRAND VOICE<textarea required rows={4} value={profile.brand_voice} onChange={e=>update("brand_voice",e.target.value)} style={{...input,resize:"vertical"}}/></label>
          <label style={label}>TARGET AUDIENCE NOTES<textarea rows={3} value={profile.audience_notes} onChange={e=>update("audience_notes",e.target.value)} style={{...input,resize:"vertical"}}/></label>
        </div>
      </section>
      <section style={panel}>
        <h2 style={{fontSize:16,margin:"0 0 15px"}}>Content guardrails</h2>
        <div style={{display:"grid",gap:14}}>
          <label style={label}>CONTENT PILLARS — ONE PER LINE<textarea rows={5} value={pillarText} onChange={e=>setPillarText(e.target.value)} style={{...input,resize:"vertical"}}/></label>
          <label style={label}>WHAT CONTENT MUST AVOID<textarea rows={3} value={profile.content_rules.avoid || ""} onChange={e=>update("content_rules",{...profile.content_rules,avoid:e.target.value})} style={{...input,resize:"vertical"}}/></label>
          <label style={label}>LANGUAGE STYLE<textarea rows={2} value={profile.content_rules.language || ""} onChange={e=>update("content_rules",{...profile.content_rules,language:e.target.value})} style={{...input,resize:"vertical"}}/></label>
          <label style={label}>DEFAULT CALL TO ACTION<textarea rows={2} value={profile.content_rules.cta || ""} onChange={e=>update("content_rules",{...profile.content_rules,cta:e.target.value})} style={{...input,resize:"vertical"}}/></label>
        </div>
      </section>
      {error && <p role="alert" style={{color:"#b42318",fontSize:12}}>{error}</p>}
      {message && <p role="status" style={{color:"#a8752d",fontSize:12}}>{message}</p>}
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><button disabled={saving} type="submit" style={button}>{saving?"Saving…":"Save Brand Brain"}</button><span style={{fontSize:11,color:"#71839a"}}>Saved privately to your signed-in Social AI account.</span></div>
    </form>}
  </main>;
}
