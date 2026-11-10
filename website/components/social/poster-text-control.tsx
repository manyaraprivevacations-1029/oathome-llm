"use client";
import { useState } from "react";
import { defaultPosterLayout, safePosterLayout, type PosterLayout, type PosterBlock } from "@/lib/social/poster";

export function PosterTextControl({ value, onChange, disabled }: {value:PosterLayout;onChange:(value:PosterLayout)=>void;disabled?:boolean}) {
  const [block,setBlock]=useState<keyof PosterLayout>("title");
  const layout=safePosterLayout(value);
  function update(key:keyof PosterBlock,value:number) { onChange({...layout,[block]:{...layout[block],[key]:value}}); }
  return <details style={{border:"1px solid #ded5c6",borderRadius:8,padding:"9px 12px",fontSize:12}}>
    <summary style={{cursor:"pointer",fontWeight:700}}>Adjust text · size and position</summary>
    <fieldset disabled={disabled} style={{border:0,padding:"12px 0 0",margin:0,display:"grid",gap:10}}>
      <label>Text block <select aria-label="Text block to adjust" value={block} onChange={e=>setBlock(e.target.value as keyof PosterLayout)} style={{marginLeft:8,padding:6,borderRadius:6,border:"1px solid #ded5c6"}}><option value="title">Title</option><option value="details">Details</option><option value="cta">Call to action</option></select></label>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12}}>
        {([{key:"size",label:"Font size",min:18,max:180,unit:" px"},{key:"x",label:"Horizontal position",min:5,max:95,unit:"%"},{key:"y",label:"Vertical position",min:2,max:92,unit:"%"},{key:"width",label:"Text width",min:30,max:92,unit:"%"}] as const).map(control=><label key={control.key} style={{display:"grid",gap:4}}>{control.label} · {layout[block][control.key]}{control.unit}<input type="range" aria-label={`${block} ${control.label}`} min={control.min} max={control.max} value={layout[block][control.key]} onChange={e=>update(control.key,Number(e.target.value))} /></label>)}
      </div>
      <div><button type="button" onClick={()=>onChange(defaultPosterLayout)} style={{background:"none",border:"1px solid #ded5c6",borderRadius:6,padding:"6px 10px",cursor:"pointer",fontSize:12}}>Reset text positions</button><span style={{marginLeft:8,color:"#746957"}}>Move text away from your logo. Long copy shrinks to fit.</span></div>
    </fieldset>
  </details>;
}
