create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'phone', new.phone)
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create function public.set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  if not (select public.is_admin()) then
    raise exception 'Administrator role required';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'Administrators cannot change their own role through this function';
  end if;

  if new_role not in ('user', 'admin') then
    raise exception 'Invalid role';
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Target user does not exist';
  end if;

  update public.user_roles
  set role = new_role
  where user_id = target_user_id;

  if not found then
    raise exception 'Target user role does not exist';
  end if;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
grant select, update on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;

create policy "Authenticated users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Administrators can read profiles"
on public.profiles
for select
to authenticated
using ((select public.is_admin()));

create policy "Authenticated users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authenticated users can read their own role"
on public.user_roles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Administrators can read roles"
on public.user_roles
for select
to authenticated
using ((select public.is_admin()));

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.set_user_role(uuid, text) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
