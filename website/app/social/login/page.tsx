"use client";

import { useState, type FormEvent, type CSSProperties } from "react";
import Link from "next/link";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

export default function SocialLoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const supabase = getSocialSupabase();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        setMessage(data.session
          ? "Account created. You can now open your workspace."
          : "Account created. Check your email to confirm your address, then sign in.");
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        window.location.assign("/social");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to authenticate. Please try again.");
    } finally { setBusy(false); }
  }

  async function sendResetEmail() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (!email.trim()) throw new Error("Enter your email address first.");
      const redirectTo = `${window.location.origin}/social/reset-password`;
      const { error: authError } = await getSocialSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (authError) throw authError;
      setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send the reset email. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f4f8fd"}}>
      <section style={{width:"100%",maxWidth:430,border:"1px solid #dce8f5",borderRadius:20,padding:32,background:"#ffffff",boxShadow:"0 24px 90px #0008"}}>
        <Link href="/" style={{color:"#0878d8",fontSize:12,textDecoration:"none"}}>← OWN workspace</Link>
        <div style={{marginTop:30,fontSize:11,letterSpacing:".18em",color:"#0878d8"}}>ON A TRIP HOLIDAYS</div>
        <h1 style={{fontSize:34,letterSpacing:"-.04em",margin:"10px 0 8px"}}>OAT Social AI</h1>
        <p style={{color:"#5d708a",fontSize:13,lineHeight:1.7,margin:"0 0 25px"}}>Your travel brand’s creative workspace. Plan, create and review content in one place.</p>
        <div style={{display:"flex",gap:8,marginBottom:20}}>
          <button type="button" onClick={()=>{setMode("signin");setError("");setMessage("");}} style={tabStyle(mode==="signin")}>Sign in</button>
          <button type="button" onClick={()=>{setMode("signup");setError("");setMessage("");}} style={tabStyle(mode==="signup")}>Create account</button>
        </div>
        <form onSubmit={submit} style={{display:"grid",gap:13}}>
          <label style={labelStyle}>EMAIL ADDRESS<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} placeholder="you@company.com"/></label>
          <label style={labelStyle}>PASSWORD
            <div style={{position:"relative"}}>
              <input required minLength={6} type={showPassword?"text":"password"} autoComplete={mode==="signin"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} style={{...inputStyle,paddingRight:76}} placeholder="At least 6 characters"/>
              <button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} style={visibilityButton}>{showPassword?"Hide":"Show"}</button>
            </div>
          </label>
          {mode==="signin" && <div style={{textAlign:"right",marginTop:-5}}><button type="button" disabled={busy} onClick={sendResetEmail} style={textButton}>Forgot password?</button></div>}
          {error && <p role="alert" style={{color:"#b42318",fontSize:12,margin:0}}>{error}</p>}
          {message && <p role="status" style={{color:"#0878d8",fontSize:12,lineHeight:1.6,margin:0}}>{message}</p>}
          <button disabled={busy} type="submit" style={{marginTop:5,padding:13,border:0,borderRadius:10,background:"#0878d8",color:"white",fontWeight:700}}>{busy?"Please wait…":mode==="signin"?"Sign in to Social AI":"Create Social AI account"}</button>
        </form>
        <p style={{fontSize:11,color:"#71839a",lineHeight:1.6,margin:"20px 0 0"}}>This login is separate from OWN. Your Supabase project must have Email authentication enabled. Email confirmation follows your Supabase Auth settings.</p>
      </section>
    </main>
  );
}

const labelStyle: CSSProperties = {display:"grid",gap:7,fontSize:9,letterSpacing:".12em",color:"#5d708a"};
const inputStyle: CSSProperties = {width:"100%",boxSizing:"border-box",padding:"12px 13px",border:"1px solid #cbdced",borderRadius:9,background:"#ffffff",color:"#142b4f",fontSize:13,outline:"none"};
const visibilityButton: CSSProperties = {position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",border:0,background:"transparent",color:"#0878d8",fontSize:11,cursor:"pointer"};
const textButton: CSSProperties = {border:0,background:"transparent",color:"#0878d8",fontSize:11,cursor:"pointer",padding:0};
function tabStyle(active:boolean): CSSProperties { return {flex:1,padding:10,borderRadius:8,border:"1px solid "+(active?"#0878d8":"#cbdced"),background:active?"#eaf4ff":"#ffffff",color:active?"#075da8":"#6b7f98",fontSize:12}; }
