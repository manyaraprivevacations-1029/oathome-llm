"use client";
import { useEffect, useState } from "react";
import { getSocialSupabase } from "@/lib/social/supabase-browser";

export type BrandLogo = {
 id:string; user_id:string; title:string; asset_path:string; enabled:boolean; is_primary:boolean;
 placement:"bottom-right"|"bottom-left"|"top-right"|"top-left"; size_percent:number;
 created_at?:string; url?:string;
};
export const logoBucket="social-brand-logos";
export function logoPosition(placement:BrandLogo["placement"]):React.CSSProperties {
 const pos:React.CSSProperties={position:"absolute",pointerEvents:"none",zIndex:3};
 if(placement.includes("bottom"))pos.bottom="4%";else pos.top="4%";
 if(placement.includes("right"))pos.right="4%";else pos.left="4%";
 return pos;
}
export function useBrandLogo(){
 const [logo,setLogo]=useState<BrandLogo|null>(null);
 useEffect(()=>{
  let active=true;
  const refresh=async()=>{
   try{
    const sb=getSocialSupabase(),auth=await sb.auth.getUser();
    if(!auth.data.user)return;
    const {data,error}=await sb.from("social_brand_logos").select("*").eq("user_id",auth.data.user.id)
      .eq("enabled",true).order("is_primary",{ascending:false}).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;
    if(!data){if(active)setLogo(null);return;}
    const signed=await sb.storage.from(logoBucket).createSignedUrl(data.asset_path,3600);
    if(active)setLogo(signed.data?.signedUrl?{...(data as BrandLogo),url:signed.data.signedUrl}:null);
   }catch(e){console.error("[OAT Social AI] Could not load brand logo",e instanceof Error?e.message:"unknown");}
  };
  void refresh();
  const onChange=()=>void refresh();
  window.addEventListener("oat-brand-logo-changed",onChange);
  return()=>{active=false;window.removeEventListener("oat-brand-logo-changed",onChange);};
 },[]);
 return logo;
}
function loadImage(url:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.crossOrigin="anonymous";
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(new Error("Logo image could not load; try uploading the logo again."));
  image.src=url;
 });
}
/** Burn logo pixels into an image. Used for actual exports, storage and Instagram publishing. */
export async function composeWithBrandLogo(imageDataUrl:string,logo:BrandLogo|null):Promise<string>{
 if(!logo?.url)return imageDataUrl;
 const [photo,brand]=await Promise.all([loadImage(imageDataUrl),loadImage(logo.url)]);
 const canvas=document.createElement("canvas");
 canvas.width=photo.naturalWidth;canvas.height=photo.naturalHeight;
 const context=canvas.getContext("2d");
 if(!context)throw new Error("Could not prepare branded image.");
 context.drawImage(photo,0,0,canvas.width,canvas.height);
 const maxWidth=canvas.width*logo.size_percent/100;
 const maxHeight=canvas.height*0.20;
 const scale=Math.min(maxWidth/brand.naturalWidth,maxHeight/brand.naturalHeight);
 const width=brand.naturalWidth*scale,height=brand.naturalHeight*scale;
 const gap=Math.min(canvas.width,canvas.height)*0.035;
 const x=logo.placement.includes("right")?canvas.width-width-gap:gap;
 const y=logo.placement.includes("bottom")?canvas.height-height-gap:gap;
 context.drawImage(brand,x,y,width,height);
 return canvas.toDataURL("image/png");
}
