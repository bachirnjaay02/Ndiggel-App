-- ═══════════════════════════════════════════════════════════
-- NDIGGËL APP — Schéma Supabase v3
-- Coller dans : Supabase Dashboard → SQL Editor → Run
-- Fonctionne sur une base vierge ET sur une base existante.
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Associations ─────────────────────────────────────
create table if not exists associations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  type                    text,
  city                    text,
  join_code               text,
  subscription_plan       text default 'starter',
  subscription_status     text default 'trial',
  subscription_expires_at timestamptz default (now() + interval '30 days'),
  created_at              timestamptz default now()
);

-- Ajouter les colonnes si la table existait déjà sans elles
alter table associations add column if not exists join_code               text;
alter table associations add column if not exists subscription_plan       text default 'starter';
alter table associations add column if not exists subscription_status     text default 'trial';
alter table associations add column if not exists subscription_expires_at timestamptz default (now() + interval '30 days');

-- Générer un join_code pour les associations qui n'en ont pas
update associations
set join_code = upper(substring(gen_random_uuid()::text, 1, 6))
where join_code is null;

-- Rendre join_code obligatoire et unique (après avoir rempli les NULL)
alter table associations alter column join_code set not null;
alter table associations alter column join_code set default upper(substring(gen_random_uuid()::text, 1, 6));

-- Contrainte UNIQUE sur join_code (ignore si elle existe déjà)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'associations_join_code_key'
  ) then
    alter table associations add constraint associations_join_code_key unique (join_code);
  end if;
end $$;

-- Contraintes CHECK sur subscription_plan et subscription_status
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'associations_subscription_plan_check'
  ) then
    alter table associations
      add constraint associations_subscription_plan_check
      check (subscription_plan in ('starter','standard','premium','enterprise'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'associations_subscription_status_check'
  ) then
    alter table associations
      add constraint associations_subscription_status_check
      check (subscription_status in ('trial','active','expired'));
  end if;
end $$;

-- ─── 2. Membres ──────────────────────────────────────────
create table if not exists members (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid references associations(id) on delete cascade not null,
  name           text not null,
  phone          text not null,
  password       text,
  role           text default 'member',
  status         text default 'active',
  joined_at      timestamptz default now()
);

-- Ajouter la colonne password si elle n'existait pas
alter table members add column if not exists password text;

-- Mettre le numéro de téléphone comme mot de passe par défaut
-- pour les membres existants qui n'en ont pas encore
update members set password = phone where password is null or password = '';

-- Rendre password obligatoire
alter table members alter column password set not null;

-- Contrainte UNIQUE sur phone (ignore si elle existe déjà)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_phone_key'
  ) then
    alter table members add constraint members_phone_key unique (phone);
  end if;
end $$;

-- Contraintes CHECK
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_role_check'
  ) then
    alter table members add constraint members_role_check
      check (role in ('admin', 'member'));
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'members_status_check'
  ) then
    alter table members add constraint members_status_check
      check (status in ('active', 'inactive'));
  end if;
end $$;

-- ─── 3. Cotisations ──────────────────────────────────────
create table if not exists cotisations (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid references members(id) on delete cascade not null,
  association_id uuid references associations(id) on delete cascade not null,
  amount         numeric not null,
  method         text default 'cash',
  status         text default 'pending',
  period         text not null,
  paid_at        timestamptz,
  created_at     timestamptz default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cotisations_method_check') then
    alter table cotisations add constraint cotisations_method_check
      check (method in ('orange_money','wave','cash'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cotisations_status_check') then
    alter table cotisations add constraint cotisations_status_check
      check (status in ('paid','pending','late'));
  end if;
end $$;

-- ─── 4. Dépenses ─────────────────────────────────────────
create table if not exists expenses (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid references associations(id) on delete cascade not null,
  description    text not null,
  amount         numeric not null,
  category       text default 'Autre',
  date           date default current_date,
  created_at     timestamptz default now()
);

-- ─── 5. Épargnes ─────────────────────────────────────────
create table if not exists savings (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid references associations(id) on delete cascade not null,
  description    text not null,
  amount         numeric not null,
  type           text default 'deposit',
  date           date default current_date,
  created_at     timestamptz default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'savings_type_check') then
    alter table savings add constraint savings_type_check
      check (type in ('deposit','withdrawal'));
  end if;
end $$;

-- ─── 6. Paiements d'abonnement (PayTech) ─────────────────
create table if not exists subscription_payments (
  id             uuid primary key default gen_random_uuid(),
  association_id uuid references associations(id) on delete cascade not null,
  plan           text not null,
  amount         numeric not null,
  status         text default 'pending',
  paytech_token  text,
  paytech_ref    text,
  created_at     timestamptz default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscription_payments_status_check') then
    alter table subscription_payments add constraint subscription_payments_status_check
      check (status in ('pending','success','failed'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscription_payments_paytech_ref_key') then
    alter table subscription_payments add constraint subscription_payments_paytech_ref_key
      unique (paytech_ref);
  end if;
end $$;

-- ─── Row Level Security ───────────────────────────────────
alter table associations         enable row level security;
alter table members              enable row level security;
alter table cotisations          enable row level security;
alter table expenses             enable row level security;
alter table savings              enable row level security;
alter table subscription_payments enable row level security;

-- Policies ouvertes (à affiner avec Supabase Auth JWT en production)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_associations') then
    create policy "allow_all_associations" on associations for all using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_members') then
    create policy "allow_all_members" on members for all using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_cotisations') then
    create policy "allow_all_cotisations" on cotisations for all using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_expenses') then
    create policy "allow_all_expenses" on expenses for all using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_savings') then
    create policy "allow_all_savings" on savings for all using (true) with check (true);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'allow_all_subscription_payments') then
    create policy "allow_all_subscription_payments" on subscription_payments for all using (true) with check (true);
  end if;
end $$;
