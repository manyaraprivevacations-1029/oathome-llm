"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

export default function SocialResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = getSocialSupabase();
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      if (sessionError) setError(sessionError.message);
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await getSocialSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. Taking you back to Social AI sign in…");
      window.setTimeout(() => window.location.assign("/social/login"), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update your password. Request a new reset link and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={shell}>
      <section style={panel}>
        <Link href="/social/login" style={backLink}>← Back to Social AI login</Link>
        <div style={{marginTop:30,fontSize:11,letterSpacing:".18em",color:"#26734a"}}>ON A TRIP HOLIDAYS</div>
        <h1 style={{fontSize:30,letterSpacing:"-.04em",margin:"10px 0 8px"}}>Set a new password</h1>
        <p style={{color:"#65736b",fontSize:13,lineHeight:1.7,margin:"0 0 24px"}}>Choose a new password for your OAT Social AI account.</p>
        {!ready ? <p style={muted}>Checking your secure reset link…</p> : !hasSession ? (
          <div>
            <p role="alert" style={errorStyle}>This password reset link is invalid or has expired.</p>
            <p style={muted}>Return to the login page and request a fresh reset email.</p>
            <Link href="/social/login" style={actionLink}>Go to Social AI login</Link>
          </div>
        ) : (
          <form onSubmit={submit} style={{display:"grid",gap:14}}>
            <label style={labelStyle}>NEW PASSWORD
              <input required minLength={8} type={showPassword?"text":"password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} placeholder="At least 8 characters"/>
            </label>
            <label style={labelStyle}>CONFIRM NEW PASSWORD
              <input required minLength={8} type={showPassword?"text":"password"} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} style={inputStyle} placeholder="Enter the password again"/>
            </label>
            <button type="button" onClick={()=>setShowPassword(v=>!v)} style={textButton}>{showPassword?"Hide passwords":"Show passwords"}</button>
            {error && <p role="alert" style={errorStyle}>{error}</p>}
            {message && <p role="status" style={successStyle}>{message}</p>}
            <button disabled={busy} type="submit" style={submitButton}>{busy?"Updating…":"Update password"}</button>
          </form>
        )}
      </section>
    </main>
  );
}

const shell: CSSProperties = {minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f5f7f5",color:"#18231d"};
const panel: CSSProperties = {width:"100%",maxWidth:430,boxSizing:"border-box",border:"1px solid #e2e8e3",borderRadius:20,padding:32,background:"#ffffff",boxShadow:"0 24px 90px #0008"};
const backLink: CSSProperties = {color:"#26734a",fontSize:12,textDecoration:"none"};
const labelStyle: CSSProperties = {display:"grid",gap:7,fontSize:9,letterSpacing:".12em",color:"#65736b"};
const inputStyle: CSSProperties = {width:"100%",boxSizing:"border-box",padding:"12px 13px",border:"1px solid #d7dfd8",borderRadius:9,background:"#ffffff",color:"#1f2933",fontSize:13,outline:"none"};
const muted: CSSProperties = {color:"#65736b",fontSize:12,lineHeight:1.7};
const errorStyle: CSSProperties = {color:"#b42318",fontSize:12,lineHeight:1.6,margin:0};
const successStyle: CSSProperties = {color:"#26734a",fontSize:12,lineHeight:1.6,margin:0};
const textButton: CSSProperties = {justifySelf:"end",border:0,background:"transparent",color:"#26734a",fontSize:11,cursor:"pointer"};
const submitButton: CSSProperties = {marginTop:5,padding:13,border:0,borderRadius:10,background:"#26734a",color:"white",fontWeight:700,cursor:"pointer"};
const actionLink: CSSProperties = {display:"inline-block",marginTop:8,color:"#26734a",fontSize:12};
