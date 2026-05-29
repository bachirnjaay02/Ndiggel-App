import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'admin' | 'member' | null;

interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  associationId?: string;
  associationName?: string;
}

interface AuthState {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;

  login: (phone: string, password: string) => Promise<void>;
  register: (
    role: 'admin' | 'member',
    personal: { name: string; phone: string; password: string },
    assoc: { mode: 'create'; name: string; type: string; city: string }
         | { mode: 'join';   joinCode: string }
  ) => Promise<void>;
  logout: () => void;
}

const API_URL = (process.env.REACT_APP_API_URL ?? '').replace(/\/$/, '');

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`);
  return json as T;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      role:            null,
      isAuthenticated: false,
      isLoading:       false,
      error:           '',

      logout: () => set({ user: null, role: null, isAuthenticated: false, error: '' }),

      login: async (phone, password) => {
        set({ isLoading: true, error: '' });
        try {
          const { member } = await apiPost<{ success: true; member: User }>(
            '/api/auth/login',
            { phone: phone.replace(/\s/g, ''), password },
          );
          set({ user: member, role: member.role, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || 'Erreur de connexion', isLoading: false });
          throw err;
        }
      },

      register: async (role, personal, assoc) => {
        set({ isLoading: true, error: '' });
        try {
          const { member } = await apiPost<{ success: true; member: User }>(
            '/api/auth/register',
            { role, personal: { ...personal, phone: personal.phone.replace(/\s/g, '') }, assoc },
          );
          set({ user: member, role: member.role, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || 'Erreur lors de la création du compte', isLoading: false });
          throw err;
        }
      },
    }),
    { name: 'ndiggel-auth' }
  )
);
