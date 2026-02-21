create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.app_member_role as enum ('owner', 'member', 'helper');
create type public.recipe_source_type as enum ('url', 'image_meal', 'image_recipe_page', 'manual');
create type public.grocery_source_type as enum ('baseline', 'recipe');
create type public.grocery_status as enum ('needed', 'have');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  active_household_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_active_household_id_fkey
  foreign key (active_household_id) references public.households(id) on delete set null;

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  role public.app_member_role not null default 'member',
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '14 day',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.baseline_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name_display text not null,
  name_normalized text not null,
  category text not null default 'other',
  default_quantity numeric(10, 3) not null default 1,
  default_unit text not null default 'unit',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, name_normalized)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  source_type public.recipe_source_type not null default 'manual',
  source_url text,
  source_image_path text,
  servings numeric(10, 2) not null default 1,
  dietary_tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name_display text not null,
  name_normalized text not null,
  quantity numeric(10, 3) not null default 1,
  unit text not null default 'unit',
  is_optional boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.recipe_import_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  source_type public.recipe_source_type not null,
  source_reference text,
  model_provider text not null,
  model_name text not null,
  raw_input jsonb,
  parsed_output jsonb,
  confidence numeric(4, 3),
  created_at timestamptz not null default now()
);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name_display text not null,
  name_normalized text not null,
  quantity numeric(10, 3) not null default 1,
  unit text not null default 'unit',
  category text not null default 'other',
  status public.grocery_status not null default 'needed',
  checked boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index grocery_items_open_unique_idx
  on public.grocery_items (household_id, name_normalized, unit, status)
  where checked = false;

create table public.grocery_item_sources (
  id uuid primary key default gen_random_uuid(),
  grocery_item_id uuid not null references public.grocery_items(id) on delete cascade,
  source_type public.grocery_source_type not null,
  source_id uuid not null,
  source_label text not null,
  quantity_contributed numeric(10, 3),
  unit text not null default 'unit',
  created_at timestamptz not null default now(),
  unique (grocery_item_id, source_type, source_id, unit)
);

create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index grocery_items_household_idx on public.grocery_items (household_id, checked, category);
create index recipes_household_idx on public.recipes (household_id, created_at desc);
create index household_members_user_idx on public.household_members (user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_households
before update on public.households
for each row execute function public.set_updated_at();

create trigger set_updated_at_baseline_items
before update on public.baseline_items
for each row execute function public.set_updated_at();

create trigger set_updated_at_recipes
before update on public.recipes
for each row execute function public.set_updated_at();

create trigger set_updated_at_grocery_items
before update on public.grocery_items
for each row execute function public.set_updated_at();

create function public.is_household_member(check_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = check_household_id
      and hm.user_id = auth.uid()
  );
$$;

create function public.is_household_owner(check_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = check_household_id
      and hm.user_id = auth.uid()
      and hm.role = 'owner'
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_household_id uuid;
  fallback_name text;
begin
  fallback_name := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Home');

  insert into public.profiles (user_id, display_name)
  values (new.id, fallback_name)
  on conflict (user_id) do nothing;

  insert into public.households (name, created_by)
  values (fallback_name || '''s Home', new.id)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, new.id, 'owner')
  on conflict do nothing;

  update public.profiles
  set active_household_id = new_household_id
  where user_id = new.id and active_household_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create function public.accept_household_invite(input_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.household_invites;
begin
  select * into invite_row
  from public.household_invites hi
  where hi.invite_code = upper(trim(input_code))
    and hi.used_at is null
    and hi.revoked_at is null
    and hi.expires_at > now();

  if invite_row.id is null then
    raise exception 'Invite code is invalid or expired';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (invite_row.household_id, auth.uid(), invite_row.role)
  on conflict (household_id, user_id) do update
  set role = excluded.role;

  update public.household_invites
  set used_at = now(), used_by = auth.uid()
  where id = invite_row.id;

  update public.profiles
  set active_household_id = invite_row.household_id
  where user_id = auth.uid();

  return invite_row.household_id;
end;
$$;

grant execute on function public.accept_household_invite(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.baseline_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_import_logs enable row level security;
alter table public.grocery_items enable row level security;
alter table public.grocery_item_sources enable row level security;

create policy profiles_self_select
on public.profiles for select
using (auth.uid() = user_id);

create policy profiles_self_update
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy households_member_select
on public.households for select
using (public.is_household_member(id));

create policy households_owner_update
on public.households for update
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

create policy households_owner_delete
on public.households for delete
using (public.is_household_owner(id));

create policy household_members_member_select
on public.household_members for select
using (public.is_household_member(household_id));

create policy household_members_owner_insert
on public.household_members for insert
with check (public.is_household_owner(household_id));

create policy household_members_owner_update
on public.household_members for update
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy household_members_owner_delete
on public.household_members for delete
using (public.is_household_owner(household_id));

create policy household_invites_member_select
on public.household_invites for select
using (public.is_household_member(household_id));

create policy household_invites_owner_insert
on public.household_invites for insert
with check (public.is_household_owner(household_id));

create policy household_invites_owner_update
on public.household_invites for update
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

create policy household_invites_owner_delete
on public.household_invites for delete
using (public.is_household_owner(household_id));

create policy baseline_items_member_all
on public.baseline_items for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy recipes_member_all
on public.recipes for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy recipe_ingredients_member_all
on public.recipe_ingredients for all
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and public.is_household_member(r.household_id)
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and public.is_household_member(r.household_id)
  )
);

create policy recipe_logs_member_all
on public.recipe_import_logs for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy grocery_items_member_all
on public.grocery_items for all
using (public.is_household_member(household_id))
with check (public.is_household_member(household_id));

create policy grocery_item_sources_member_all
on public.grocery_item_sources for all
using (
  exists (
    select 1
    from public.grocery_items gi
    where gi.id = grocery_item_id
      and public.is_household_member(gi.household_id)
  )
)
with check (
  exists (
    select 1
    from public.grocery_items gi
    where gi.id = grocery_item_id
      and public.is_household_member(gi.household_id)
  )
);

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', false)
on conflict (id) do nothing;

create policy storage_recipe_images_authenticated_select
on storage.objects for select
using (bucket_id = 'recipe-images' and auth.role() = 'authenticated');

create policy storage_recipe_images_authenticated_insert
on storage.objects for insert
with check (bucket_id = 'recipe-images' and auth.role() = 'authenticated');

create policy storage_recipe_images_authenticated_update
on storage.objects for update
using (bucket_id = 'recipe-images' and auth.role() = 'authenticated')
with check (bucket_id = 'recipe-images' and auth.role() = 'authenticated');

create policy storage_recipe_images_authenticated_delete
on storage.objects for delete
using (bucket_id = 'recipe-images' and auth.role() = 'authenticated');
