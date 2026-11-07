"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

type Account = { id:string; username:string|null; accountType:string|null; expiresAt:string|null; connectedAt:string };
type Status = { configured:boolean; connected:boolean; account:Account|null; connectionStatus?:string };

const shell:CSSProperties={minHeight:"calc(100vh - 70px)",padding:"8px 0 32px",background:"transparent",color:"#30291f"};
const panel:CSSProperties={background:"#fff",border:"1px solid #e7dfd1",borderRadius:15,padding:22};
const primary:CSSProperties={padding:"11px 16px",border:0,borderRadius:8,background:"#a8752d",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"};
const secondary:CSSProperties={padding:"10px 14px",border:"1px solid #ded5c6",borderRadius:8,background:"#fff",color:"#8a5d20",fontSize:12,fontWeight:700,cursor:"pointer"};

export default function InstagramManagerPage(){
  const router=useRouter();
  const [status,setStatus]=useState<Status|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const refresh=useCallback(async()=>{
    const supabase=getSocialSupabase();
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){router.replace("/social/login");return;}
    const response=await fetch("/api/social/instagram/status",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Could not check Instagram connection.");
    setStatus(data as Status);
  },[router]);

  useEffect(()=>{
    let alive=true;
    const query=new URLSearchParams(window.location.search);
    const result=query.get("connection");
    if(result==="connected")setNotice("Instagram connected successfully through Composio.");
    else if(result)setError(result==="cancelled"?"Instagram connection was cancelled.":"Instagram connection failed ("+result.replaceAll("_"," ")+"). Check your Composio Instagram auth configuration.");
    void refresh().catch(e=>{if(alive)setError(e instanceof Error?e.message:"Could not load account status.");}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[refresh]);

  async function handleRefresh(){
    setRefreshing(true);setError("");setNotice("");
    try{
      await refresh();
      setNotice("Instagram connection status refreshed successfully.");
    }catch(e){
      setError(e instanceof Error?e.message:"Refresh failed. Please try again.");
    }finally{
      setRefreshing(false);
    }
  }

  async function connect(){
    setBusy(true);setError("");setNotice("");
    try{
      const {data:{session}}=await getSocialSupabase().auth.getSession();
      if(!session)throw new Error("Your Social AI session expired. Please sign in again.");
      const response=await fetch("/api/social/instagram/connect",{method:"POST",headers:{Authorization:"Bearer "+session.access_token}});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not start Instagram connection.");
      if(typeof data.authorizationUrl!=="string")throw new Error("Composio did not return an authorization link.");
      window.location.assign(data.authorizationUrl);
    }catch(e){setError(e instanceof Error?e.message:"Could not start Instagram connection.");setBusy(false);}
  }

  async function disconnect(){
    if(!window.confirm("Disconnect Instagram from OAT Social AI? This also revokes the Composio connection."))return;
    setBusy(true);setError("");setNotice("");
    try{
      const {data:{session}}=await getSocialSupabase().auth.getSession();
      if(!session)throw new Error("Please sign in again.");
      const response=await fetch("/api/social/instagram/disconnect",{method:"POST",headers:{Authorization:"Bearer "+session.access_token}});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not disconnect Instagram.");
      setNotice("Instagram disconnected from this workspace.");await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not disconnect Instagram.");}
    finally{setBusy(false);}
  }

  return <main className="social-theme" style={shell}>
    <header style={{marginBottom:22}}>
      <Link href="/social" style={{color:"#a8752d",fontSize:12,textDecoration:"none"}}>← Social AI workspace</Link>
      <h1 style={{fontSize:34,margin:"12px 0 5px"}}>Instagram Manager</h1>
      <p style={{fontSize:13,color:"#746957"}}>Connect Instagram securely through Composio's managed authorization.</p>
    </header>
    {error&&<p role="alert" style={{padding:12,borderRadius:9,background:"#fff0ef",color:"#b42318",fontSize:12}}>{error}</p>}
    {notice&&<p role="status" style={{padding:12,borderRadius:9,background:"#eaf8f0",color:"#137b4e",fontSize:12}}>{notice}</p>}
    <section style={{...panel,marginBottom:15}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:".12em",color:status?.connected?"#137b4e":"#9b6a10"}}>{loading?"CHECKING CONNECTION":status?.connected?"CONNECTED":"NOT CONNECTED"}</div>
          <h2 style={{fontSize:20,margin:"9px 0 5px"}}>{status?.connected&&status.account?.username?"@"+status.account.username:"Connect Instagram"}</h2>
          <p style={{fontSize:12,color:"#746957",lineHeight:1.7,margin:0}}>{status?.connected?"Your Instagram professional account is linked to this Social AI workspace.":"Connect an Instagram Business or Creator account using Composio."}</p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {status?.connected?<button disabled={busy} onClick={()=>void disconnect()} style={secondary}>{busy?"Working…":"Disconnect"}</button>:<button disabled={busy||loading||status?.configured===false} onClick={()=>void connect()} style={{...primary,opacity:(busy||loading||status?.configured===false)?0.55:1}}>{busy?"Connecting…":"Connect Instagram"}</button>}
          <button disabled={loading||busy||refreshing} onClick={()=>void handleRefresh()} style={{...secondary,opacity:(loading||busy||refreshing)?0.6:1}}>{refreshing?"Refreshing…":"Refresh"}</button>
        </div>
      </div>
      {status?.connected&&status.account&&<div style={{marginTop:18,paddingTop:15,borderTop:"1px solid #e5edf6",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,fontSize:11,color:"#526b87"}}>
        <div><b>Account type</b><div style={{marginTop:4}}>{status.account.accountType||"Professional"}</div></div>
        <div><b>Composio connection</b><div style={{marginTop:4}}>{status.account.id}</div></div>
        <div><b>Connected</b><div style={{marginTop:4}}>{new Date(status.account.connectedAt).toLocaleString()}</div></div>
      </div>}
    </section>
    {status?.configured===false&&<section style={{...panel,marginBottom:15,borderColor:"#f0d8a5"}}>
      <h2 style={{fontSize:16,margin:"0 0 8px"}}>Composio setup required</h2>
      <p style={{fontSize:12,color:"#746957",lineHeight:1.8,margin:"0 0 10px"}}>The Instagram connection provider must be configured in the Vercel Production environment. Keep both values server-side.</p>
      <p style={{fontSize:11,color:"#746957",margin:0}}>Required variables: COMPOSIO_API_KEY and COMPOSIO_INSTAGRAM_AUTH_CONFIG_ID.</p>
    </section>}
    <section style={panel}>
      <h2 style={{fontSize:16,margin:"0 0 12px"}}>Connection safeguards</h2>
      <ul style={{fontSize:12,color:"#746957",lineHeight:1.9,paddingLeft:20,margin:0}}>
        <li>Only Instagram Business and Creator accounts are supported by the Composio toolkit.</li>
        <li>Composio manages provider credentials; OAT Social AI stores only the connected-account reference.</li>
        <li>Publishing, messaging and other write actions remain disabled until separately implemented and approved.</li>
      </ul>
    </section>
    <p style={{fontSize:11,color:"#71839a",marginTop:15}}>OAT Social AI never asks for your Instagram or Facebook password.</p>
  </main>;
}
