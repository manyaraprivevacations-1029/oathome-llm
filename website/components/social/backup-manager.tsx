"use client";
import {useState,type CSSProperties} from "react";
import {getSocialSupabase} from "@/lib/social/supabase-browser";

const dbTables=[
 "social_brand_profiles","social_content_items","social_trend_research",
 "social_reel_projects","social_idea_cards","social_idea_preferences","social_brand_logos"
] as const;
type TableName=typeof dbTables[number];
type Row=Record<string,unknown>;
type MediaFile={bucket:string;path:string;contentType:string;base64:string};
type Backup={
 format:"oat-social-ai-backup"; version:1; exportedAt:string; userId:string;
 tables:Record<string,Row[]>; files:MediaFile[];
 hash:string; excluded:string[];
};
const panel:CSSProperties={background:"#fffdfa",border:"1px solid #e7dfd1",borderRadius:14,padding:20,marginBottom:15};
const button:CSSProperties={border:0,borderRadius:9,background:"#a8752d",color:"#fff",padding:"11px 16px",fontWeight:700,cursor:"pointer"};
const maxBytes=100*1024*1024;
async function userId(){
 const {data,error}=await getSocialSupabase().auth.getUser();
 if(error||!data.user)throw new Error("Sign in again before backing up workspace data.");
 return data.user.id;
}
async function sha256(data:string){
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(data));
 return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");
}
function blobBase64(file:Blob):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");
  reader.onerror=()=>reject(new Error("Unable to read an image during backup."));
  reader.readAsDataURL(file);
 });
}
function base64Blob(encoded:string,contentType:string){
 const bytes=atob(encoded),arr=new Uint8Array(bytes.length);
 for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
 return new Blob([arr],{type:contentType});
}
async function getAllRows(table:TableName,uid:string):Promise<Row[]>{
 const sb=getSocialSupabase(),output:Row[]=[];
 for(let offset=0;offset<10000;offset+=500){
  const {data,error}=await sb.from(table).select("*").eq("user_id",uid).range(offset,offset+499);
  if(error)throw new Error("Backup could not read "+table+": "+error.message);
  const chunk=(data||[]) as Row[];output.push(...chunk);
  if(chunk.length<500)return output;
 }
 throw new Error(table+" has more than 10,000 records. A larger backup mechanism is needed.");
}
async function listAllFiles(bucket:string,uid:string):Promise<string[]>{
 const sb=getSocialSupabase(),paths:string[]=[];
 async function scan(folder:string,depth:number){
  if(depth>8)throw new Error("Media folder nesting exceeds backup limit.");
  for(let offset=0;offset<10000;offset+=100){
   const {data,error}=await sb.storage.from(bucket).list(folder,{limit:100,offset,sortBy:{column:"name",order:"asc"}});
   if(error)throw new Error("Backup cannot list "+bucket+": "+error.message);
   for(const file of data||[]){
    const path=folder+"/"+file.name;
    if(file.id)paths.push(path);
    else await scan(path,depth+1);
   }
   if((data||[]).length<100)break;
  }
 }
 await scan(uid,0);
 return paths;
}
async function createBackup(progress:(v:string)=>void):Promise<Backup>{
 const uid=await userId(),sb=getSocialSupabase();
 const tables:Record<string,Row[]>={};
 for(const table of dbTables){
  progress("Reading "+table+"…");
  tables[table]=await getAllRows(table,uid);
 }
 const files:MediaFile[]=[];
 let bytes=0;
 for(const bucket of ["social-creation-images","social-brand-logos"]){
  progress("Listing "+bucket+" assets…");
  const paths=await listAllFiles(bucket,uid);
  for(const [i,path] of paths.entries()){
   progress("Backing up "+bucket+" ("+(i+1)+"/"+paths.length+")");
   const {data,error}=await sb.storage.from(bucket).download(path);
   if(error||!data)throw new Error("Cannot back up "+path+". Export cancelled rather than creating an incomplete backup.");
   bytes+=data.size;
   if(bytes>maxBytes)throw new Error("Media exceeds 100 MB. No partial backup was created; use a larger backup mechanism.");
   files.push({bucket,path,contentType:data.type||"application/octet-stream",base64:await blobBase64(data)});
  }
 }
 const contents=JSON.stringify({tables,files});
 progress("Checking backup integrity…");
 return {format:"oat-social-ai-backup",version:1,exportedAt:new Date().toISOString(),userId:uid,
  tables,files,hash:await sha256(contents),excluded:["Auth passwords and sessions","Gemini/Vercel API keys","Instagram/Composio OAuth tokens and connection references","GitHub source code and Vercel infrastructure configuration"]};
}
async function validateBackup(file:File):Promise<Backup>{
 if(file.size>maxBytes*1.5)throw new Error("Backup file exceeds the safe browser import limit.");
 const contents=await file.text();
 let backup:Backup;
 try{backup=JSON.parse(contents) as Backup;}catch{throw new Error("This is not a valid JSON backup.");}
 if(!backup||backup.format!=="oat-social-ai-backup"||backup.version!==1||
    !backup.tables||typeof backup.tables!=="object"||!Array.isArray(backup.files)||
    typeof backup.hash!=="string"||typeof backup.userId!=="string"){
  throw new Error("Unsupported or incomplete OAT Social AI backup format.");
 }
 for(const name of dbTables)if(!Array.isArray(backup.tables[name]))throw new Error("Backup is missing "+name);
 if(backup.files.some(x=>typeof x.path!=="string"||typeof x.bucket!=="string"||typeof x.base64!=="string")){
  throw new Error("Backup media records are invalid.");
 }
 const hash=await sha256(JSON.stringify({tables:backup.tables,files:backup.files}));
 if(hash!==backup.hash)throw new Error("Backup verification failed. The data may have been modified or corrupted.");
 const uid=await userId();
 if(uid!==backup.userId)throw new Error("This backup belongs to a different account. Sign in with the original workspace account.");
 for(const name of dbTables)for(const row of backup.tables[name]){
  if(!row||row.user_id!==uid)throw new Error("Backup contains a record that does not belong to this account.");
 }
 for(const item of backup.files){
  if(!["social-creation-images","social-brand-logos"].includes(item.bucket)||!item.path.startsWith(uid+"/")
  ||item.path.includes("..")||item.base64.length>16_000_000)
   throw new Error("Backup contains an invalid or oversized asset path.");
 }
 return backup;
}
async function restoreMissing(backup:Backup,progress:(v:string)=>void){
 const sb=getSocialSupabase();
 // Never overwrite existing records or assets, and never restore OAuth sessions or credentials.
 let images=0,records=0,skipped=0;
 for(const [i,file] of backup.files.entries()){
  progress("Restoring private images "+(i+1)+"/"+backup.files.length);
  const blob=base64Blob(file.base64,file.contentType);
  const {error}=await sb.storage.from(file.bucket).upload(file.path,blob,{contentType:file.contentType,upsert:false});
  if(error){
    if(/already exists|duplicate|resource exists/i.test(error.message))skipped++;
    else throw new Error("Restore stopped at "+file.path+": "+error.message);
  }else images++;
 }
 // Data references are restored parent-first.
 for(const name of dbTables){
  progress("Restoring "+name+"…");
  const rows=backup.tables[name];
  if(!rows.length)continue;
  for(let i=0;i<rows.length;i+=100){
   const part=rows.slice(i,i+100);
   // Ignore existing rows by primary key and never overwrite newer records.
   const {data,error}=await sb.from(name).upsert(part,{onConflict:name==="social_idea_preferences"?"user_id":"id",ignoreDuplicates:true}).select(name==="social_idea_preferences"?"user_id":"id");
   if(error)throw new Error("Restore stopped at "+name+": "+error.message);
   records+=(data||[]).length;
   skipped+=part.length-(data||[]).length;
  }
 }
 window.dispatchEvent(new Event("oat-brand-logo-changed"));
 return {images,records,skipped};
}
export default function BackupManager(){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [backup,setBackup]=useState<Backup|null>(null);
 async function exportNow(){
  setBusy(true);setError("");setNotice("");
  try{
   const data=await createBackup(setProgress);
   const json=JSON.stringify(data);
   const blob=new Blob([json],{type:"application/json"});
   const url=URL.createObjectURL(blob),link=document.createElement("a");
   link.href=url;link.download="oat-social-ai-backup-"+new Date().toISOString().slice(0,10)+".json";
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),20000);
   setNotice("Backup downloaded successfully: "+data.files.length+" private assets and "+Object.values(data.tables).reduce((n,r)=>n+r.length,0)+" records. Store the file somewhere safe.");
  }catch(e){setError(e instanceof Error?e.message:"Backup failed. No partial file was downloaded.");}
  finally{setBusy(false);setProgress("");}
 }
 async function inspect(file:File|undefined){
  setBackup(null);setError("");setNotice("");
  if(!file)return;
  setBusy(true);setProgress("Verifying backup integrity…");
  try{const data=await validateBackup(file);setBackup(data);setNotice("Backup verified. This import will add missing records and images without overwriting existing data.");}
  catch(e){setError(e instanceof Error?e.message:"Cannot read backup.");}
  finally{setBusy(false);setProgress("");}
 }
 async function restore(){
  if(!backup)return;
  if(!window.confirm("Import missing records and images from this backup? Existing content will NOT be overwritten or deleted. This may take time."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const outcome=await restoreMissing(backup,setProgress);
   setNotice("Restore finished: "+outcome.records+" records, "+outcome.images+" images added; "+outcome.skipped+" items already existed. Reload the workspace to see restored content.");
  }catch(e){setError(e instanceof Error?e.message:"Restore stopped. Some missing data may have been added; nothing existing was overwritten.");}
  finally{setBusy(false);setProgress("");}
 }
 return <section style={{margin:"22px 0"}}>
  <h2 style={{fontSize:21,margin:"0 0 12px"}}>Workspace backups</h2>
  <section style={panel}>
   <h3 style={{fontSize:16,marginTop:0}}>Download full workspace data</h3>
   <p style={{fontSize:13,lineHeight:1.65,color:"#746957"}}>Includes your saved posts, carousels, reel plans, idea cards, Brand Brain settings, research, logo settings, recycled items and all private social image/logo files. The download stays on your device.</p>
   <button type="button" style={button} disabled={busy} onClick={()=>void exportNow()}>{busy?"Working…":"Download backup (.json)"}</button>
   <p style={{fontSize:12,color:"#916d3b",lineHeight:1.6}}>This is a data backup, not a website deployment backup. Passwords, Instagram tokens, API keys, GitHub code and Vercel configuration are intentionally excluded. Keep your GitHub repository as the source-code backup.</p>
  </section>
  <section style={panel}>
   <h3 style={{fontSize:16,marginTop:0}}>Restore missing workspace data</h3>
   <p style={{fontSize:13,lineHeight:1.65,color:"#746957"}}>Select a previously downloaded OAT Social AI backup to check its integrity. Importing adds missing records only. It does not replace or delete newer records, recreate Instagram connections, or restore the website deployment.</p>
   <input type="file" accept=".json,application/json" disabled={busy} onChange={e=>void inspect(e.target.files?.[0])}/>
   {backup&&<div style={{marginTop:12,padding:13,background:"#f4edde",borderRadius:10}}>
    <strong>Verified backup: {new Date(backup.exportedAt).toLocaleString()}</strong>
    <p style={{fontSize:12}}>Records: {Object.values(backup.tables).reduce((n,r)=>n+r.length,0)} · Images: {backup.files.length}</p>
    <button type="button" disabled={busy} style={button} onClick={()=>void restore()}>Import missing data</button>
   </div>}
  </section>
  {progress&&<p role="status" style={{color:"#8a5d20"}}>{progress}</p>}
  {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
  {notice&&<p role="status" style={{color:"#227046"}}>{notice}</p>}
 </section>;
}