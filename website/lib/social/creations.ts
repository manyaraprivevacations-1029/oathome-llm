import { getSocialSupabase } from "@/lib/social/supabase-browser";

export type CreationSlide = { title: string; body: string; image_prompt: string; image?: string };
export type CreationDraft = {
  poster_title?: string; poster_details?: string; poster_cta?: string; poster_enabled?: boolean; poster_style?: string; overlay_strength?: number; slide_count?: number; poster_layout?: import("./poster").PosterLayout; language?: string; image_prompts?: string[]; selected_prompt?: number;
  headline?: string; caption: string; hashtags?: string; visual_prompt?: string; slides?: CreationSlide[];
};
export type SavedCreation = {
  id: string; user_id: string; title: string; content_type: "post" | "carousel" | "reel";
  caption: string | null; metadata: Record<string, unknown>; asset_path: string | null;
  created_at: string; deleted_at: string | null;
};
const bucket = "social-creation-images";
const reelBucket = "social-reel-videos";
async function currentUserId() {
  const { data, error } = await getSocialSupabase().auth.getUser();
  if (error || !data.user) throw new Error("Your session expired. Please sign in again.");
  return data.user.id;
}
function imageFile(dataUrl: string): { data: Blob; extension: string; contentType: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Only PNG, JPEG and WebP images can be saved.");
  const bytes = atob(match[2]); 
  if (bytes.length > 12 * 1024 * 1024) throw new Error("Image must be under 12 MB.");
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
  return { data: new Blob([buffer], { type: match[1] }), extension: match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1], contentType: match[1] };
}
async function storeImage(image: string | undefined, userId: string, id: string, suffix: string): Promise<string | null> {
  if (!image) return null;
  const file = imageFile(image);
  const path = `${userId}/${id}/${suffix}.${file.extension}`;
  const { error } = await getSocialSupabase().storage.from(bucket).upload(path, file.data, { contentType: file.contentType, upsert: false });
  if (error) throw new Error("Could not save the uploaded image: " + error.message);
  return path;
}
export async function saveCreation(brief: {
  topic: string; destination: string; format: string; tone: string; facts: string;
  draft: CreationDraft; image?: string; type: "post" | "carousel";
}): Promise<string> {
  const sb = getSocialSupabase();
  const userId = await currentUserId();
  const id = crypto.randomUUID();
  const uploaded: string[] = [];
  try {
    const asset = await storeImage(brief.image, userId, id, "post");
    if (asset) uploaded.push(asset);
    const slides = [];
    for (const [i, slide] of (brief.draft.slides || []).entries()) {
      const path = await storeImage(slide.image, userId, id, `slide-${i + 1}`);
      if (path) uploaded.push(path);
      const { image: _image, ...copy } = slide;
      slides.push({ ...copy, image_path: path });
    }
    const metadata = {
      source: "post-studio", topic: brief.topic, destination: brief.destination,
      format: brief.format, tone: brief.tone, confirmed_facts: brief.facts,
      overlay_strength:brief.draft.overlay_strength, slide_count:brief.draft.slide_count,
      poster_layout: brief.draft.poster_layout, language: brief.draft.language,
      image_prompts: brief.draft.image_prompts, selected_prompt: brief.draft.selected_prompt,
      poster_title: brief.draft.poster_title || "", poster_details: brief.draft.poster_details || "",
      poster_cta: brief.draft.poster_cta || "", poster_enabled: brief.draft.poster_enabled ?? false, poster_style: brief.draft.poster_style || "light",
      headline: brief.draft.headline || "", hashtags: brief.draft.hashtags || "",
      visual_prompt: brief.draft.visual_prompt || "", slides
    };
    const { error } = await sb.from("social_content_items").insert({
      id, user_id: userId, title: (brief.draft.headline || brief.topic || "Untitled creation").slice(0, 180),
      content_type: brief.type, status: "draft", caption: brief.draft.caption,
      asset_path: asset, metadata
    });
    if (error) throw new Error(error.message);
    return id;
  } catch (error) {
    if (uploaded.length) await sb.storage.from(bucket).remove(uploaded);
    throw error;
  }
}
export async function listCreations(recycled: boolean): Promise<SavedCreation[]> {
  const userId = await currentUserId();
  let query = getSocialSupabase().from("social_content_items")
    .select("id,user_id,title,content_type,caption,metadata,asset_path,created_at,deleted_at")
    .eq("user_id", userId).in("content_type", ["post", "carousel", "reel"])
    .order("created_at", { ascending: false }).limit(200);
  query = recycled ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as SavedCreation[];
}
export async function setRecycled(id: string, deleted: boolean): Promise<void> {
  const userId = await currentUserId();
  const { data, error } = await getSocialSupabase().from("social_content_items")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id).eq("user_id", userId).select("id").single();
  if (error || !data) throw new Error(error?.message || "Could not update this creation.");
}
export async function permanentlyDeleteCreation(item: SavedCreation): Promise<void> {
  const userId = await currentUserId();
  if (item.user_id !== userId || !item.deleted_at) throw new Error("Move this creation to Recycle Bin first.");
  const paths = [item.asset_path, ...((Array.isArray(item.metadata?.slides) ? item.metadata.slides : []) as Array<{image_path?: string}>).map(x => x.image_path)].filter((x): x is string => Boolean(x));
  // Remove the database record first; orphaned files are safer than a record referencing deleted files.
  const { data, error } = await getSocialSupabase().from("social_content_items").delete()
    .eq("id", item.id).eq("user_id", userId).not("deleted_at", "is", null).select("id").single();
  if (error || !data) throw new Error(error?.message || "Could not permanently delete this creation.");
  if (paths.length) await getSocialSupabase().storage.from(item.content_type === "reel" ? reelBucket : bucket).remove(paths);
}
export async function signedCreationImage(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const userId = await currentUserId();
  if (!path.startsWith(userId + "/")) return null;
  const { data, error } = await getSocialSupabase().storage.from(bucket).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function saveReelCreation(brief:{
 title:string;caption:string;script:string;video:File;destination:string;ratio:string;language:string;productionNotes:string;
}):Promise<string>{
 const sb=getSocialSupabase();
 const userId=await currentUserId();
 if(brief.video.type!=="video/mp4")throw new Error("Only MP4 reel files are supported.");
 if(brief.video.size>50*1024*1024)throw new Error("Reel exceeds the 50 MB storage limit.");
 const id=crypto.randomUUID();
 const path=`${userId}/${id}/reel.mp4`;
 const {error:uploadError}=await sb.storage.from(reelBucket).upload(path,brief.video,{contentType:"video/mp4",upsert:false});
 if(uploadError)throw new Error("Could not upload reel. Check that the social-reel-videos storage migration has been applied: "+uploadError.message);
 const {error}=await sb.from("social_content_items").insert({
  id,user_id:userId,title:brief.title.slice(0,180),content_type:"reel",status:"draft",
  caption:brief.caption,script:brief.script,asset_path:path,
  metadata:{source:"reel-studio",destination:brief.destination,aspect_ratio:brief.ratio,language_style:brief.language,production_notes:brief.productionNotes,video_file_name:brief.video.name,video_bytes:brief.video.size,production_status:"saved_video_not_published"}
 });
 if(error){await sb.storage.from(reelBucket).remove([path]);throw new Error("Could not save reel creation: "+error.message);}
 return id;
}
export async function signedReelVideo(path:string|null|undefined):Promise<string|null>{
 if(!path)return null;
 const userId=await currentUserId();
 if(!path.startsWith(userId+"/"))return null;
 const {data,error}=await getSocialSupabase().storage.from(reelBucket).createSignedUrl(path,3600);
 if(error)return null;
 return data.signedUrl;
}
