"use client";
import { useSearchParams } from "next/navigation";
export default function SocialSettingsPage(){
 const params=useSearchParams(); const tab=params.get("tab"); const title=tab==="billing"?"Billing":tab==="team"?"Team":"Settings";
 return <section style={{maxWidth:820,margin:"28px auto",padding:28,border:"1px solid #e7dfd1",borderRadius:16,background:"#fffdf8",color:"#30291f"}}><span style={{fontSize:10,letterSpacing:".16em",color:"#a8752d"}}>CONFIGURE</span><h2 style={{fontFamily:"Georgia,serif",fontSize:30,margin:"10px 0"}}>{title}</h2><p style={{color:"#746957",lineHeight:1.7}}>This workspace section is planned but is not available yet. Your existing account connection and social content tools are unaffected.</p><span style={{display:"inline-block",marginTop:12,padding:"7px 11px",border:"1px solid #e7dfd1",borderRadius:20,fontSize:10,letterSpacing:".1em",color:"#a8752d"}}>COMING SOON</span></section>;
}