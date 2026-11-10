"use client";
import type {CSSProperties,PointerEvent} from "react";
import Link from "next/link";
import {type BrandLogo,type StudioLogoPlacement,studioLogoCss} from "@/lib/social/brand-logo";
const subtle:CSSProperties={fontSize:12,color:"#756b5e"};
export function StudioLogoControl({logo,placement,onChange,label="Add logo"}:{logo:BrandLogo|null;placement:StudioLogoPlacement;onChange:(next:StudioLogoPlacement)=>void;label?:string}){
 function move(event:PointerEvent<HTMLDivElement>){
  if(!placement.enabled||!logo?.url)return;
  const box=event.currentTarget.getBoundingClientRect();
  const x=Math.round(Math.max(placement.size/2,Math.min(100-placement.size/2,(event.clientX-box.left)/box.width*100)));
  const y=Math.round(Math.max(5,Math.min(95,(event.clientY-box.top)/box.height*100)));
  onChange({...placement,x,y});
 }
 return <div style={{border:"1px solid #ded5c6",borderRadius:11,padding:13,background:"#fffaf2",display:"grid",gap:10}}>
  <label style={{display:"inline-flex",gap:9,alignItems:"center",fontWeight:700,fontSize:13}}>
   <input type="checkbox" checked={placement.enabled} disabled={!logo?.url} onChange={e=>onChange({...placement,enabled:e.target.checked})}/>{label}
  </label>
  {!logo?.url?<p style={{...subtle,margin:0}}>Upload a primary logo in <Link href="/social/logos">Logos</Link> first.</p>:<p style={{...subtle,margin:0}}>Drag the logo anywhere within the sample frame. The position and size are saved with this studio draft.</p>}
  {logo?.url&&placement.enabled&&<div style={{display:"grid",gridTemplateColumns:"minmax(125px,190px) 1fr",gap:13,alignItems:"start"}}>
    <div aria-label="Drag to position logo" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);move(e)}} onPointerMove={e=>{if(e.buttons)move(e)}} style={{position:"relative",aspectRatio:"9 / 16",background:"linear-gradient(145deg,#e5d3b5,#b5d2d9)",borderRadius:9,touchAction:"none",cursor:"crosshair",overflow:"hidden",userSelect:"none"}}>
     <img alt="Draggable brand logo" draggable={false} src={logo.url} style={studioLogoCss(placement)}/>
    </div>
    <div style={{display:"grid",gap:11}}>
      <label style={subtle}>Horizontal · {placement.x}%<input type="range" min={placement.size/2} max={100-placement.size/2} value={placement.x} onChange={e=>onChange({...placement,x:Number(e.target.value)})} style={{width:"100%"}}/></label>
      <label style={subtle}>Vertical · {placement.y}%<input type="range" min={5} max={95} value={placement.y} onChange={e=>onChange({...placement,y:Number(e.target.value)})} style={{width:"100%"}}/></label>
      <label style={subtle}>Logo width · {placement.size}%<input type="range" min={8} max={45} value={placement.size} onChange={e=>onChange({...placement,size:Number(e.target.value)})} style={{width:"100%"}}/></label>
    </div>
  </div>}
 </div>;
}
