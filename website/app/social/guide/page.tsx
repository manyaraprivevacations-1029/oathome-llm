import Link from "next/link";
export default function SocialGuidePage() {
  return <main className="social-theme" style={{minHeight:"100vh",padding:"34px clamp(18px,5vw,64px)",background:"#f6f2e9",color:"#30291f"}}>
    <h1 style={{fontSize:32}}>OAT Social AI guide</h1>
    <section style={{background:"#fff",border:"1px solid #e7dfd1",borderRadius:14,padding:22,maxWidth:760,lineHeight:1.8}}>
    <ol>
    <li>Enter a verified travel brief in <Link href="/social/posts">Post Studio</Link> or <Link href="/social/carousels">Carousel Studio</Link>; generate copy using Gemini.</li>
    <li>Review prices, dates, availability and claims before using AI-generated copy.</li>
    <li>Upload licensed images, then save your draft to <Link href="/social/creations">Creations</Link>.</li>
    <li>Use <Link href="/social/trends">Idea Studio</Link> for creative brainstorming. Separately record source-backed research; AI ideas do not prove a trend is real.</li>
    <li>Use <Link href="/social/reels">Reel Production Studio</Link> to generate a script, shot list and storyboard. It does not render a video.</li>
    <li>Use <Link href="/social/recycle">Recycle Bin</Link> to restore deleted drafts or permanently delete them.</li>
    </ol>
    <p>Content must be reviewed before publishing. AI text generation depends on your Gemini free-tier quota.</p>
    </section>
  </main>;
}
