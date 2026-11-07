"use client";
import {useEffect,useState,type CSSProperties} from "react";
import {getSocialSupabase} from "@/lib/social/supabase-browser";
import {BrandLogo,logoBucket,logoPosition} from "@/lib/social/brand-logo";
const card:CSSProperties={background:"#fffdfa",border:"1px solid #e7dfd1",borderRadius:14,padding:19};
const btn:CSSProperties={border:0,borderRadius:9,padding:"10px 14px",background:"#a8752d",color:"#fff",fontWeight:700,cursor:"pointer"};
export default function LogosPage(){
 const [items,setItems]=useState<BrandLogo[]>([]),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [title,setTitle]=useState("ON A TRIP HOLIDAYS");
 const [selected,setSelected]=useState<File|null>(null);
 const [urls,setUrls]=useState<Record<string,string>>({});
 const load=async()=>{
  const sb=getSocialSupabase(),auth=await sb.auth.getUser();if(!auth.data.user)throw new Error("Sign in to manage your logos.");
  const {data,error}=await sb.from("social_brand_logos").select("*").eq("user_id",auth.data.user.id).order("created_at",{ascending:false});
  if(error)throw error;
  const rows=(data||[]) as BrandLogo[];setItems(rows);
  const links=await Promise.all(rows.map(async row=>{
   const {data}=await sb.storage.from(logoBucket).createSignedUrl(row.asset_path,3600);
   return [row.id,data?.signedUrl||""] as const;
  }));
  setUrls(Object.fromEntries(links));
 };
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:"Failed loading logos"));},[]);
 const update=async(id:string,changes:Partial<BrandLogo>)=>{
  setBusy(true);setError("");setNotice("");
  try{
   const sb=getSocialSupabase(),auth=await sb.auth.getUser();
   if(!auth.data.user)throw new Error("Your session expired.");
   const uid=auth.data.user.id;
   if(changes.is_primary){
    const {error:clearError}=await sb.from("social_brand_logos").update({is_primary:false}).eq("user_id",uid);
    if(clearError)throw clearError;
   }
   const {error}=await sb.from("social_brand_logos").update({...changes,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",uid);
   if(error)throw error;
   await load();window.dispatchEvent(new Event("oat-brand-logo-changed"));
   setNotice("Logo preferences updated.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to update logo");}finally{setBusy(false);}
 };
 const upload=async()=>{
  if(!selected)return setError("Choose a logo first.");
  if(!["image/png","image/webp","image/jpeg"].includes(selected.type))return setError("Choose a PNG, WebP or JPG logo.");
  if(selected.size>4*1024*1024)return setError("Logo file must be smaller than 4 MB.");
  setBusy(true);setError("");setNotice("");
  try{
   const sb=getSocialSupabase(),auth=await sb.auth.getUser();if(!auth.data.user)throw new Error("Sign in again.");
   const uid=auth.data.user.id,id=crypto.randomUUID(),ext=selected.type==="image/png"?"png":selected.type==="image/webp"?"webp":"jpg";
   const path=uid+"/"+id+"."+ext;
   const {error:uploadError}=await sb.storage.from(logoBucket).upload(path,selected,{contentType:selected.type,upsert:false});
   if(uploadError)throw uploadError;
   const {error:insertError}=await sb.from("social_brand_logos").insert({id,user_id:uid,title:title.trim()||"Primary logo",asset_path:path,enabled:true,is_primary:items.length===0,size_percent:20,placement:"bottom-right"});
   if(insertError){await sb.storage.from(logoBucket).remove([path]);throw insertError;}
   setSelected(null);await load();window.dispatchEvent(new Event("oat-brand-logo-changed"));setNotice("Logo saved and ready for posts, carousels and reel briefs.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to upload logo.");}finally{setBusy(false);}
 };
 const remove=async(row:BrandLogo)=>{
  if(!window.confirm("Delete this logo from your workspace? Previously exported and published artwork will not change."))return;
  setBusy(true);setError("");
  try{
   const sb=getSocialSupabase(),auth=await sb.auth.getUser();if(!auth.data.user)throw new Error("Sign in again.");
   const {error}=await sb.from("social_brand_logos").delete().eq("id",row.id).eq("user_id",auth.data.user.id);
   if(error)throw error;
   await sb.storage.from(logoBucket).remove([row.asset_path]);
   await load();window.dispatchEvent(new Event("oat-brand-logo-changed"));
   setNotice("Logo removed.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to delete logo");}finally{setBusy(false);}
 };
 return <main className="social-theme" style={{padding:"8px 0 32px",color:"#30291f"}}>
   <div style={{margin:"14px 0 21px"}}><span style={{color:"#a8752d",fontSize:10,fontWeight:800,letterSpacing:".12em"}}>OAT SOCIAL AI · BRAND ASSETS</span><h1 style={{fontSize:31,margin:"6px 0"}}>Logos</h1><p style={{fontSize:13,color:"#736957"}}>Upload your brand mark once and choose which logo appears on future post images, carousels and reel production briefs.</p></div>
   {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
   {notice&&<p role="status" style={{color:"#1d7447"}}>{notice}</p>}
   <section style={{...card,marginBottom:18,display:"grid",gap:13}}>
    <h2 style={{fontSize:17,margin:0}}>Add a logo</h2>
    <label style={{display:"grid",gap:7,fontSize:12}}>Logo name<input style={{padding:11,border:"1px solid #ded5c6",borderRadius:9}} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label style={{fontSize:12}}>Logo image (PNG with transparency recommended)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setSelected(e.target.files?.[0]||null)} style={{display:"block",marginTop:7}}/></label>
    <div><button style={btn} disabled={busy} onClick={()=>void upload()}>{busy?"Saving…":"Save logo"}</button></div>
   </section>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,300px),1fr))",gap:15}}>
   {items.map(row=><section key={row.id} style={card}>
     <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><strong>{row.title}</strong>{row.is_primary&&<span style={{fontSize:10,color:"#236d44"}}>PRIMARY</span>}</div>
     <div style={{position:"relative",width:"100%",aspectRatio:"4/5",background:"linear-gradient(120deg,#e6d8c1,#d1dbdc)",borderRadius:11,margin:"12px 0",overflow:"hidden"}}>
      {urls[row.id]&&<img src={urls[row.id]} alt={row.title} style={{...logoPosition(row.placement),width:row.size_percent+"%",maxHeight:"20%",objectFit:"contain"}}/>}
     </div>
     <label style={{display:"block",fontSize:12}}>Position
      <select value={row.placement} disabled={busy} onChange={e=>void update(row.id,{placement:e.target.value as BrandLogo["placement"]})} style={{width:"100%",padding:9,borderRadius:8,marginTop:5}}>
       {["bottom-right","bottom-left","top-right","top-left"].map(x=><option key={x} value={x}>{x.replace("-"," ")}</option>)}
      </select>
     </label>
     <label style={{display:"block",fontSize:12,margin:"10px 0"}}>Logo width · {row.size_percent}%<input type="range" min={8} max={45} step={1} value={row.size_percent} disabled={busy} onChange={e=>setItems(a=>a.map(x=>x.id===row.id?{...x,size_percent:Number(e.target.value)}:x))} onPointerUp={()=>void update(row.id,{size_percent:row.size_percent})} onKeyUp={()=>void update(row.id,{size_percent:row.size_percent})} style={{width:"100%"}}/></label>
     <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {!row.is_primary&&<button style={btn} disabled={busy} onClick={()=>void update(row.id,{is_primary:true,enabled:true})}>Use as primary</button>}
      <button style={{...btn,background:"#fff",color:"#7c572a",border:"1px solid #d7c7ae"}} disabled={busy} onClick={()=>void update(row.id,{enabled:!row.enabled})}>{row.enabled?"Disable":"Enable"}</button>
      <button style={{...btn,background:"#fff",color:"#a12c20",border:"1px solid #d9b2ad"}} disabled={busy} onClick={()=>void remove(row)}>Delete</button>
     </div>
   </section>)}
   </div>
   <p style={{fontSize:12,lineHeight:1.7,color:"#736957",marginTop:19}}>The logo is burned into newly downloaded and published post/carousel images. Reel Studio creates planning briefs rather than finished videos, so it attaches your logo reference to the production brief for your editor. Existing Instagram posts cannot be updated retroactively.</p>
 </main>;
}