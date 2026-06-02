import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type PaymentMethod = 'orange_money' | 'wave' | 'cash';
export type PaymentStatus = 'paid' | 'pending' | 'late';
export type NotificationType = 'reminder' | 'update' | 'info';
export type NotificationTarget = 'all' | 'pending';

export interface Member {
  id: string;
  name: string;
  phone: string;
  joinedAt: string;
  status: 'active' | 'inactive';
}

export interface Cotisation {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
  period: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

export interface Saving {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'deposit' | 'withdrawal';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  createdAt: string;
}

export type PlanKey = 'starter' | 'standard' | 'premium' | 'enterprise';

export interface Subscription {
  status: 'trial' | 'active' | 'expired';
  plan: PlanKey;
  amount: number;
  nextBillingDate: string;
}

export const PLAN_AMOUNTS: Record<PlanKey, number> = {
  starter:    1000,
  standard:   2500,
  premium:    5000,
  enterprise: 10000,
};

export const PLAN_LABELS: Record<PlanKey, string> = {
  starter:    'Starter',
  standard:   'Standard',
  premium:    'Premium',
  enterprise: 'Enterprise',
};

export const PLAN_LIMITS: Record<PlanKey, string> = {
  starter:    'Jusqu\'à 30 membres',
  standard:   'Jusqu\'à 100 membres',
  premium:    'Jusqu\'à 500 membres',
  enterprise: 'Membres illimités',
};

interface AppState {
  associationId: string;
  joinCode: string;
  members: Member[];
  cotisations: Cotisation[];
  expenses: Expense[];
  savings: Saving[];
  notifications: Notification[];
  subscription: Subscription;
  monthlyCotisationAmount: number;
  currentPeriod: string;
  loading: boolean;

  setAssociationId: (id: string) => void;
  fetchAll: (associationId: string) => Promise<void>;

  addMember: (name: string, phone: string, password: string) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  toggleMemberStatus: (id: string) => Promise<void>;

  addCotisation: (memberId: string, memberName: string, amount: number, method: PaymentMethod) => Promise<void>;
  markMemberPaid: (memberId: string, memberName: string, method: PaymentMethod) => Promise<void>;

  addExpense: (description: string, amount: number, category: string) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addSaving: (description: string, amount: number, type: 'deposit' | 'withdrawal') => Promise<void>;
  deleteSaving: (id: string) => Promise<void>;

  sendNotification: (title: string, message: string, type: NotificationType, target: NotificationTarget) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  updateMonthlyCotisationAmount: (amount: number) => void;
  applySubscriptionActivation: (plan: PlanKey) => void;
}

const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
const now = new Date();
const CURRENT_PERIOD = `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;
const isoDate = (d: Date) => d.toISOString().split('T')[0];
const daysFromNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

function mapMember(row: any): Member {
  return { id: row.id, name: row.name, phone: row.phone, joinedAt: row.joined_at, status: row.status };
}
function mapCotisation(row: any): Cotisation {
  return {
    id: row.id, memberId: row.member_id,
    memberName: row.members?.name ?? '',
    amount: row.amount, date: row.paid_at ?? '',
    method: row.method ?? 'cash', status: row.status, period: row.period,
  };
}
function mapExpense(row: any): Expense {
  return { id: row.id, description: row.description, amount: row.amount, date: row.date, category: row.category };
}
function mapSaving(row: any): Saving {
  return { id: row.id, description: row.description, amount: row.amount, date: row.date, type: row.type };
}
function mapNotification(row: any): Notification {
  return { id: row.id, title: row.title, message: row.message, type: row.type, target: row.target, createdAt: row.created_at };
}

function buildSubscription(row: any): Subscription {
  const plan   = (row?.subscription_plan   ?? 'starter') as PlanKey;
  const status = (row?.subscription_status ?? 'trial')   as Subscription['status'];
  return {
    status,
    plan,
    amount:          PLAN_AMOUNTS[plan] ?? 1000,
    nextBillingDate: (row?.subscription_expires_at ?? daysFromNow(30)) as string,
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  associationId:          '',
  joinCode:               '',
  members:                [],
  cotisations:            [],
  expenses:               [],
  savings:                [],
  notifications:          [],
  monthlyCotisationAmount: 5000,
  currentPeriod:          CURRENT_PERIOD,
  loading:                false,
  subscription: { status: 'trial', plan: 'starter', amount: 1000, nextBillingDate: daysFromNow(30) },

  setAssociationId: (id) => set({ associationId: id }),

  fetchAll: async (associationId) => {
    set({ loading: true, associationId });

    const [membersRes, cotisRes, expRes, savRes, assocRes, notifRes] = await Promise.all([
      supabase.from('members').select('*').eq('association_id', associationId).order('joined_at'),
      supabase.from('cotisations').select('*, members(name)').eq('association_id', associationId).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').eq('association_id', associationId).order('date', { ascending: false }),
      supabase.from('savings').select('*').eq('association_id', associationId).order('date', { ascending: false }),
      supabase.from('associations').select('join_code, subscription_plan, subscription_status, subscription_expires_at').eq('id', associationId).single(),
      supabase.from('notifications').select('*').eq('association_id', associationId).order('created_at', { ascending: false }),
    ]);

    set({
      members:       (membersRes.data  ?? []).map(mapMember),
      cotisations:   (cotisRes.data    ?? []).map(mapCotisation),
      expenses:      (expRes.data      ?? []).map(mapExpense),
      savings:       (savRes.data      ?? []).map(mapSaving),
      notifications: (notifRes.data    ?? []).map(mapNotification),
      subscription:  buildSubscription(assocRes.data),
      joinCode:      assocRes.data?.join_code ?? '',
      loading:       false,
    });
  },

  addMember: async (name, phone, password) => {
    const { associationId } = get();
    const { data, error } = await supabase.from('members')
      .insert({ association_id: associationId, name, phone, password, role: 'member' })
      .select().single();
    if (error) throw error;
    set(s => ({ members: [...s.members, mapMember(data)] }));
  },

  removeMember: async (id) => {
    await supabase.from('members').delete().eq('id', id);
    set(s => ({ members: s.members.filter(m => m.id !== id) }));
  },

  toggleMemberStatus: async (id) => {
    const member = get().members.find(m => m.id === id);
    if (!member) return;
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    await supabase.from('members').update({ status: newStatus }).eq('id', id);
    set(s => ({ members: s.members.map(m => m.id === id ? { ...m, status: newStatus } : m) }));
  },

  addCotisation: async (memberId, memberName, amount, method) => {
    const { associationId, currentPeriod } = get();
    const { data, error } = await supabase.from('cotisations').insert({
      member_id: memberId, association_id: associationId,
      amount, method, status: 'paid', period: currentPeriod, paid_at: new Date().toISOString(),
    }).select('*, members(name)').single();
    if (error) throw error;
    set(s => ({ cotisations: [mapCotisation(data), ...s.cotisations] }));
  },

  markMemberPaid: async (memberId, memberName, method) => {
    const { associationId, currentPeriod, cotisations, monthlyCotisationAmount } = get();
    const existing = cotisations.find(c => c.memberId === memberId && c.period === currentPeriod);
    if (existing) {
      await supabase.from('cotisations').update({ status: 'paid', method, paid_at: new Date().toISOString() }).eq('id', existing.id);
      set(s => ({ cotisations: s.cotisations.map(c => c.id === existing.id ? { ...c, status: 'paid', method, date: isoDate(new Date()) } : c) }));
    } else {
      const { data, error } = await supabase.from('cotisations').insert({
        member_id: memberId, association_id: associationId,
        amount: monthlyCotisationAmount, method, status: 'paid',
        period: currentPeriod, paid_at: new Date().toISOString(),
      }).select('*, members(name)').single();
      if (error) throw error;
      set(s => ({ cotisations: [mapCotisation(data), ...s.cotisations] }));
    }
  },

  addExpense: async (description, amount, category) => {
    const { associationId } = get();
    const { data, error } = await supabase.from('expenses')
      .insert({ association_id: associationId, description, amount, category })
      .select().single();
    if (error) throw error;
    set(s => ({ expenses: [mapExpense(data), ...s.expenses] }));
  },

  deleteExpense: async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    set(s => ({ expenses: s.expenses.filter(e => e.id !== id) }));
  },

  addSaving: async (description, amount, type) => {
    const { associationId } = get();
    const { data, error } = await supabase.from('savings')
      .insert({ association_id: associationId, description, amount, type })
      .select().single();
    if (error) throw error;
    set(s => ({ savings: [mapSaving(data), ...s.savings] }));
  },

  deleteSaving: async (id) => {
    await supabase.from('savings').delete().eq('id', id);
    set(s => ({ savings: s.savings.filter(sv => sv.id !== id) }));
  },

  sendNotification: async (title, message, type, target) => {
    const { associationId } = get();
    const { data, error } = await supabase.from('notifications')
      .insert({ association_id: associationId, title, message, type, target })
      .select().single();
    if (error) throw error;
    set(s => ({ notifications: [mapNotification(data), ...s.notifications] }));
  },

  deleteNotification: async (id) => {
    await supabase.from('notifications').delete().eq('id', id);
    set(s => ({ notifications: s.notifications.filter(n => n.id !== id) }));
  },

  updateMonthlyCotisationAmount: (amount) => set({ monthlyCotisationAmount: amount }),

  applySubscriptionActivation: (plan) => {
    const nextBillingDate = daysFromNow(30);
    set(s => ({
      subscription: { ...s.subscription, status: 'active', plan, amount: PLAN_AMOUNTS[plan], nextBillingDate },
    }));
  },
}));
