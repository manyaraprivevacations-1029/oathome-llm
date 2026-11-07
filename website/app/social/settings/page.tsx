import Link from "next/link";
export default function SocialSettingsPage() {
  return <main className="social-theme" style={{minHeight:"100vh",padding:"34px clamp(18px,5vw,64px)",background:"#f6f2e9",color:"#30291f"}}>
    <h1 style={{fontSize:32}}>Workspace settings</h1>
    <p>OAT Social AI uses Supabase for private content storage and Google Gemini for text generation. Your API keys are managed securely in Vercel, not in this page.</p>
    <section style={{background:"#fff",border:"1px solid #e7dfd1",borderRadius:14,padding:20,maxWidth:680}}>
      <h2 style={{fontSize:19}}>Manage your workspace</h2>
      <p>Update brand voice, language and content guidelines in <Link href="/social/brand">Brand Brain</Link>. Manage saved drafts in <Link href="/social/creations">Creations</Link> and restore removed drafts in <Link href="/social/recycle">Recycle Bin</Link>.</p>
      <p style={{fontSize:13,color:"#756957"}}>Billing and team-management settings are not available yet. No payment or publishing actions are performed here.</p>
    </section>
  </main>;
}
