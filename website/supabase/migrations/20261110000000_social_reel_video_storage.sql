-- Private, per-user storage for finished Reel Studio MP4 files.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('social-reel-videos','social-reel-videos',false,52428800,array['video/mp4'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['video/mp4'];
drop policy if exists "Reel videos owner select" on storage.objects;
create policy "Reel videos owner select" on storage.objects for select to authenticated
 using (bucket_id='social-reel-videos' and (select auth.uid())::text=split_part(name,'/',1));
drop policy if exists "Reel videos owner insert" on storage.objects;
create policy "Reel videos owner insert" on storage.objects for insert to authenticated
 with check (bucket_id='social-reel-videos' and (select auth.uid())::text=split_part(name,'/',1));
drop policy if exists "Reel videos owner delete" on storage.objects;
create policy "Reel videos owner delete" on storage.objects for delete to authenticated
 using (bucket_id='social-reel-videos' and (select auth.uid())::text=split_part(name,'/',1));
