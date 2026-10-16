"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Lead = { id:string; name:string; destination?:string; phone:string; score?:number; status?:string; language?:string; travelDate?:string; travellers?:number };
type Employee = { id:string; name:string; role:string; languages:string[]; active:boolean; voice?:string; systemPrompt?:string };
type Campaign = { id:string; name:string; description?:string|null; status:string; min_score:number; max_attempts:number; employee_id?:string|null };
type Metric = { totalLeads:number; contacted:number; answered:number; qualified:number; hot:number; warm:number; cold:number; contactRate:number; qualificationRate:number; hotRate:number; averageCallDurationSeconds?:number };
type Settings = { ai_model?:string; ai_provider?:string; voice_provider?:string|null; voice_from_number?:string|null; crm_enabled?:boolean; whatsapp_enabled?:boolean; recording_enabled?:boolean };
type ChatMessage = { role:"user"|"assistant"; text:string };
type ConversationState = { stage:string; language:"Telugu"|"Tenglish"|"English"; destination?:string; travelDate?:string; travellers?:number; budget?:number; intent:"unknown"|"low"|"medium"|"high"; objections:string[]; nextAction?:string };

const nav=["Overview","AI Employees","Leads","Campaigns","Call History","Knowledge Base","Analytics","Test AI","Settings"];

export default function Home() {
 const [section,setSection]=useState("Overview");
 const [leads,setLeads]=useState<Lead[]>([]);
 const [employees,setEmployees]=useState<Employee[]>([]);
 const [campaigns,setCampaigns]=useState<Campaign[]>([]);
 const [calls,setCalls]=useState<any[]>([]);
 const [knowledge,setKnowledge]=useState<any[]>([]);
 const [metrics,setMetrics]=useState<Metric|null>(null);
 const [settings,setSettings]=useState<Settings|null>(null);
 const [calling,setCalling]=useState(false);
 const [notice,setNotice]=useState("");
 const [search,setSearch]=useState("");
 const [testLead,setTestLead]=useState<Lead|null>(null);

 useEffect(()=>{ void loadData(); },[]);
 const loadData=async()=>{
  const endpoints:Array<[string,(d:any)=>void]>=[
   ["/api/ai-bot/leads",(d)=>d.leads&&setLeads(d.leads)],
   ["/api/ai-bot/employees",(d)=>d.employees&&setEmployees(d.employees)],
   ["/api/ai-bot/campaigns",(d)=>d.campaigns&&setCampaigns(d.campaigns)],
   ["/api/ai-bot/calls",(d)=>d.sessions&&setCalls(d.sessions)],
   ["/api/ai-bot/knowledge",(d)=>d.items&&setKnowledge(d.items)],
   ["/api/ai-bot/metrics",(d)=>d.metrics&&setMetrics(d.metrics)],
   ["/api/ai-bot/settings",(d)=>d.settings&&setSettings(d.settings)]
  ];
  await Promise.all(endpoints.map(async([url,apply])=>{try{const r=await fetch(url); const d=await r.json(); if(r.ok) apply(d);}catch{}}));
 };
 const runCall=async(lead?:Lead)=>{
  const target=lead??leads[0];
  if(!target){setNotice("Create a lead first, then start an AI call.");setSection("Leads");return;}
  setCalling(true);setNotice("Ananya is preparing the call…");
  try{const r=await fetch("/api/ai-bot/calls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({leadId:target.id,employeeId:"ananya",phone:target.phone,purpose:"qualification"})});const d=await r.json();setNotice(r.ok?"Call started successfully.":d.error??"Live calling is not configured yet.");}catch{setNotice("Unable to reach the AI calling service.");}finally{setCalling(false);}
 };
 const filtered=useMemo(()=>leads.filter(l=>[l.name,l.destination,l.language,l.status,l.phone].join(" ").toLowerCase().includes(search.toLowerCase())),[leads,search]);
 const activeEmployee=employees[0]??{id:"ananya",name:"Ananya",role:"Travel Sales Specialist",languages:["Telugu","Tenglish","English"],active:true};

 return <main className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brand-mark">A</div><div><strong>ON A TRIP</strong><span>HOLIDAYS AI BOT</span></div></div>
   <div className="workspace"><small>WORKSPACE</small><b>On A Trip Holidays</b><span>Travel Sales AI</span></div>
   <nav>{nav.map(n=><button key={n} className={section===n?"active":""} onClick={()=>setSection(n)}><span className="dot"/>{n}</button>)}</nav>
   <div className="side-bottom"><div className="live"><i/> AI system online</div><span>v1.2 • India</span></div>
  </aside>
  <section className="content">
   <header><div><p className="eyebrow">ON A TRIP HOLIDAYS / {section.toUpperCase()}</p><h1>{section}</h1><p className="muted">AI-powered travel sales and customer support.</p></div><div className="header-actions"><button className="ghost" onClick={()=>setSection("Test AI")}>Test AI</button><button className="primary" disabled={calling} onClick={()=>runCall()}>{calling?"Calling…":"Start AI Call"}</button></div></header>
   {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
   {section==="Overview"&&<Overview metrics={metrics} leads={filtered} employee={activeEmployee} runCall={runCall} setSection={setSection}/>}
   {section==="AI Employees"&&<Employees employees={employees.length?employees:[activeEmployee]} runCall={runCall}/>}
   {section==="Leads"&&<Leads leads={filtered} search={search} setSearch={setSearch} runCall={runCall} refresh={loadData}/>}
   {section==="Campaigns"&&<Campaigns leads={leads} campaigns={campaigns}/>}
   {section==="Call History"&&<CallHistory calls={calls}/>}
   {section==="Knowledge Base"&&<Knowledge items={knowledge}/>}
   {section==="Analytics"&&<Analytics metrics={metrics}/>}
   {section==="Test AI"&&<TestAI leads={leads} selected={testLead} setSelected={setTestLead} employee={activeEmployee}/>}
   {section==="Settings"&&<Settings settings={settings}/>}
   <footer>© 2026 On A Trip Holidays · AI Bot</footer>
  </section>
 </main>
}

function Overview({metrics,leads,employee,runCall,setSection}:{metrics:Metric|null;leads:Lead[];employee:Employee;runCall:(l?:Lead)=>void;setSection:(s:string)=>void}){
 const stats=[["Leads",metrics?.totalLeads??0,"live"],["Connected",metrics?.answered??0,metrics?metrics.contactRate+"%":"—"],["Qualified",metrics?.qualified??0,metrics?metrics.qualificationRate+"%":"—"],["Hot Leads",metrics?.hot??0,"live"],["Calls",metrics?.contacted??0,"live"]];
 return <><div className="hero"><div><span className="pill">● AI EMPLOYEE READY</span><h2>Meet <em>{employee.name}</em></h2><p>{employee.languages.join(" • ")} · {employee.role}</p><div className="hero-actions"><button className="primary" onClick={()=>runCall()}>Call next lead</button><button className="ghost" onClick={()=>setSection("Test AI")}>Test conversation</button></div></div><div className="orb"><span>AI</span></div></div>
 <div className="stats">{stats.map(s=><div className="stat" key={s[0]}><span>{s[0]}</span><strong>{s[1]}</strong><small>{s[2]}</small></div>)}</div>
 <div className="grid"><div className="card wide"><div className="card-head"><div><h3>Priority leads</h3><p>AI-qualified enquiries ready for sales action</p></div><button className="link" onClick={()=>setSection("Leads")}>View all →</button></div>{leads.slice(0,6).map(l=><LeadRow key={l.id} lead={l} runCall={runCall}/>)}{!leads.length&&<div className="empty">No leads yet. Add your first lead to start testing Ananya.</div>}</div>
 <div className="card"><div className="card-head"><div><h3>AI employee</h3><p>Current configuration</p></div></div><div className="employee"><div className="employee-avatar">A</div><div><b>{employee.name}</b><span>{employee.role}</span></div><i className="online">{employee.active?"READY":"OFFLINE"}</i></div><div className="mini-row"><span>Languages</span><b>{employee.languages.length}</b></div><div className="mini-row"><span>Voice</span><b>{employee.voice??"Provider default"}</b></div><div className="mini-row"><span>Knowledge documents</span><b>Live</b></div></div></div></>
}

function LeadRow({lead,runCall}:{lead:Lead;runCall:(l?:Lead)=>void}){return <div className="lead"><div className="avatar">{lead.name?.[0]??"L"}</div><div className="lead-main"><b>{lead.name}</b><span>{lead.destination||"Destination not set"} · {lead.language||"Language not set"}</span></div><div className="score"><b>{lead.score??0}</b><span>AI score</span></div>{lead.status&&<span className={"status "+lead.status.toLowerCase()}>{lead.status}</span>}<button className="call" onClick={()=>runCall(lead)}>Call</button></div>}

function Employees({employees,runCall}:{employees:Employee[];runCall:(l?:Lead)=>void}){return <div className="card section-card"><div className="card-head"><div><h2>AI Employees</h2><p>Digital sales and support employees.</p></div><span className="pill">DATABASE CONFIGURED</span></div><div className="employee-grid">{employees.map(e=><div className="employee-card" key={e.id}><div className="employee-top"><div className="employee-avatar large">A</div><span className="online">{e.active?"READY":"OFFLINE"}</span></div><h3>{e.name}</h3><p>{e.role}</p><div>{e.languages.map(l=><span className="tag" key={l}>{l.toUpperCase()}</span>)}</div><div className="employee-actions"><button className="primary" onClick={()=>runCall()}>Test call</button><button className="ghost" onClick={()=>alert("Employee configuration UI is next; the live profile is already stored in Supabase.")}>Configure</button></div></div>)}</div></div>}

function Leads({leads,search,setSearch,runCall,refresh}:{leads:Lead[];search:string;setSearch:(v:string)=>void;runCall:(l?:Lead)=>void;refresh:()=>Promise<void>}){const [open,setOpen]=useState(false);const [form,setForm]=useState({name:"",phone:"",destination:"",language:"Telugu",travellers:"2",source:"manual"});const [saving,setSaving]=useState(false);const save=async()=>{if(!form.name||!form.phone)return;setSaving(true);try{const r=await fetch("/api/ai-bot/leads",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...form,travellers:Number(form.travellers)})});const d=await r.json();if(!r.ok)throw new Error(d.error);setOpen(false);setForm({name:"",phone:"",destination:"",language:"Telugu",travellers:"2",source:"manual"});await refresh();}catch(e){alert(e instanceof Error?e.message:"Unable to create lead");}finally{setSaving(false);}};return <div className="card section-card"><div className="card-head"><div><h2>Leads</h2><p>Standalone AI Bot leads. CRM integration can be connected later.</p></div><div className="header-actions"><input className="search" placeholder="Search leads…" value={search} onChange={e=>setSearch(e.target.value)}/><button className="primary" onClick={()=>setOpen(!open)}>+ Add Lead</button></div></div>{open&&<div className="lead-form">{["name","phone","destination"].map(k=><input key={k} placeholder={k==="phone"?"Phone number":k[0].toUpperCase()+k.slice(1)} value={(form as any)[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>)}<select value={form.language} onChange={e=>setForm({...form,language:e.target.value})}><option>Telugu</option><option>Tenglish</option><option>English</option></select><input type="number" min="1" placeholder="Travellers" value={form.travellers} onChange={e=>setForm({...form,travellers:e.target.value})}/><button className="primary" disabled={saving} onClick={save}>{saving?"Saving…":"Save lead"}</button></div>}<div className="lead-list">{leads.map(l=><LeadRow key={l.id} lead={l} runCall={runCall}/>)}</div>{!leads.length&&<div className="empty">No leads found. Add a lead manually or connect your CRM later.</div>}</div>}

function Campaigns({leads,campaigns}:{leads:Lead[];campaigns:Campaign[]}){return <div className="card section-card"><div className="card-head"><div><h2>Campaigns</h2><p>Outbound AI calling campaigns and retry rules.</p></div></div><div className="campaign-grid">{campaigns.map(c=><div className="campaign" key={c.id}><span className={"campaign-status "+(c.status==="ready"?"active":"")}>{c.status.toUpperCase()}</span><h3>{c.name}</h3><p>{c.description||"Outbound AI calling campaign."}</p><div className="mini-row"><span>Eligible leads</span><b>{leads.filter(l=>(l.score??0)>=c.min_score).length}</b></div><div className="mini-row"><span>Retry policy</span><b>{c.max_attempts} attempts</b></div></div>)}{!campaigns.length&&<div className="empty">No campaigns configured.</div>}</div></div>}

function CallHistory({calls}:{calls:any[]}){return <div className="card section-card"><div className="card-head"><div><h2>Call History</h2><p>Live call sessions from the AI Bot database.</p></div></div>{calls.length?<div className="table">{calls.map(r=><div className="table-row" key={r.id}><b>{r.leadId}</b><span>{r.employeeId}</span><span>{r.provider}</span><span className={"result "+r.status}>{r.status?.replace("_"," ")}</span><span>{r.startedAt?new Date(r.startedAt).toLocaleString():"—"}</span></div>)}</div>:<div className="empty">No calls have been placed yet.</div>}</div>}

function Knowledge({items}:{items:any[]}){return <div className="card section-card"><div className="card-head"><div><h2>Knowledge Base</h2><p>Approved travel information used by AI employees.</p></div></div><div className="knowledge-grid">{items.map((x:any)=><div className="knowledge" key={x.id}><div className="knowledge-icon">KB</div><div><b>{x.title}</b><span>{x.category} · {x.status}</span></div></div>)}</div>{!items.length&&<div className="empty">No knowledge documents found.</div>}<div className="warning">Pricing, availability and operational facts should be synced before the AI makes customer-facing commitments.</div></div>}

function Analytics({metrics}:{metrics:Metric|null}){const m=metrics;return <div className="card section-card"><div className="card-head"><div><h2>Analytics</h2><p>Live AI sales performance from Supabase.</p></div></div><div className="analytics-grid">{[["Connection rate",m?m.contactRate+"%":"—"],["Qualification rate",m?m.qualificationRate+"%":"—"],["Hot lead rate",m?m.hotRate+"%":"—"],["Avg. call duration",m&&m.averageCallDurationSeconds?Math.floor(m.averageCallDurationSeconds/60).toString().padStart(2,"0")+":"+String(m.averageCallDurationSeconds%60).padStart(2,"0"):"—"]].map(x=><div className="metric" key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div><div className="mini-row"><span>Total leads</span><b>{m?.totalLeads??0}</b></div><div className="mini-row"><span>Qualified</span><b>{m?.qualified??0}</b></div><div className="mini-row"><span>Hot</span><b>{m?.hot??0}</b></div></div>}

function TestAI({leads,selected,setSelected,employee}:{leads:Lead[];selected:Lead|null;setSelected:(l:Lead|null)=>void;employee:Employee}){
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [conversationState,setConversationState]=useState<ConversationState|null>(null);
 const [text,setText]=useState("");
 const [busy,setBusy]=useState(false);
 const [recording,setRecording]=useState(false);
 const [audioUrl,setAudioUrl]=useState("");
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 useEffect(()=>{setMessages([]);setConversationState(null);setAudioUrl("");},[selected?.id]);
 const send=async()=>{
  if(!selected||!text.trim()||busy)return;
  const user=text.trim();setText("");
  setMessages(m=>[...m,{role:"user",text:user}]);setBusy(true);
  try{
   const r=await fetch("/api/ai-bot/conversation",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({employeeId:employee.id,leadId:selected.id,phone:selected.phone,text:user,previous:conversationState??undefined})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   if(d.result?.state)setConversationState(d.result.state);
   setMessages(m=>[...m,{role:"assistant",text:d.result?.response??"No response returned."}]);
  }catch(e){setMessages(m=>[...m,{role:"assistant",text:e instanceof Error?e.message:"Conversation failed."}]);}
  finally{setBusy(false);}
 };
 const finishRecording=async(blob:Blob,mimeType:string)=>{
  const ext=mimeType.includes("webm")?"webm":mimeType.includes("mp4")?"mp4":mimeType.includes("wav")?"wav":"webm";
  const data=new FormData();
  data.append("audio",blob,"customer."+ext);
  data.append("history",JSON.stringify(messages.map(m=>({role:m.role,content:m.text}))));
  setBusy(true);
  try{
   const response=await fetch("/api/ai-bot/voice-turn",{method:"POST",body:data});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error??"Voice conversation failed.");
   setMessages(m=>[...m,{role:"user",text:result.transcript},{role:"assistant",text:result.reply}]);
   setAudioUrl("data:audio/wav;base64,"+result.audioBase64);
  }catch(error){
   setMessages(m=>[...m,{role:"assistant",text:error instanceof Error?error.message:"Voice conversation failed."}]);
  }finally{setBusy(false);}
 };
 const startRecording=async()=>{
  if(!selected||busy)return;
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});
   stream.current=media;
   const preferred=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type=>MediaRecorder.isTypeSupported(type));
   const current=new MediaRecorder(media,preferred?{mimeType:preferred}:undefined);
   const chunks:BlobPart[]=[];
   current.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
   current.onstop=()=>{
    const blob=new Blob(chunks,{type:current.mimeType||"audio/webm"});
    media.getTracks().forEach(track=>track.stop());stream.current=null;
    setRecording(false);
    if(blob.size)void finishRecording(blob,current.mimeType||"audio/webm");
   };
   recorder.current=current;current.start();setRecording(true);
  }catch{
   setMessages(m=>[...m,{role:"assistant",text:"Could not access the microphone. Allow microphone access in your browser and try again."}]);
  }
 };
 const stopRecording=()=>{if(recorder.current?.state==="recording")recorder.current.stop();};
 useEffect(()=>()=>{stream.current?.getTracks().forEach(track=>track.stop());},[]);
 return <div className="card section-card"><div className="card-head"><div><h2>Test Ananya</h2><p>Try a typed or spoken Telugu, Tenglish or English enquiry. This browser test does not place a phone call.</p></div><select value={selected?.id??""} onChange={e=>setSelected(leads.find(l=>l.id===e.target.value)??null)}><option value="">Select a lead</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name} · {l.phone}</option>)}</select></div>{!leads.length?<div className="empty">Create a lead first, then use this console to test a conversation.</div>:<><div className="chat">{messages.length?messages.map((m,i)=><div className={"bubble "+m.role} key={i}><b>{m.role==="assistant"?employee.name:"You"}</b><span>{m.text}</span></div>):<div className="empty">Start by saying or typing: “Namaste, I am planning a trip.”</div>}</div>{audioUrl&&<audio controls autoPlay src={audioUrl} style={{width:"100%",marginTop:12}}/>}<div className="chat-input"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void send();}} placeholder={selected?"Type a customer message…":"Select a lead first"} disabled={!selected||busy||recording}/><button className="primary" onClick={()=>void send()} disabled={!selected||busy||recording}>{busy?"Working…":"Send"}</button><button className={recording?"primary":"ghost"} onClick={()=>recording?stopRecording():void startRecording()} disabled={!selected||busy}>{recording?"Stop recording":"🎙 Speak"}</button></div><small className="muted">First time? Allow microphone access when your browser asks.</small></>}</div>
}

function Settings({settings}:{settings:Settings|null}){const s=settings;const rows=[["Supabase",s?"Connected":"Not connected"],["AI model",s?.ai_model??"Local rule-based"],["AI provider",s?.ai_provider??"Local"],["Voice provider",s?.voice_provider??"Not connected"],["CRM",s?.crm_enabled?"Enabled":"Not connected"],["WhatsApp",s?.whatsapp_enabled?"Enabled":"Not connected"],["Recording",s?.recording_enabled?"Ready":"Needs voice provider"]];return <div className="card section-card"><h2>Settings</h2><p>Live integration status. Secrets remain server-side.</p><div className="settings-list">{rows.map(x=><div className="setting" key={x[0]}><div><b>{x[0]}</b><span>{x[1]}</span></div><span className="pill">{x[1].toLowerCase().includes("connected")||x[1].includes("Enabled")||x[1].includes("Ready")?"READY":"PENDING"}</span></div>)}</div><div className="warning">Real outbound calls remain disabled until a supported voice/telephony provider is configured. The Test AI console is available now.</div></div>}
