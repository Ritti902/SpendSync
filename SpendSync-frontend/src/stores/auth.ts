import { create } from "zustand";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  updateUser: (user: User) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: async (email, password) => {
    set({ loading: true });
    try {
      const { user } = await api.login(email, password);
      set({ user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  register: async (payload) => {
    set({ loading: true });
    try {
      const { user } = await api.register(payload);
      set({ user, loading: false });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: async () => {
    try {
      await api.logout();
    } finally {
      set({ user: null, loading: false });
    }
  },
  hydrate: async () => {
    set({ loading: true });
    try {
      const user = await api.me();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  updateUser: (user) => set({ user }),
}));
