import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL  ?? '';
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnon) {
  console.error('[Ndiggel] Variables Supabase manquantes. Vérifiez REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY dans Vercel.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnon || 'placeholder');

/* ── Types miroirs des tables Supabase ── */

export interface DbMember {
  id: string;
  association_id: string;
  name: string;
  phone: string;
  role: 'admin' | 'member';
  status: 'active' | 'inactive';
  joined_at: string;
}

export interface DbCotisation {
  id: string;
  member_id: string;
  association_id: string;
  amount: number;
  method: 'orange_money' | 'wave' | 'cash';
  status: 'paid' | 'pending' | 'late';
  period: string;
  paid_at: string | null;
  created_at: string;
  members?: { name: string };
}

export interface DbExpense {
  id: string;
  association_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
}

export interface DbSaving {
  id: string;
  association_id: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  date: string;
  created_at: string;
}

export interface DbAssociation {
  id: string;
  name: string;
  type: string;
  city: string;
  created_at: string;
}

export interface DbSubscription {
  id: string;
  association_id: string;
  plan: string;
  amount: number;
  status: 'trial' | 'active' | 'expired';
  next_billing_date: string;
}
