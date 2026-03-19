-- Add target demographic fields to businesses table
alter table businesses
  add column if not exists target_age_ranges text[] default '{}',
  add column if not exists target_gender text check (target_gender in ('all', 'primarily_men', 'primarily_women')),
  add column if not exists target_customer_description text;
