"use client";
import {useEffect,useRef,useState} from "react";
import {getSocialSupabase} from "@/lib/social/supabase-browser";
const DATABASE="oat-social-ai-drafts";
const STORE="drafts";
function openDatabase():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DATABASE,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 });
}
async function accessDraft<T>(key:string,value?:T):Promise<T|undefined>{
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,value===undefined?"readonly":"readwrite");
  const req=value===undefined?tx.objectStore(STORE).get(key):tx.objectStore(STORE).put(value,key);
  req.onsuccess=()=>resolve(req.result as T|undefined);req.onerror=()=>reject(req.error);
  tx.oncomplete=()=>db.close();tx.onerror=()=>db.close();
 });
}
export function useStudioDraft<T>(studio:string,draft:T,restore:(saved:T)=>void){
 const [loaded,setLoaded]=useState(false),[message,setMessage]=useState("");
 const pending=useRef<number|undefined>(undefined);
 const writes=useRef(Promise.resolve());
 const key=useRef(""),latest=useRef(draft),restoreRef=useRef(restore);
 latest.current=draft;restoreRef.current=restore;
 useEffect(()=>{
  let active=true;
  key.current="";setLoaded(false);
  (async()=>{
   try{
    const {data}=await getSocialSupabase().auth.getUser();
    if(!active)return;
    if(!data.user)throw new Error("Sign in to restore your private draft.");
    const userKey=data.user.id+":"+studio;key.current=userKey;
    const saved=await accessDraft<T>(userKey);
    if(active&&saved){restoreRef.current(saved);setMessage("Your unfinished "+studio+" draft was restored.");}
   }catch(e){if(active)setMessage("Draft recovery unavailable in this browser. "+(e instanceof Error?e.message:""));}
   finally{if(active)setLoaded(true);}
  })();
  return()=>{active=false;};
 },[studio]);
 function persist(value:T) {
  const draftKey=key.current;
  if(!draftKey)return Promise.resolve();
  const next=writes.current.catch(()=>{}).then(()=>accessDraft(draftKey,value)).then(()=>{});
  writes.current=next;
  return next;
 }
 async function replace(value:T) {
  if(pending.current!==undefined)window.clearTimeout(pending.current);
  latest.current=value;
  try {await persist(value);setMessage("New draft ready.");}
  catch {setMessage("The draft was reset, but could not be saved on this device.");}
 }
 useEffect(()=>{
  if(!loaded||!key.current)return;
  const id=window.setTimeout(()=>{void persist(latest.current).catch(()=>setMessage("Could not auto-save this draft on this device."));},350);
  pending.current=id;
  return()=>{window.clearTimeout(id);void persist(latest.current).catch(()=>{});};
 },[loaded,draft]);
 async function discard(){if(!key.current)return;const db=await openDatabase();await new Promise<void>((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");const req=tx.objectStore(STORE).delete(key.current);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();});setMessage("Autosaved draft cleared.");}
 return {loaded,message,discard,replace};
}
