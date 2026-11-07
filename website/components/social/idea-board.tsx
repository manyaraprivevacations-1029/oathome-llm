"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialDraft } from "@/lib/social/generate";
type Idea={id:string;title:string;concept:string;angle:string;format:string;category:string;hooks:string[];evidence_note:string;source_url:string|null;position:number;created_at:string};
type Frequency="off"|"once"|"daily"|"weekly"|"monthly";
const panel:CSSProperties={background:"#fffdfa",border:"1px solid #e6dac8",borderRadius:16,padding:19};
const action:CSSProperties={border:"1px solid #d8c7ab",borderRadius:9,padding:"8px 11px",background:"#fffaf1",color:"#80561d",fontSize:12,cursor:"pointer"};
const primary:CSSProperties={...action,background:"#a8752d",color:"#fff",borderColor:"#a8752d",fontWeight:700};
const input:CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px 12px",border:"1px solid #ded5c6",borderRadius:9,fontSize:13,background:"#fff",color:"#30291f"};
const frequencyOptions:Frequency[]=["off","once","daily","weekly","monthly"];
function parseIdeas(raw:string):Omit<Idea,"id"|"position"|"created_at">[]{
 const clean=raw.trim().replace(/^\x60\x60\x60(?:json)?/i,"").replace(/\x60\x60\x60$/,"").trim();
 let parsed:unknown;
 try {parsed=JSON.parse(clean);} catch {
   const start=clean.indexOf("{"),end=clean.lastIndexOf("}");
   if(start<0||end<=start)throw new Error("Gemini did not return structured idea cards. Please regenerate.");
   parsed=JSON.parse(clean.slice(start,end+1));
 }
 const entries=Array.isArray(parsed)?parsed:(parsed&&typeof parsed==="object"?(parsed as {ideas?:unknown}).ideas:undefined);
 if(!Array.isArray(entries)||entries.length===0)throw new Error("Gemini returned no idea cards. Try a clearer topic.");
 return entries.slice(0,5).map(x=>{
   if(!x||typeof x!=="object")throw new Error("Gemini returned an incomplete idea.");
   const d=x as Record<string,unknown>;
   const title=String(d.title||"").trim(),concept=String(d.concept||"").trim();
   if(!title||!concept)throw new Error("Gemini returned an incomplete title or concept.");
   return {title:title.slice(0,220),concept:concept.slice(0,1600),angle:String(d.angle||"").slice(0,1500),format:String(d.format||"reel").slice(0,50),category:String(d.category||"Travel inspiration").slice(0,100),hooks:Array.isArray(d.hooks)?d.hooks.slice(0,3).map((h:unknown)=>String(h).slice(0,300)).filter(Boolean):[],evidence_note:"AI suggestion — no performance evidence verified",source_url:null};
 });
}
function due(f:Frequency,last:string|null){
 if(f==="off")return false;
 if(!last)return true;
 if(f==="once")return false;
 const ms=Date.now()-new Date(last).getTime();
 return ms>=({daily:86400000,weekly:604800000,monthly:2592000000}[f]||Infinity);
}
export default function IdeaBoard(){
 const [ideas,setIdeas]=useState<Idea[]>([]);
 const [frequency,setFrequency]=useState<Frequency>("off");
 const [last,setLast]=useState<string|null>(null);
 const [topic,setTopic]=useState("Telugu travellers exploring India");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [editing,setEditing]=useState<Idea|null>(null);
 const [hookTabs,setHookTabs]=useState<Record<string,number>>({});
 const active=useRef(false);
 const generating=useRef(false);
 const user=useCallback(async()=>{
  const sb=getSocialSupabase();const {data,error}=await sb.auth.getUser();
  if(error||!data.user)throw new Error("Please sign in again to save ideas.");
  return data.user.id;
 },[]);
 const load=useCallback(async()=>{
   const uid=await user(),sb=getSocialSupabase();
   const [rows,prefs]=await Promise.all([
    sb.from("social_idea_cards").select("id,title,concept,angle,format,category,hooks,evidence_note,source_url,position,created_at").eq("user_id",uid).order("position",{ascending:true}).order("created_at",{ascending:false}).limit(90),
    sb.from("social_idea_preferences").select("frequency,last_generated_at").eq("user_id",uid).maybeSingle()
   ]);
   if(rows.error)throw rows.error;if(prefs.error)throw prefs.error;
   setIdeas((rows.data||[]) as Idea[]);
   setFrequency((prefs.data?.frequency||"off") as Frequency);
   setLast(prefs.data?.last_generated_at||null);
   return {frequency:(prefs.data?.frequency||"off") as Frequency,last:prefs.data?.last_generated_at||null};
 },[user]);
 const generate=useCallback(async(only?:Idea, selectedFrequency?:Frequency)=>{
  if(generating.current)return;
  generating.current=true;setBusy(true);setError("");setNotice("");
  try{
    const uid=await user(),sb=getSocialSupabase();
    const prompt=[
     "You are an Instagram content strategist for ON A TRIP HOLIDAYS, a Telugu-first India travel business.",
     "Return ONLY valid JSON. Structure: an object with an ideas array. Each idea has string fields title, concept, angle, format, category and a hooks array of two strings.",
     "Give "+(only?"1":"3")+" distinct actionable ideas with 2 short Telugu-English hooks each. Topic: "+(only?only.title:topic)+".",
     "Formats may be Reel, Carousel or Post. Focus on Hyderabad, Telangana and Andhra Pradesh travellers, budgets, family travel, pilgrimages, groups and authentic destination experiences.",
     "For every idea include a concise engaging title, content concept, specific angle or shot sequence and category.",
     "Do not assert any actual post performance or measured results. Do not invent package pricing, dates, availability, weather or customer testimonials. Suggestions are not trend evidence.",
     "Use the verified brand tone: premium, friendly, natural Telugu-English."
    ].join("\n");
    const parsed=parseIdeas(await generateSocialDraft(prompt));
    if(only){
      const item=parsed[0];
      const {error}=await sb.from("social_idea_cards").update({...item,updated_at:new Date().toISOString()}).eq("id",only.id).eq("user_id",uid);
      if(error)throw error;
      setNotice("Idea refreshed with Gemini. The previous idea was replaced.");
    }else{
      const stamp=new Date().toISOString();
      const positions=parsed.map((x,i)=>({...x,user_id:uid,position:i,created_at:stamp}));
      const ordered=ideas.map((x,i)=>({id:x.id,position:i+parsed.length}));
      const {error}=await sb.from("social_idea_cards").insert(positions);
      if(error)throw error;
      // New ideas lead the queue; old positions are best-effort (a failed update must not lose generated content).
      await Promise.all(ordered.map(x=>sb.from("social_idea_cards").update({position:x.position}).eq("id",x.id).eq("user_id",uid)));
      const {error:prefError}=await sb.from("social_idea_preferences").upsert({user_id:uid,frequency:selectedFrequency||frequency,last_generated_at:stamp,updated_at:stamp});
      if(prefError)throw prefError;
      setLast(stamp);setNotice("New Gemini ideas saved to your private idea board.");
    }
    await load();
  }catch(e){setError(e instanceof Error?e.message:"Could not generate ideas.");}
  finally{setBusy(false);generating.current=false;}
 },[topic,ideas,frequency,load,user]);
 useEffect(()=>{
   if(active.current)return;active.current=true;
   void load().then(async setting=>{
     setLoading(false);
     if(setting.frequency!=="off"&&due(setting.frequency,setting.last)){
       // The selected frequency is checked when Studio opens; no background server cron is implied.
       await generate(undefined,setting.frequency);
     }
   }).catch(e=>{setError(e instanceof Error?e.message:"Could not load ideas");setLoading(false)});
 },[]); // Startup check deliberately runs once, with the user's persisted frequency.
 async function changeFrequency(value:Frequency){
   setFrequency(value);setError("");setNotice("");
   try{
    const uid=await user(),stamp=new Date().toISOString();
    const {error}=await getSocialSupabase().from("social_idea_preferences").upsert({user_id:uid,frequency:value,updated_at:stamp});
    if(error)throw error;
    setNotice(value==="off"?"Automatic refresh is off.":value==="once"?"A new batch will be generated the next time you open Idea Studio.":"Idea Studio will check for a new batch when you open it, at your selected frequency.");
   }catch(e){setError(e instanceof Error?e.message:"Could not save frequency");}
 }
 async function mutate(id:string,action:"up"|"down"|"delete"){
   const i=ideas.findIndex(x=>x.id===id);
   if(i<0)return;
   if(action==="delete"&&!window.confirm("Delete this idea from the board?"))return;
   try{
    const uid=await user(),sb=getSocialSupabase();
    if(action==="delete"){
      const {error}=await sb.from("social_idea_cards").delete().eq("user_id",uid).eq("id",id);
      if(error)throw error;
    }else{
      const j=action==="up"?i-1:i+1;
      if(j<0||j>=ideas.length)return;
      // Write changed positions using fresh indices.
      const shuffled=[...ideas];[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
      for(const [n,item] of shuffled.entries()){
        if(item.position!==n){const {error}=await sb.from("social_idea_cards").update({position:n}).eq("id",item.id).eq("user_id",uid);if(error)throw error;}
      }
    }
    await load();
   }catch(e){setError(e instanceof Error?e.message:"Could not update idea.");}
 }
 async function saveEdit(){
   if(!editing)return;
   try{
    if(!editing.title.trim()||!editing.concept.trim())throw new Error("Title and concept are required.");
    const uid=await user();
    const {error}=await getSocialSupabase().from("social_idea_cards").update({title:editing.title.trim(),concept:editing.concept.trim(),angle:editing.angle,category:editing.category,format:editing.format,hooks:editing.hooks,updated_at:new Date().toISOString()}).eq("id",editing.id).eq("user_id",uid);
    if(error)throw error;setEditing(null);setNotice("Idea changes saved.");await load();
   }catch(e){setError(e instanceof Error?e.message:"Could not save your changes");}
 }
 async function sendToPlanner(idea:Idea){
   try{
    const uid=await user(),sb=getSocialSupabase();
    const {error}=await sb.from("social_content_items").insert({
      user_id:uid,title:idea.title,content_type:/carousel/i.test(idea.format)?"carousel":/post/i.test(idea.format)?"post":"reel",status:"draft",
      caption:idea.concept+"\n\nSuggested angle: "+idea.angle+"\n\nHook: "+(idea.hooks[0]||"")+"\n\nVerify package facts before publishing.",
      metadata:{source:"gemini-idea-board",idea_id:idea.id,evidence_status:"not_verified"}
    });
    if(error)throw error;setNotice("Draft saved in the Content Planner for review.");
   }catch(e){setError(e instanceof Error?e.message:"Could not create a draft.");}
 }
 return <section style={{marginBottom:22}}>
   <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",flexWrap:"wrap",gap:14,margin:"0 0 17px"}}>
    <div><div style={{color:"#a8752d",fontSize:10,fontWeight:800,letterSpacing:".14em"}}>YOUR CREATIVE PIPELINE</div><h2 style={{fontSize:28,margin:"7px 0 3px",letterSpacing:"-.035em"}}>Your ideas</h2><p style={{color:"#736957",fontSize:12,margin:0}}>Fresh concepts, flexible hooks and editable drafts for ON A TRIP HOLIDAYS.</p></div>
    <span style={{background:"#f0e3c8",borderRadius:99,padding:"8px 12px",color:"#80561d",fontSize:11,fontWeight:700}}>Gemini-powered • Private</span>
   </div>
   <div style={{...panel,marginBottom:18}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
     <div><h3 style={{fontSize:16,margin:"0 0 6px"}}>Fresh ideas</h3><p style={{margin:0,fontSize:12,color:"#746957"}}>Choose how often Idea Studio checks for fresh ideas when you open it. No background generation or Instagram scraping.</p></div>
     <div role="group" aria-label="Idea refresh frequency" style={{display:"flex",flexWrap:"wrap",gap:4,padding:4,background:"#f4ede0",border:"1px solid #e8d9c3",borderRadius:99}}>
      {frequencyOptions.map(value=><button key={value} type="button" onClick={()=>void changeFrequency(value)} aria-pressed={frequency===value} style={{border:0,padding:"8px 12px",borderRadius:99,background:frequency===value?"#fffdf9":"transparent",boxShadow:frequency===value?"0 1px 4px #0001":"none",color:"#5d4c36",fontSize:11,fontWeight:frequency===value?800:500,cursor:"pointer",textTransform:"capitalize"}}>{value}</button>)}
     </div>
    </div>
    <div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:14}}>
     <input aria-label="Travel idea topic" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Example: Christmas Manali, solo groups, Kerala backwaters" style={{...input,flex:"1 1 280px"}}/>
     <button type="button" onClick={()=>void generate()} disabled={busy||loading} style={primary}>{busy?"Generating…":"✦ Generate 3 fresh ideas"}</button>
    </div>
    <p style={{fontSize:11,color:"#8a7b68",margin:"10px 0 0"}}>{last?"Last idea batch: "+new Date(last).toLocaleString():"No generated batch yet"} • Auto-refresh runs only when you visit Idea Studio, subject to Gemini free-tier limits.</p>
   </div>
   {error&&<div role="alert" style={{...panel,marginBottom:12,color:"#b42318",borderColor:"#f3c6c0"}}>{error}</div>}
   {notice&&<div role="status" style={{margin:"10px 0",fontSize:12,color:"#23764d"}}>{notice}</div>}
   {loading?<p>Loading saved ideas…</p>:ideas.length===0?<div style={{...panel,textAlign:"center",padding:35}}><h3>Start your idea board</h3><p style={{fontSize:13,color:"#746957"}}>Generate your first set of travel concepts. Each card can be edited, reordered, refreshed and saved as a content draft.</p></div>:
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,290px),1fr))",gap:14}}>
    {ideas.map((idea,i)=><article key={idea.id} style={{...panel,display:"flex",flexDirection:"column",gap:10,minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
       <div><span style={{background:"#30291f",color:"#fff",padding:"5px 10px",borderRadius:30,fontSize:10}}>#{i+1} {i===0?"Next up":""}</span></div>
       <div style={{display:"flex",gap:5}}>
        <button title="Move up" aria-label={"Move "+idea.title+" up"} style={action} onClick={()=>void mutate(idea.id,"up")} disabled={i===0}>↑</button>
        <button title="Move down" aria-label={"Move "+idea.title+" down"} style={action} onClick={()=>void mutate(idea.id,"down")} disabled={i===ideas.length-1}>↓</button>
        <button title="Edit" aria-label={"Edit "+idea.title} style={action} onClick={()=>setEditing({...idea})}>✎</button>
        <button title="Regenerate" aria-label={"Regenerate "+idea.title} style={action} disabled={busy} onClick={()=>void generate(idea)}>↻</button>
       </div>
      </div>
      <span style={{fontSize:10,letterSpacing:".12em",fontWeight:800,color:"#9a7134",textTransform:"uppercase"}}>{idea.format} • {idea.category}</span>
      <h3 style={{fontSize:17,lineHeight:1.35,margin:0}}>{idea.title}</h3>
      <p style={{fontSize:12,lineHeight:1.65,color:"#594f44",margin:0}}>{idea.concept}</p>
      <span style={{fontSize:10,background:"#f2e7d2",padding:"6px 9px",borderRadius:30,alignSelf:"start"}}>{idea.category}</span>
      <p style={{fontSize:11,color:"#837560",lineHeight:1.6,margin:0}}>AI-generated concept, not a verified trend. Check real performance separately.</p>
      <div style={{borderTop:"1px solid #e9dcc7",paddingTop:10}}>
       <div style={{display:"flex",gap:6,marginBottom:8}}>{(idea.hooks||[]).map((_,j)=><button key={j} aria-pressed={(hookTabs[idea.id]||0)===j} onClick={()=>setHookTabs(p=>({...p,[idea.id]:j}))} style={{...action,padding:"5px 9px",fontSize:10,background:(hookTabs[idea.id]||0)===j?"#a8752d":"#fffaf1",color:(hookTabs[idea.id]||0)===j?"#fff":"#80561d"}}>Hook {j+1}</button>)}</div>
       <strong style={{fontSize:11}}>Hook</strong><p style={{fontSize:12,lineHeight:1.6,margin:"5px 0"}}>{idea.hooks?.[hookTabs[idea.id]||0]||"Add a hook in Edit."}</p>
       <strong style={{fontSize:11}}>Story angle</strong><p style={{fontSize:12,lineHeight:1.6,margin:"5px 0 0"}}>{idea.angle}</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:"auto",paddingTop:8}}>
       <button style={primary} type="button" onClick={()=>void sendToPlanner(idea)}>Make draft</button>
       <button style={action} type="button" onClick={()=>void mutate(idea.id,"delete")}>Delete</button>
      </div>
     </article>)}
    </div>}
   {editing&&<div role="presentation" onClick={()=>setEditing(null)} style={{position:"fixed",inset:0,background:"#0008",zIndex:999,display:"grid",placeItems:"center",padding:16}}>
     <div role="dialog" aria-modal="true" aria-label="Edit Idea" onClick={e=>e.stopPropagation()} style={{...panel,width:"min(560px,100%)",maxHeight:"85vh",overflowY:"auto"}}>
       <h3 style={{marginTop:0}}>Edit idea</h3>
       {(["title","concept","angle","category","format"] as const).map(key=><label key={key} style={{display:"block",marginBottom:10,fontSize:12,textTransform:"capitalize"}}>{key}<textarea rows={key==="concept"||key==="angle"?3:1} value={editing[key]} onChange={e=>setEditing(p=>p?{...p,[key]:e.target.value}:p)} style={{...input,marginTop:5,resize:"vertical"}}/></label>)}
       {(editing.hooks||[]).map((h,i)=><label key={i} style={{display:"block",marginBottom:9,fontSize:12}}>Hook {i+1}<textarea value={h} rows={2} style={{...input,marginTop:5}} onChange={e=>setEditing(p=>p?{...p,hooks:p.hooks.map((v,j)=>i===j?e.target.value:v)}:p)}/></label>)}
       <div style={{display:"flex",gap:9}}><button type="button" style={primary} onClick={()=>void saveEdit()}>Save changes</button><button type="button" style={action} onClick={()=>setEditing(null)}>Cancel</button></div>
     </div>
   </div>}
 </section>;
}
