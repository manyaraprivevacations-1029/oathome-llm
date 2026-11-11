"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialDraft } from "@/lib/social/generate";
import { validateVoiceScript, voiceScriptPrompt, type VoiceLanguage } from "@/lib/social/voice-script";

const shell:CSSProperties={minHeight:"calc(100vh - 70px)",padding:"8px 0 32px",background:"transparent",color:"#30291f"};
const panel:CSSProperties={background:"#fffdf9",border:"1px solid #e7dfd1",borderRadius:15,padding:22};
const label:CSSProperties={display:"grid",gap:7,color:"#746957",fontSize:10,letterSpacing:".08em"};
const field:CSSProperties={width:"100%",boxSizing:"border-box",padding:"11px 12px",border:"1px solid #ded5c6",borderRadius:8,background:"#fff",color:"#30291f",fontSize:13};
const button:CSSProperties={padding:"10px 14px",border:0,borderRadius:8,background:"#a8752d",color:"#fff",fontWeight:700,cursor:"pointer"};
export default function VoiceStudioPage(){
 const [topic,setTopic]=useState("");const [duration,setDuration]=useState("30 seconds");const [language,setLanguage]=useState<VoiceLanguage>("Natural Telugu-English");const [facts,setFacts]=useState("");const [draft,setDraft]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function generate() {
  if (!topic.trim()) { setError("Enter the destination or topic."); return; }
  setBusy(true);
  setError("");
  setMessage("");
  const prompt = voiceScriptPrompt({ topic, duration, language, facts });
  try {
   const firstDraft = await generateSocialDraft(prompt);
   let script: string;
   try {
    script = validateVoiceScript(firstDraft, language);
   } catch (problem) {
    const reason = problem instanceof Error ? problem.message : "Check the selected language.";
    const retry = await generateSocialDraft(`${prompt}\nThe previous result did not meet the brief. ${reason} Create a fresh script.`);
    script = validateVoiceScript(retry, language);
   }
   setDraft(script);
   setMessage("Voiceover script generated. Review the details before recording.");
  } catch (problem) {
   setError(problem instanceof Error ? problem.message : "Generation failed.");
  } finally {
   setBusy(false);
  }
 }
 async function save(){if(!draft)return;setBusy(true);setError("");try{const sb=getSocialSupabase();const {data}=await sb.auth.getUser();if(!data.user)throw new Error("Please sign in again.");const {error}=await sb.from("social_content_items").insert({user_id:data.user.id,title:topic+" voiceover",content_type:"reel",status:"draft",script:draft,metadata:{studio:"voice"}});if(error)throw error;setMessage("Voiceover script saved to Content Planner.");}catch(e){setError(e instanceof Error?e.message:"Could not save.");}finally{setBusy(false);}}
 return <main style={shell}><header style={{marginBottom:22}}><Link href="/social" style={{color:"#a8752d",fontSize:12,textDecoration:"none"}}>← Social AI workspace</Link><h1 style={{fontSize:34,margin:"12px 0 5px"}}>Voice Studio</h1><p style={{fontSize:13,color:"#746957"}}>Generate and save voiceover scripts using your existing OWN model service.</p></header><section style={{...panel,display:"grid",gap:14}}><label style={label}>DESTINATION / TOPIC<input value={topic} onChange={e=>setTopic(e.target.value)} style={field} placeholder="e.g. Kashmir winter holiday"/></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label style={label}>TARGET LENGTH<select value={duration} onChange={e=>setDuration(e.target.value)} style={field}><option>15 seconds</option><option>30 seconds</option><option>40 seconds</option><option>60 seconds</option></select></label><label style={label}>LANGUAGE<select value={language} onChange={e=>setLanguage(e.target.value as VoiceLanguage)} style={field}><option>Natural Telugu-English</option><option>English</option><option>Telugu</option></select></label></div><label style={label}>VERIFIED PACKAGE FACTS (OPTIONAL)<textarea rows={4} value={facts} onChange={e=>setFacts(e.target.value)} style={{...field,resize:"vertical"}} placeholder="Paste confirmed price, duration, inclusions and departure details. Leave blank to avoid claims."/></label><button disabled={busy} onClick={()=>void generate()} style={button}>{busy?"Generating…":"Generate with OWN"}</button></section>{draft&&<section style={{...panel,marginTop:16}}><h2 style={{fontSize:17}}>Voiceover script</h2><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={12} style={{...field,resize:"vertical",lineHeight:1.7}}/><button disabled={busy} onClick={()=>void save()} style={{...button,marginTop:12}}>Save to Content Planner</button></section>}{error&&<p role="alert" style={{color:"#b42318",fontSize:12}}>{error}</p>}{message&&<p role="status" style={{color:"#a8752d",fontSize:12}}>{message}</p>}<p style={{fontSize:11,color:"#71839a",marginTop:15}}>This creates scripts only. Audio recording, text-to-speech and video rendering are not enabled in this module yet.</p></main>;
}
