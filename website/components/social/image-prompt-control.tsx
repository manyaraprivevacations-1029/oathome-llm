"use client";
export function ImagePromptControl({ prompts, selected, onSelect, onEdit, disabled }: {
  prompts:string[];selected:number;onSelect:(index:number)=>void;onEdit:(text:string)=>void;disabled?:boolean;
}) {
  const labels=["Scenic","Landmark","People"];
  return <div style={{display:"grid",gap:7}}>
    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontSize:10,fontWeight:700,color:"#746957",marginRight:4}}>IMAGE PROMPT</span>{prompts.map((_,index)=><button key={index} type="button" aria-pressed={selected===index} disabled={disabled} onClick={()=>onSelect(index)} style={{fontSize:11,padding:"5px 9px",border:"1px solid #d7c7ae",borderRadius:6,cursor:"pointer",background:selected===index?"#a8752d":"#fff",color:selected===index?"#fff":"#746957"}}>{labels[index] || `Option ${index+1}`}</button>)}</div>
    <textarea aria-label="Selected image prompt" rows={2} maxLength={1200} value={prompts[selected]||""} disabled={disabled} onChange={e=>onEdit(e.target.value)} style={{boxSizing:"border-box",width:"100%",minHeight:56,maxHeight:140,resize:"vertical",overflowY:"auto",border:"1px solid #ded5c6",borderRadius:8,padding:"9px 11px",fontSize:12,fontWeight:400,lineHeight:1.45,background:"#fff",color:"#30291f"}} />
  </div>;
}
