"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { listCreations, setRecycled, permanentlyDeleteCreation, signedCreationImage, type SavedCreation } from "@/lib/social/creations";
const card:CSSProperties={border:"1px solid #e5dccc",borderRadius:13,padding:18,background:"#fffdfa"};
const button:CSSProperties={border:0,borderRadius:8,padding:"10px 13px",background:"#a8752d",color:"#fff",fontWeight:700,cursor:"pointer"};
export default function CreationLibrary({recycled}:{recycled:boolean}){
const [items,setItems]=useState<SavedCreation[]>([]),[selected,setSelected]=useState<SavedCreation|null>(null);
const [loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
const [images,setImages]=useState<Record<string,string>>({});
useEffect(()=>{let active=true;listCreations(recycled).then(v=>{if(active)setItems(v)}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load creations")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[recycled]);
useEffect(()=>{if(!selected)return;let active=true;const slides=Array.isArray(selected.metadata?.slides)?selected.metadata.slides as Array<{image_path?:string}>:[];
const paths=[selected.asset_path,...slides.map(s=>s.image_path)].filter((v):v is string=>!!v);
Promise.all(paths.map(async path=>[path,await signedCreationImage(path)] as const)).then(v=>{if(active)setImages(Object.fromEntries(v.filter(x=>x[1])) as Record<string,string>)}).catch(()=>{});
return()=>{active=false}},[selected]);
async function act(item:SavedCreation,action:"delete"|"restore"|"purge"){
if(action==="purge"&&!window.confirm("Permanently remove this creation and its uploaded images? This cannot be undone."))return;
setBusy(item.id);setError("");setNotice("");
try{if(action==="purge")await permanentlyDeleteCreation(item);else await setRecycled(item.id,action==="delete");
setItems(v=>v.filter(x=>x.id!==item.id));if(selected?.id===item.id)setSelected(null);
setNotice(action==="delete"?"Moved to Recycle Bin":action==="restore"?"Restored to Creations":"Permanently deleted");
}catch(e){setError(e instanceof Error?e.message:"Action failed")}finally{setBusy("")}}
return <main className="social-theme" style={{padding:"34px clamp(18px,5vw,64px)",background:"#f6f2e9",minHeight:"100vh",color:"#30291f"}}>
<span style={{fontSize:10,color:"#a8752d",fontWeight:800}}>OAT SOCIAL AI · LIBRARY</span>
<h1 style={{fontSize:32,margin:"10px 0"}}>{recycled?"Recycle Bin":"Creations"}</h1>
<p style={{fontSize:13,color:"#706454"}}>{recycled?"Restore deleted work or permanently remove it.":"Saved Instagram posts and carousels from your studio."}</p>
{error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}{notice&&<p role="status" style={{color:"#147b45"}}>{notice}</p>}
{loading?<p>Loading…</p>:items.length===0?<section style={card}>No {recycled?"deleted":"saved"} creations yet. <a href={recycled?"/social/creations":"/social/posts"}>{recycled?"View Creations":"Create a post"}</a></section>:
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:15}}>{items.map(item=><article style={card} key={item.id}>
<span style={{fontSize:11,color:"#a8752d",textTransform:"uppercase"}}>{item.content_type} · {new Date(item.created_at).toLocaleDateString()}</span>
<h2 style={{fontSize:18,overflowWrap:"anywhere"}}>{item.title}</h2><p style={{fontSize:12,color:"#776a59",lineHeight:1.6}}>{(item.caption||"").slice(0,180)}{(item.caption||"").length>180?"…":""}</p>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={button} onClick={()=>setSelected(item)}>View</button>
{recycled?<><button style={button} disabled={busy===item.id} onClick={()=>void act(item,"restore")}>Restore</button><button style={{...button,background:"#a12c20"}} disabled={busy===item.id} onClick={()=>void act(item,"purge")}>Delete forever</button></>:<button style={{...button,background:"#a12c20"}} disabled={busy===item.id} onClick={()=>void act(item,"delete")}>Delete</button>}</div></article>)}</div>}
{selected&&<div style={{position:"fixed",inset:0,zIndex:1000,background:"#0009",display:"grid",placeItems:"center",padding:16}} onClick={()=>setSelected(null)}>
<section role="dialog" aria-modal="true" aria-label="Creation details" onClick={e=>e.stopPropagation()} style={{...card,maxHeight:"90vh",overflowY:"auto",width:"min(660px,100%)"}}>
<button style={{...button,float:"right"}} onClick={()=>setSelected(null)}>Close</button><h2>{selected.title}</h2>
{selected.asset_path&&images[selected.asset_path]&&<img src={images[selected.asset_path]} alt="Saved post" style={{width:"100%",maxHeight:420,objectFit:"contain"}}/>}
<h3>Caption</h3><p style={{whiteSpace:"pre-wrap"}}>{selected.caption}</p>
<h3>Hashtags</h3><p style={{whiteSpace:"pre-wrap"}}>{String(selected.metadata?.hashtags||"")}</p>
{Array.isArray(selected.metadata?.slides)&&(selected.metadata.slides as Array<{title:string;body:string;image_path?:string}>).map((slide,i)=><section key={i}><h3>{slide.title}</h3><p>{slide.body}</p>{slide.image_path&&images[slide.image_path]&&<img src={images[slide.image_path]} alt={"Slide "+(i+1)} style={{width:"100%",maxHeight:350,objectFit:"contain"}}/>}</section>)}
</section></div>}
</main>}
