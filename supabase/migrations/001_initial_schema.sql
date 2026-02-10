-- LumoraAI Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============ BUSINESSES ============
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '',
  website_url text,
  offer_description text,
  target_locations text[] default '{}',
  daily_budget numeric(10,2),
  monthly_budget numeric(10,2),
  goal text check (goal in ('leads', 'purchases', 'bookings', 'traffic')),
  brand_voice text,
  competitors text[] default '{}',
  tone text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index businesses_user_id_idx on businesses(user_id);

-- ============ CONNECTIONS ============
create table connections (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google_ads', 'google_drive')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  platform_account_id text,
  platform_account_name text,
  scopes text[] default '{}',
  status text default 'pending' check (status in ('active', 'expired', 'revoked', 'pending')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index connections_business_platform_idx on connections(business_id, platform);

-- ============ BRAND BRIEFS ============
create table brand_briefs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  version integer not null default 1,
  brief_data jsonb not null default '{}',
  status text default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index brand_briefs_business_idx on brand_briefs(business_id);

-- ============ CREATIVE ASSETS ============
create table creative_assets (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  drive_file_id text,
  file_name text not null,
  file_type text not null,
  mime_type text not null,
  thumbnail_url text,
  file_url text,
  file_size bigint,
  selected boolean default false,
  created_at timestamptz default now()
);

create unique index creative_assets_business_drive_idx on creative_assets(business_id, drive_file_id);
create index creative_assets_business_idx on creative_assets(business_id);

-- ============ CAMPAIGN PLANS ============
create table campaign_plans (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  plan_data jsonb not null default '{}',
  status text default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'launched', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index campaign_plans_business_idx on campaign_plans(business_id);

-- ============ CAMPAIGN ENTITIES ============
create table campaign_entities (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  campaign_plan_id uuid references campaign_plans(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google_ads')),
  entity_type text not null check (entity_type in ('campaign', 'ad_set', 'ad')),
  platform_entity_id text,
  temp_id text not null,
  parent_entity_id uuid references campaign_entities(id),
  config_snapshot jsonb default '{}',
  status text default 'pending' check (status in ('pending', 'creating', 'active', 'paused', 'error', 'deleted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index campaign_entities_business_idx on campaign_entities(business_id);
create index campaign_entities_plan_idx on campaign_entities(campaign_plan_id);

-- ============ PERFORMANCE SNAPSHOTS ============
create table performance_snapshots (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  entity_id uuid references campaign_entities(id) on delete cascade not null,
  platform text not null check (platform in ('meta', 'google_ads')),
  date date not null,
  spend numeric(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  conversions integer default 0,
  revenue numeric(10,2) default 0,
  ctr numeric(6,4) default 0,
  cpc numeric(10,2) default 0,
  cpa numeric(10,2) default 0,
  roas numeric(8,4) default 0,
  frequency numeric(6,2) default 0,
  reach integer default 0,
  created_at timestamptz default now()
);

create unique index performance_snapshots_entity_date_idx on performance_snapshots(entity_id, date);
create index performance_snapshots_business_idx on performance_snapshots(business_id);

-- ============ RECOMMENDATIONS ============
create table recommendations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  entity_id uuid references campaign_entities(id),
  type text not null,
  title text not null,
  description text not null,
  action text not null,
  rationale text not null,
  estimated_impact text,
  risk_level text default 'low' check (risk_level in ('low', 'medium', 'high')),
  confidence numeric(3,2) default 0,
  requires_approval boolean default true,
  status text default 'pending' check (status in ('pending', 'approved', 'denied', 'dismissed', 'auto_applied')),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index recommendations_business_idx on recommendations(business_id);
create index recommendations_status_idx on recommendations(business_id, status);

-- ============ APPROVALS ============
create table approvals (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  entity_type text not null,
  entity_id uuid not null,
  decision text not null check (decision in ('approved', 'denied', 'modified')),
  modifications jsonb,
  decided_at timestamptz default now()
);

create index approvals_business_idx on approvals(business_id);

-- ============ ACTION LOGS ============
create table action_logs (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  entity_id text,
  actor text not null check (actor in ('agent', 'user')),
  action_type text not null,
  description text not null,
  old_value jsonb,
  new_value jsonb,
  platform text check (platform in ('meta', 'google_ads', 'google_drive')),
  platform_entity_id text,
  created_at timestamptz default now()
);

create index action_logs_business_idx on action_logs(business_id);
create index action_logs_created_idx on action_logs(business_id, created_at desc);

-- ============ ROW LEVEL SECURITY ============

alter table businesses enable row level security;
alter table connections enable row level security;
alter table brand_briefs enable row level security;
alter table creative_assets enable row level security;
alter table campaign_plans enable row level security;
alter table campaign_entities enable row level security;
alter table performance_snapshots enable row level security;
alter table recommendations enable row level security;
alter table approvals enable row level security;
alter table action_logs enable row level security;

-- Business policies
create policy "Users can view own business" on businesses
  for select using (user_id = auth.uid());
create policy "Users can update own business" on businesses
  for update using (user_id = auth.uid());
create policy "Users can insert own business" on businesses
  for insert with check (user_id = auth.uid());

-- Helper function to get business_id for current user
create or replace function get_user_business_id()
returns uuid as $$
  select id from businesses where user_id = auth.uid() limit 1;
$$ language sql security definer;

-- Connections policies (server-side only for tokens, but allow status checks)
create policy "Users can view own connections" on connections
  for select using (business_id = get_user_business_id());
create policy "Users can manage own connections" on connections
  for all using (business_id = get_user_business_id());

-- Brand briefs policies
create policy "Users can view own briefs" on brand_briefs
  for select using (business_id = get_user_business_id());
create policy "Users can manage own briefs" on brand_briefs
  for all using (business_id = get_user_business_id());

-- Creative assets policies
create policy "Users can view own assets" on creative_assets
  for select using (business_id = get_user_business_id());
create policy "Users can manage own assets" on creative_assets
  for all using (business_id = get_user_business_id());

-- Campaign plans policies
create policy "Users can view own plans" on campaign_plans
  for select using (business_id = get_user_business_id());
create policy "Users can manage own plans" on campaign_plans
  for all using (business_id = get_user_business_id());

-- Campaign entities policies
create policy "Users can view own entities" on campaign_entities
  for select using (business_id = get_user_business_id());
create policy "Users can manage own entities" on campaign_entities
  for all using (business_id = get_user_business_id());

-- Performance snapshots policies
create policy "Users can view own snapshots" on performance_snapshots
  for select using (business_id = get_user_business_id());
create policy "Users can manage own snapshots" on performance_snapshots
  for all using (business_id = get_user_business_id());

-- Recommendations policies
create policy "Users can view own recommendations" on recommendations
  for select using (business_id = get_user_business_id());
create policy "Users can manage own recommendations" on recommendations
  for all using (business_id = get_user_business_id());

-- Approvals policies
create policy "Users can view own approvals" on approvals
  for select using (business_id = get_user_business_id());
create policy "Users can manage own approvals" on approvals
  for all using (business_id = get_user_business_id());

-- Action logs policies
create policy "Users can view own logs" on action_logs
  for select using (business_id = get_user_business_id());
create policy "Users can manage own logs" on action_logs
  for all using (business_id = get_user_business_id());

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_businesses_updated_at
  before update on businesses
  for each row execute function update_updated_at();

create trigger update_connections_updated_at
  before update on connections
  for each row execute function update_updated_at();

create trigger update_brand_briefs_updated_at
  before update on brand_briefs
  for each row execute function update_updated_at();

create trigger update_campaign_plans_updated_at
  before update on campaign_plans
  for each row execute function update_updated_at();

create trigger update_campaign_entities_updated_at
  before update on campaign_entities
  for each row execute function update_updated_at();
