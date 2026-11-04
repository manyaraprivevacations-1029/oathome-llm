"use client";

import { useEffect, useState, type FormEvent, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";
import { generateSocialDraft } from "@/lib/social/generate";

type Item = { id:string; title:string; content_type:"reel"|"carousel"|"post"|"story"; status:"draft"|"in_review"|"approved"|"rejected"|"scheduled"|"published"; caption:string|null; script:string|null; created_at:string };
const shell:CSSProperties={minHeight:"100vh",padding:"34px clamp(18px,5vw,64px)",background:"#f4f8fd",color:"#10264a"};
const panel:CSSProperties={border:"1px solid #dce8f5",borderRadius:15,padding:21,background:"#ffffff"};
const label:CSSProperties={display:"grid",gap:7,color:"#5d708a",fontSize:10,letterSpacing:".09em"};
const field:CSSProperties={width:"100%",boxSizing:"border-box",padding:"11px 12px",border:"1px solid #cbdced",borderRadius:8,background:"#ffffff",color:"#142b4f",fontSize:13};
const primary:CSSProperties={padding:"10px 14px",border:0,borderRadius:8,background:"#0878d8",color:"white",fontWeight:700,cursor:"pointer"};
const muted:CSSProperties={padding:"8px 11px",border:"1px solid #cbdced",borderRadius:8,background:"#edf5fc",color:"#174a7c",fontSize:11,cursor:"pointer"};

export default function ContentPlannerPage(){
  const router=useRouter();
  const [items,setItems]=useState<Item[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [title,setTitle]=useState("");
  const [kind,setKind]=useState<Item["content_type"]>("reel");
  const [caption,setCaption]=useState("");
  const [script,setScript]=useState("");
  const [filter,setFilter]=useState("all");
  const [generating,setGenerating]=useState(false);

  async function refresh(){
    const supabase=getSocialSupabase();
    const {data:auth}=await supabase.auth.getUser();
    if(!auth.user){router.replace("/social/login");return;}
    const {data,error:readError}=await supabase.from("social_content_items").select("id,title,content_type,status,caption,script,created_at").eq("user_id",auth.user.id).order("created_at",{ascending:false}).limit(100);
    if(readError)throw readError;
    setItems((data||[]) as Item[]);
  }
  useEffect(()=>{let alive=true;(async()=>{try{await refresh();}catch(e){if(alive)setError(e instanceof Error?e.message:"Unable to load content.");}finally{if(alive)setLoading(false);}})();return()=>{alive=false;};},[router]);

  async function generateCaption(){
    if(!title.trim()){setError("Enter a draft title first.");return;}
    setGenerating(true);setError("");setNotice("");
    try{
      const result=await generateSocialDraft("Write one ready-to-use Instagram "+kind+" caption for this content title: "+title+". Creative notes or verified facts supplied: "+(script.trim()||"No package facts supplied; do not invent price, dates, inclusions or availability. Use a general enquiry CTA.")+". Existing draft to improve, if any: "+(caption.trim()||"None")+". Write natural conversational Telugu-English suitable for Hyderabad travellers. Return ONLY the caption as plain text, never JSON, never a field label, and never Markdown code fences. Use one engaging opening hook, 2-4 short and useful sentences, one clear enquiry CTA, and 3-5 relevant hashtags. Keep it around 60-90 words. Do not repeat any sentence, phrase, idea, CTA or hashtag. Avoid awkward literal translations and repetitive filler. Do not invent travel or package facts.");
      setCaption(result);setNotice("Caption generated with OWN and saved into the draft form. Review before saving.");
    }catch(e){setError(e instanceof Error?e.message:"Caption generation failed.");}
    finally{setGenerating(false);}
  }

  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setNotice("");
    try{
      const supabase=getSocialSupabase();const {data:auth}=await supabase.auth.getUser();
      if(!auth.user)throw new Error("Please sign in again.");
      const {error:writeError}=await supabase.from("social_content_items").insert({user_id:auth.user.id,title:title.trim(),content_type:kind,status:"draft",caption:caption.trim()||null,script:script.trim()||null});
      if(writeError)throw writeError;
      setTitle("");setCaption("");setScript("");setNotice("Draft saved to your private content library.");await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not save draft.");}
    finally{setBusy(false);}
  }
  async function setStatus(id:string,status:Item["status"]){
    setError("");setNotice("");
    try{const {error:updateError}=await getSocialSupabase().from("social_content_items").update({status,updated_at:new Date().toISOString(),...(status==="approved"?{approved_at:new Date().toISOString()}:{})}).eq("id",id);if(updateError)throw updateError;setNotice(status==="approved"?"Marked approved for internal use. This does not publish to Instagram.":"Content status updated.");await refresh();}
    catch(e){setError(e instanceof Error?e.message:"Could not update status.");}
  }
  const visible=filter==="all"?items:items.filter(x=>x.status===filter);
  const statusColor=(s:string)=>s==="approved"?"#0878d8":s==="rejected"?"#b42318":s==="in_review"?"#986b16":"#8aa4bf";

  return <main style={shell}>
    <header style={{marginBottom:24}}><Link href="/social" style={{color:"#0878d8",fontSize:12,textDecoration:"none"}}>← Social AI workspace</Link><h1 style={{fontSize:34,letterSpacing:"-.04em",margin:"12px 0 5px"}}>Content Planner</h1><p style={{color:"#60738d",fontSize:13,margin:0}}>Create drafts, organise ideas and approve content before it leaves your workspace.</p></header>
    <section style={{...panel,marginBottom:18}}>
      <h2 style={{fontSize:17,margin:"0 0 16px"}}>Create a content draft</h2>
      <form onSubmit={create} style={{display:"grid",gap:13}}>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
          <label style={label}>DRAFT TITLE<input required value={title} onChange={e=>setTitle(e.target.value)} style={field} placeholder="e.g. Manali winter trip announcement"/></label>
          <label style={label}>FORMAT<select value={kind} onChange={e=>setKind(e.target.value as Item["content_type"])} style={field}><option value="reel">Reel</option><option value="carousel">Carousel</option><option value="post">Post</option><option value="story">Story</option></select></label>
        </div>
        <label style={label}>CAPTION<textarea rows={4} value={caption} onChange={e=>setCaption(e.target.value)} style={{...field,resize:"vertical"}} placeholder="Write a caption draft…"/></label><div><button type="button" disabled={generating||busy} onClick={()=>void generateCaption()} style={primary}>{generating?"Generating with OWN…":"Generate caption with OWN"}</button></div>
        <label style={label}>SCRIPT / CREATIVE NOTES<textarea rows={5} value={script} onChange={e=>setScript(e.target.value)} style={{...field,resize:"vertical"}} placeholder="Add reel script, slide outline or production notes…"/></label>
        <div><button disabled={busy} style={primary}>{busy?"Saving…":"Save draft"}</button></div>
      </form>
      <p style={{fontSize:10,color:"#71839a",lineHeight:1.6,margin:"12px 0 0"}}>This first version stores and tracks your drafts. It does not generate media, schedule posts or publish to Instagram.</p>
    </section>
    <section style={panel}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:15}}><h2 style={{fontSize:17,margin:0}}>Your content library <span style={{fontSize:11,color:"#71839a"}}>({items.length})</span></h2><select value={filter} onChange={e=>setFilter(e.target.value)} style={{...field,width:"auto"}}><option value="all">All statuses</option><option value="draft">Draft</option><option value="in_review">In review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
      {error&&<p role="alert" style={{color:"#b42318",fontSize:12}}>{error}</p>}{notice&&<p role="status" style={{color:"#0878d8",fontSize:12}}>{notice}</p>}
      {loading?<p style={{color:"#5d708a",fontSize:12}}>Loading drafts…</p>:visible.length===0?<p style={{color:"#60738d",fontSize:12}}>No drafts here yet. Create your first one above.</p>:<div style={{display:"grid",gap:11}}>
        {visible.map(item=><article key={item.id} style={{border:"1px solid #dce8f5",borderRadius:11,padding:15,background:"#f7fbff"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h3 style={{fontSize:14,margin:"0 0 5px"}}>{item.title}</h3><span style={{fontSize:10,color:"#60738d"}}>{item.content_type.toUpperCase()} · {new Date(item.created_at).toLocaleDateString()}</span></div><span style={{fontSize:10,color:statusColor(item.status),border:"1px solid #c6def5",borderRadius:20,padding:"5px 8px",height:"fit-content"}}>{item.status.replace("_"," ").toUpperCase()}</span></div>
          {item.caption&&<p style={{fontSize:12,color:"#314968",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{item.caption}</p>}
          {item.script&&<details style={{fontSize:11,color:"#62758e"}}><summary style={{cursor:"pointer"}}>View script / notes</summary><p style={{whiteSpace:"pre-wrap",lineHeight:1.7}}>{item.script}</p></details>}
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}>
            {item.status==="draft"&&<button style={muted} onClick={()=>void setStatus(item.id,"in_review")}>Send to review</button>}
            {item.status==="in_review"&&<><button style={primary} onClick={()=>void setStatus(item.id,"approved")}>Approve draft</button><button style={muted} onClick={()=>void setStatus(item.id,"rejected")}>Reject</button></>}
            {item.status==="rejected"&&<button style={muted} onClick={()=>void setStatus(item.id,"draft")}>Return to draft</button>}
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
