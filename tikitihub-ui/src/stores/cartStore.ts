import { create } from 'zustand';
import type { Event } from '../types';
import apiClient from '../lib/client';
import { useAuthStore } from './authStore'; 

interface CartItem {
  event: Event;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalPrice: number;
  addItem: (event: Event, quantity: number) => void;
  removeItem: (eventId: number) => void;
  clearCart: () => void;
  checkout: () => Promise<any>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalPrice: 0,

  addItem: (event, quantity) => {
    set((state) => {
      const existing = state.items.find(item => item.event.id === event.id);
      if (existing) {
        const updated = state.items.map(item =>
          item.event.id === event.id ? { ...item, quantity: item.quantity + quantity } : item
        );
        return { items: updated, totalPrice: updated.reduce((sum, item) => sum + (item.event.price * item.quantity), 0) };
      }
      const newItems = [...state.items, { event, quantity }];
      return { items: newItems, totalPrice: newItems.reduce((sum, item) => sum + (item.event.price * item.quantity), 0) };
    });
  },

  removeItem: (eventId) => {
    set((state) => {
      const newItems = state.items.filter(item => item.event.id !== eventId);
      return { items: newItems, totalPrice: newItems.reduce((sum, item) => sum + (item.event.price * item.quantity), 0) };
    });
  },

  clearCart: () => set({ items: [], totalPrice: 0 }),

  checkout: async () => {
    const { items } = get();
    if (items.length === 0) throw new Error("Cart is empty");

    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !currentUser.email) {
      throw new Error("You must be authenticated with a valid email to buy passes.");
    }

    try {
      const firstItem = items[0];
      
      const payload = {
        eventTicket: {
          id: firstItem.event.id
        },
        quantity: firstItem.quantity,
        status: "CONFIRMED",
        buyerEmail: currentUser.email, 
        qrRedemptionToken: `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      };

      const response = await apiClient.post('/bookings', payload);
      const data = response.data || response;

      set({ items: [], totalPrice: 0 });
      return data;
    } catch (error: any) {
      console.error("Checkout transaction error:", error);
      throw new Error(error.response?.data?.error || "Failed to process ticket order booking");
    }
  }
}));