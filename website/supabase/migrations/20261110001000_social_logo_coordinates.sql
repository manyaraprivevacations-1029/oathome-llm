-- Allow free positioning while retaining corner placement for backward compatibility.
alter table public.social_brand_logos add column if not exists position_x numeric(5,2);
alter table public.social_brand_logos add column if not exists position_y numeric(5,2);
update public.social_brand_logos
set position_x=case when placement like '%right' then 85 else 15 end,
    position_y=case when placement like 'bottom%' then 85 else 15 end
where position_x is null or position_y is null;
