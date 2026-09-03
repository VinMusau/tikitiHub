import { create } from 'zustand';
import type { Event, TicketTier } from '../types';
import apiClient from '../lib/client';
import { useAuthStore } from './authStore'; 

export interface CartItem {
  event: Event;
  tier?: TicketTier;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  totalPrice: number;
  addItem: (event: Event, quantity: number, tier?: TicketTier) => void;
  removeItem: (eventId: number, tierId?: number) => void;
  clearCart: () => void;
  checkout: () => Promise<any>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  totalPrice: 0,

  addItem: (event, quantity, tier) => {
    set((state) => {
      const existing = state.items.find(
        item => item.event.id === event.id && item.tier?.id === tier?.id
      );
      const getItemPrice = (item: CartItem) => (item.tier ? item.tier.price : item.event.price);

      let updated: CartItem[];
      if (existing) {
        updated = state.items.map(item =>
          item.event.id === event.id && item.tier?.id === tier?.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updated = [...state.items, { event, tier, quantity }];
      }
      return { 
        items: updated, 
        totalPrice: updated.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0) 
      };
    });
  },

  removeItem: (eventId, tierId) => {
    set((state) => {
      const newItems = state.items.filter(
        item => !(item.event.id === eventId && (tierId === undefined || item.tier?.id === tierId))
      );
      const getItemPrice = (item: CartItem) => (item.tier ? item.tier.price : item.event.price);
      return { 
        items: newItems, 
        totalPrice: newItems.reduce((sum, item) => sum + (getItemPrice(item) * item.quantity), 0) 
      };
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
      
      const payload: any = {
        eventTicket: {
          id: firstItem.event.id
        },
        quantity: firstItem.quantity,
        status: "CONFIRMED",
        buyerEmail: currentUser.email, 
        qrRedemptionToken: `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
      };

      if (firstItem.tier?.id) {
        payload.ticketTier = { id: firstItem.tier.id };
      }

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