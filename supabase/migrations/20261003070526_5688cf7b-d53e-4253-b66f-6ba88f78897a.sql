create type public.app_role as enum ('admin','moderator','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.categories (id uuid primary key default gen_random_uuid(), name text not null unique, active boolean not null default true, sort int not null default 0);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public reads categories" on public.categories for select to anon, authenticated using (true);
insert into public.categories(name, sort) values ('Confession',1),('Crush',2),('Compliment',3),('Question',4),('Suggestion',5),('Campus Issue',6),('Meme',7);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  content text not null check (char_length(content) between 1 and 1000),
  category text not null,
  is_anonymous boolean not null default true,
  author_name text not null check (char_length(author_name) between 1 and 50),
  client_id text not null,
  love int not null default 0, funny int not null default 0, agree int not null default 0, wow int not null default 0,
  comments_count int not null default 0,
  reports_count int not null default 0,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);
create index on public.posts(created_at desc);
create index on public.posts(client_id, created_at);
grant all on public.posts to service_role;
alter table public.posts enable row level security;

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  is_anonymous boolean not null default true,
  author_name text not null check (char_length(author_name) between 1 and 50),
  client_id text not null,
  created_at timestamptz not null default now()
);
create index on public.comments(post_id, created_at);
grant all on public.comments to service_role;
alter table public.comments enable row level security;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text not null,
  details text check (details is null or char_length(details) <= 300),
  reported_by_client_id text not null,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamptz not null default now()
);
grant all on public.reports to service_role;
alter table public.reports enable row level security;

create table public.banned_clients (
  client_id text primary key,
  reason text not null default '',
  banned_at timestamptz not null default now()
);
grant all on public.banned_clients to service_role;
alter table public.banned_clients enable row level security;

create table public.reactions_log (
  post_id uuid not null references public.posts(id) on delete cascade,
  client_id text not null,
  kind text not null check (kind in ('love','funny','agree','wow')),
  primary key (post_id, client_id, kind)
);
grant all on public.reactions_log to service_role;
alter table public.reactions_log enable row level security;

create or replace function public.toggle_reaction(_post uuid, _client text, _kind text) returns boolean language plpgsql security definer set search_path = public as $$
declare existed boolean;
begin
  delete from reactions_log where post_id=_post and client_id=_client and kind=_kind returning true into existed;
  if existed then
    execute format('update posts set %I = greatest(%I - 1, 0) where id=$1', _kind, _kind) using _post;
    return false;
  end if;
  insert into reactions_log(post_id, client_id, kind) values (_post,_client,_kind);
  execute format('update posts set %I = %I + 1 where id=$1', _kind, _kind) using _post;
  return true;
end $$;
revoke execute on function public.toggle_reaction(uuid,text,text) from public, anon, authenticated;
grant execute on function public.toggle_reaction(uuid,text,text) to service_role;

create or replace function public.bump_counts() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'comments' then
    if tg_op='INSERT' then update posts set comments_count=comments_count+1 where id=new.post_id;
    else update posts set comments_count=greatest(comments_count-1,0) where id=old.post_id; end if;
  else
    if tg_op='INSERT' then update posts set reports_count=reports_count+1 where id=new.post_id; end if;
  end if;
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments for each row execute function public.bump_counts();
create trigger reports_count after insert on public.reports for each row execute function public.bump_counts();

insert into public.posts (title, content, category, is_anonymous, author_name, client_id, love, funny, agree, wow, created_at) values
('To the person who lent me a pen in Room 204', 'You saved my exam. I never got your name but you have the kindest smile on campus. Thank you!', 'Compliment', true, 'Anonymous Student', 'seed', 24, 1, 9, 2, now() - interval '20 minutes'),
('Library aircon is broken again', 'Third week in a row the 2nd floor is a sauna. Can admin please fix it before finals?', 'Campus Issue', false, 'Mika R.', 'seed', 3, 6, 41, 1, now() - interval '2 hours'),
('BSIT 4A crush', 'I think someone from BSIT 4A is really cute 😭 they always sit by the window during lunch.', 'Crush', true, 'Anonymous Student', 'seed', 20, 5, 8, 2, now() - interval '5 hours'),
('Is the canteen open on Saturdays?', 'Planning to study on campus this weekend. Anyone know?', 'Question', true, 'Anonymous Student', 'seed', 0, 0, 4, 0, now() - interval '1 day');