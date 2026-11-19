"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

type Clip = { id:number; start:number; end:number; title:string; reason:string; caption:string; score:number };
type Exported = { id:number; url:string; filename:string };
type Ratio = "9:16" | "original";
type FFmpegInstance = import("@ffmpeg/ffmpeg").FFmpeg;

const panel:CSSProperties = {padding:22,background:"#fffdfa",border:"1px solid #e7dece",borderRadius:17,boxShadow:"0 5px 16px #40301309"};
const field:CSSProperties = {padding:"10px 12px",background:"#fff",border:"1px solid #d9cfbf",borderRadius:9,color:"#2c271f",width:"100%",boxSizing:"border-box"};
const btn:CSSProperties = {padding:"11px 15px",background:"#a8752d",color:"#fff",border:0,borderRadius:9,fontWeight:700,cursor:"pointer"};
const soft:CSSProperties = {...btn,background:"#f5eddf",color:"#795622",border:"1px solid #e3d3b8"};
const stamp = (v:number) => { const s=Math.floor(Math.max(0,v));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); };
const bound=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
function timedSeek(video:HTMLVideoElement,second:number) {
  return new Promise<void>((resolve,reject)=>{
    if(!Number.isFinite(video.duration)) return reject(new Error("Video duration unavailable."));
    let settled=false;
    const finish=(err?:Error)=>{if(settled)return;settled=true;clearTimeout(timeout);video.removeEventListener("seeked",ok);video.removeEventListener("error",bad);err?reject(err):resolve();};
    const ok=()=>finish(),bad=()=>finish(new Error("Could not seek the selected video."));
    const timeout=window.setTimeout(()=>finish(new Error("Timed out seeking the video. Try an MP4 encoded with H.264.")),8000);
    video.addEventListener("seeked",ok);video.addEventListener("error",bad);
    if(Math.abs(video.currentTime-second)<0.025 && video.readyState>=2)finish();
    else video.currentTime=second;
  });
}
export default function AutoClipPage(){
  const ref=useRef<HTMLVideoElement>(null);
  const fileUrlRef=useRef<string|null>(null);
  const exportsRef=useRef<string[]>([]);
  const ffmpegRef=useRef<FFmpegInstance|null>(null);
  const [source,setSource]=useState<File|null>(null);
  const [sourceUrl,setSourceUrl]=useState("");
  const [duration,setDuration]=useState(0);
  const [count,setCount]=useState(3);
  const [seconds,setSeconds]=useState(30);
  const [focus,setFocus]=useState("Travel reels with strong visual hooks, scenery and action");
  const [ratio,setRatio]=useState<Ratio>("9:16");
  const [clips,setClips]=useState<Clip[]>([]);
  const [selected,setSelected]=useState(1);
  const [downloads,setDownloads]=useState<Exported[]>([]);
  const [progress,setProgress]=useState(0);
  const [busy,setBusy]=useState<"analyze"|"export"|null>(null);
  const [status,setStatus]=useState("Upload a video, then click Find AI Highlights.");
  const [model,setModel]=useState("");
  useEffect(()=>()=>{if(fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);exportsRef.current.forEach(u=>URL.revokeObjectURL(u));ffmpegRef.current?.terminate();},[]);
  const changeFile=(file?:File)=>{
    if(!file)return;
    if(!/^(video\/|application\/octet-stream)/.test(file.type) && !/\.(mp4|webm|mov|m4v)$/i.test(file.name)){setStatus("Select a video file such as MP4, MOV or WebM.");return;}
    if(fileUrlRef.current)URL.revokeObjectURL(fileUrlRef.current);
    exportsRef.current.forEach(u=>URL.revokeObjectURL(u));exportsRef.current=[];
    const url=URL.createObjectURL(file);fileUrlRef.current=url;setSource(file);setSourceUrl(url);
    setDuration(0);setClips([]);setDownloads([]);setProgress(0);setStatus("Video selected. Loading preview and duration…");
  };
  const seek=async(value:number)=>{const video=ref.current;if(!video)return;video.pause();await timedSeek(video,bound(value,0,Math.max(0,duration-.05)));};
  const preview=async(clip:Clip)=>{
    setSelected(clip.id);
    try{await seek(clip.start);setStatus("Preview positioned at "+stamp(clip.start)+". Use the video controls to play.");}
    catch(e){setStatus(e instanceof Error?e.message:"Preview failed.");}
  };
  const update=(id:number,key:"start"|"end"|"title",value:string)=>setClips(items=>items.map(c=>{
    if(c.id!==id)return c;
    return key==="title"?{...c,title:value}:{...c,[key]:bound(Number(value)||0,0,duration)};
  }));
  const analyze=async()=>{
    const video=ref.current;
    if(!video || !source || !duration)return;
    setBusy("analyze");setProgress(0);setClips([]);setDownloads([]);setModel("");
    video.pause();
    try{
      const session=await getSocialSupabase().auth.getSession();
      const token=session.data.session?.access_token;
      if(!token)throw new Error("Sign in again to access Gemini.");
      const samples=Math.min(24,Math.max(8,Math.ceil(duration/8)));
      const canvas=document.createElement("canvas");canvas.width=384;canvas.height=216;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("This browser does not support video frame sampling.");
      const frames:{second:number;image:string}[]=[];
      for(let i=0;i<samples;i++){
        const second=bound((i+.25)*duration/samples,0,Math.max(0,duration-.1));
        setStatus("Sampling real video frames ("+(i+1)+"/"+samples+")…");
        await seek(second);
        context.fillStyle="#000";context.fillRect(0,0,384,216);
        const scale=Math.min(384/video.videoWidth,216/video.videoHeight);
        const w=video.videoWidth*scale,h=video.videoHeight*scale;
        context.drawImage(video,(384-w)/2,(216-h)/2,w,h);
        frames.push({second:Number(second.toFixed(2)),image:canvas.toDataURL("image/jpeg",.66)});
        setProgress(Math.round((i+1)/samples*35));
      }
      setStatus("Gemini is evaluating the sampled scenes…");
      const response=await fetch("/api/social/autoclip/analyze",{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
        body:JSON.stringify({frames,duration,count,length:seconds,focus})
      });
      const data=await response.json() as { error?:string;clips?:Omit<Clip,"id">[];model?:string;analysis?:string };
      if(!response.ok)throw new Error(data.error||"Gemini highlight analysis failed.");
      if(!data.clips?.length)throw new Error("Gemini did not return any usable highlights.");
      setClips(data.clips.map((clip,i)=>({...clip,id:i+1})));
      setSelected(1);setModel(data.model||"Gemini");setProgress(100);
      setStatus("Gemini selected "+data.clips.length+" visual highlights. Click each preview and adjust trims before exporting.");
    }catch(error){setStatus(error instanceof Error?error.message:"Gemini analysis failed.");setProgress(0);}
    finally{setBusy(null);}
  };
  async function getFFmpeg(){
    if(ffmpegRef.current?.loaded)return ffmpegRef.current;
    const [{FFmpeg},{toBlobURL}]=await Promise.all([import("@ffmpeg/ffmpeg"),import("@ffmpeg/util")]);
    const ffmpeg=ffmpegRef.current||new FFmpeg();
    setStatus("Loading FFmpeg video engine (one-time browser download)…");
    const base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
    await ffmpeg.load({
      coreURL:await toBlobURL(base+"/ffmpeg-core.js","text/javascript"),
      wasmURL:await toBlobURL(base+"/ffmpeg-core.wasm","application/wasm")
    });
    ffmpeg.on("progress",({progress})=>setProgress(Math.max(0,Math.min(99,Math.round(progress*100)))));
    ffmpegRef.current=ffmpeg;
    return ffmpeg;
  }
  async function exportVideo(clip:Clip){
    if(!source || busy)return;
    if(clip.end<=clip.start || clip.end>duration+.05){setStatus("Set valid start/end times within the video.");return;}
    if(source.size>200*1024*1024){setStatus("This browser editor currently supports files up to 200 MB. A desktop/local FFmpeg worker is needed for larger footage.");return;}
    setSelected(clip.id);setBusy("export");setProgress(0);
    const input="input_"+clip.id+"."+((source.name.split(".").pop()||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"")||"mp4");
    const output="clip_"+clip.id+".mp4";
    try{
      const [{fetchFile},ffmpeg]=await Promise.all([import("@ffmpeg/util"),getFFmpeg()]);
      setStatus("Preparing video locally. No video file is uploaded to Gemini.");
      await ffmpeg.writeFile(input,await fetchFile(source));
      const trim=Math.max(.2,clip.end-clip.start);
      const filter=ratio==="9:16"?
        "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1":
        "scale=trunc(iw/2)*2:trunc(ih/2)*2";
      const args=["-ss",String(clip.start),"-i",input,"-t",String(trim),"-vf",filter,
        "-c:v","libx264","-preset","ultrafast","-crf","25","-c:a","aac","-b:a","128k",
        "-movflags","+faststart",output];
      setStatus("Exporting "+clip.title+" using FFmpeg; large files may take a few minutes…");
      const code=await ffmpeg.exec(args,180000);
      if(code!==0)throw new Error("FFmpeg could not encode this source (exit "+code+"). Try converting it to H.264 MP4 first.");
      const result=await ffmpeg.readFile(output);
      const bytes=result instanceof Uint8Array ? result : new TextEncoder().encode(result);
      if(bytes.byteLength===0)throw new Error("FFmpeg returned an empty output.");
      const copy=new Uint8Array(bytes.byteLength);copy.set(bytes);
      const href=URL.createObjectURL(new Blob([copy],{type:"video/mp4"}));exportsRef.current.push(href);
      const filename="OAT-AutoClip-"+clip.id+"-"+ratio.replace(":","x")+".mp4";
      setDownloads(old=>[...old.filter(d=>d.id!==clip.id),{id:clip.id,url:href,filename}]);
      setProgress(100);setStatus("Clip "+clip.id+" successfully exported. Use its Download button below.");
      await ffmpeg.deleteFile(output).catch(()=>{});
      await ffmpeg.deleteFile(input).catch(()=>{});
    }catch(error){
      setStatus(error instanceof Error?error.message:"Export failed. Try a smaller MP4 file.");
      // A failed/timeout worker should not poison the next export.
      ffmpegRef.current?.terminate();ffmpegRef.current=null;
    }finally{setBusy(null);}
  }
  return <div style={{maxWidth:1160,margin:"0 auto",display:"grid",gap:18,color:"#312a22"}}>
    <section style={{...panel,background:"linear-gradient(115deg,#f0e5d0,#f8f4ec)"}}>
      <div style={{fontSize:10,letterSpacing:".17em",fontWeight:800,color:"#947043"}}>ON A TRIP HOLIDAYS / AI VIDEO TOOLS</div>
      <h2 style={{fontFamily:"Georgia,serif",fontSize:32,margin:"9px 0"}}>Gemini AI AutoClip Studio</h2>
      <p style={{fontSize:14,color:"#65594c",lineHeight:1.65,maxWidth:790,marginBottom:8}}>Gemini analyzes frames from your footage, ranks visually engaging moments, and suggests actual highlight timecodes. Preview, refine and export your clips as Instagram-ready vertical MP4 videos using FFmpeg.</p>
      <div style={{fontSize:12,color:"#80643d"}}>Visual AI analysis only (not dialogue or audio transcription). Gemini API usage counts against your Google quota; local FFmpeg export is free.</div>
    </section>
    <section style={panel}>
      <h3 style={{margin:"0 0 14px"}}>1. Upload a source video</h3>
      <label style={{display:"block",background:"#fbf7ef",border:"2px dashed #d9c5a2",padding:24,borderRadius:14,textAlign:"center",cursor:"pointer"}}>
        <strong>Choose your own MP4, MOV or WebM video</strong>
        <span style={{display:"block",fontSize:12,color:"#7d7264",marginTop:5}}>The video stays on your computer; sampled JPEG frames are sent to Gemini for analysis.</span>
        <input type="file" accept="video/*,.mp4,.webm,.mov" onChange={e=>changeFile(e.target.files?.[0])} disabled={busy!==null} style={{display:"block",margin:"12px auto 0",maxWidth:"100%"}}/>
      </label>
      {sourceUrl && <div style={{marginTop:15}}>
        <video ref={ref} src={sourceUrl} playsInline controls preload="auto"
          style={{display:"block",width:"100%",maxHeight:430,borderRadius:12,background:"#171717"}}
          onLoadedMetadata={()=>{const n=ref.current?.duration||0;if(Number.isFinite(n)&&n>0){setDuration(n);setStatus("Video ready ("+stamp(n)+"). Configure Gemini highlights below.");}}}
          onError={()=>setStatus("Your browser cannot decode this video. Convert it to H.264 MP4 and retry.")}/>
        <p style={{fontSize:12,color:"#7e7365"}}>{source?.name} · {duration?stamp(duration):"Loading metadata…"}</p>
      </div>}
    </section>
    <section style={panel}>
      <h3 style={{margin:"0 0 14px"}}>2. Find highlights with Gemini AI</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
        <label style={{display:"grid",gap:6,fontSize:12}}>Number of AI clips
          <select style={field} value={count} disabled={!!busy} onChange={e=>setCount(Number(e.target.value))}><option value={3}>3 best clips</option><option value={5}>5 best clips</option><option value={10}>10 best clips</option></select></label>
        <label style={{display:"grid",gap:6,fontSize:12}}>Target duration
          <select style={field} value={seconds} disabled={!!busy} onChange={e=>setSeconds(Number(e.target.value))}><option value={15}>15 seconds</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label>
        <label style={{display:"grid",gap:6,fontSize:12}}>Export aspect ratio
          <select style={field} value={ratio} disabled={!!busy} onChange={e=>setRatio(e.target.value as Ratio)}><option value="9:16">9:16 Instagram Reels</option><option value="original">Original video ratio</option></select></label>
      </div>
      <label style={{display:"grid",gap:6,fontSize:12,marginTop:14}}>What should Gemini look for?
        <input style={field} maxLength={400} value={focus} disabled={!!busy} onChange={e=>setFocus(e.target.value)} placeholder="Scenic moments, people having fun, strong hooks…" /></label>
      <button style={{...btn,marginTop:16,opacity:(!duration||busy)?0.55:1}} onClick={()=>void analyze()} disabled={!duration||!!busy}>{busy==="analyze"?"Analyzing frames…":"✦ Find AI Highlights"}</button>
      {model && <p style={{fontSize:12,color:"#8a6b3b"}}>Analyzed with {model}. AI selections based on sampled frames, not audio.</p>}
    </section>
    {clips.length>0&&<section style={panel}>
      <h3 style={{margin:"0 0 14px"}}>3. Review, trim and export AI-selected clips</h3>
      <p style={{fontSize:12,color:"#766a59",lineHeight:1.5}}>Click Preview to jump to a suggestion. Edit start/end times or titles, then export a proper MP4 without relying on real-time browser recording.</p>
      <div style={{display:"grid",gap:13}}>
        {clips.map(c=><div key={c.id} style={{padding:15,borderRadius:13,border:"1px solid "+(selected===c.id?"#af7e37":"#e5dac9"),background:selected===c.id?"#fff8ec":"#fff",display:"grid",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <button style={soft} disabled={!!busy} onClick={()=>void preview(c)}>▶ Preview AI clip {c.id}</button>
            <span style={{fontSize:12,color:"#7f6036"}}>{stamp(c.start)}–{stamp(c.end)} · AI score {c.score}/100</span>
          </div>
          <input style={field} value={c.title} aria-label={"Clip "+c.id+" title"} disabled={!!busy} onChange={e=>update(c.id,"title",e.target.value)}/>
          <div style={{fontSize:12,color:"#736652",lineHeight:1.5}}><strong>Why Gemini chose this:</strong> {c.reason}</div>
          {c.caption&&<div style={{fontSize:12,color:"#736652"}}><strong>Caption idea:</strong> {c.caption}</div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
            <label style={{fontSize:12,display:"grid",gap:5}}>Start (seconds)<input type="number" step=".1" min={0} max={duration} style={field} value={c.start} disabled={!!busy} onChange={e=>update(c.id,"start",e.target.value)}/></label>
            <label style={{fontSize:12,display:"grid",gap:5}}>End (seconds)<input type="number" step=".1" min={0} max={duration} style={field} value={c.end} disabled={!!busy} onChange={e=>update(c.id,"end",e.target.value)}/></label>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <button style={{...btn,opacity:(busy||c.end<=c.start)?0.55:1}} disabled={!!busy||c.end<=c.start} onClick={()=>void exportVideo(c)}>Export clip {c.id} as MP4</button>
            {downloads.filter(d=>d.id===c.id).map(d=><a key={d.url} href={d.url} download={d.filename} style={{color:"#9a671f",fontWeight:700,fontSize:13}}>↓ Download {d.filename}</a>)}
          </div>
        </div>)}
      </div>
    </section>}
    {busy&&<section style={panel}><strong>{busy==="analyze"?"AI highlight analysis":"Video export"} · {progress}%</strong><progress value={progress} max={100} style={{display:"block",width:"100%",marginTop:12}}/><p style={{fontSize:12,color:"#7d705d"}}>Keep this page open while processing. Video exporting on your computer can be CPU-intensive.</p></section>}
    <p role="status" aria-live="polite" style={{margin:0,padding:"12px 15px",background:"#faf6ed",border:"1px solid #e8deca",borderRadius:10,fontSize:13,color:"#806236"}}>{status}</p>
    <section style={{...panel,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
      <div><strong>Next: Edit your Reel</strong><p style={{fontSize:12,color:"#7d7161",margin:"4px 0 0"}}>Exported video clips are downloaded to your device. Publishing remains a separate review step.</p></div>
      <Link href="/social/reels" style={{...soft,textDecoration:"none"}}>Open Reel Studio →</Link>
    </section>
  </div>;
}
