import { create } from 'zustand';
import type { Event } from '../types';
import apiClient from '../lib/client'

interface EventState {
  events: Event[];
  currentEvent: Event | null;
  loading: boolean;
  error: string | null;

  fetchEvents: () => Promise<void>;
  fetchMyListings: () => Promise<void>;
  fetchEvent: (id: number) => Promise<void>;
  createEvent: (eventData: Partial<Event>) => Promise<void>;
  updateEvent: (id: number, eventData: Partial<Event>) => Promise<void>;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  currentEvent: null,
  loading: false,
  error: null,

  fetchEvents: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.get('/tickets');
      set({ events: data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch events', loading: false });
    }
  },

  fetchMyListings: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.get('/tickets/my-listings');
      set({ events: data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch your listings', loading: false });
    }
  },

  fetchEvent: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/tickets/${id}`);
      const data = response.data || response;

      if (!data.tiers || !Array.isArray(data.tiers) || data.tiers.length === 0) {
        try {
          const tiersRes = await apiClient.get(`/tickets/${id}/tiers`);
          if (tiersRes.data && Array.isArray(tiersRes.data) && tiersRes.data.length > 0) {
            data.tiers = tiersRes.data;
          }
        } catch {
          // ignore fallback error
        }
      }

      set({ currentEvent: data, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch event', loading: false });
    }
  },

  createEvent: async (eventData) => {
    set({ loading: true, error: null });
    try {
      await apiClient.post('/tickets', {
        eventName: eventData.eventName,
        description: eventData.description,
        venue: eventData.venue,
        eventDate: eventData.eventDate, 
        price: eventData.price,
        imageUrl: eventData.imageUrl,
        totalQuantity: eventData.totalQuantity,
        remainingQuantity: eventData.totalQuantity,
        tiers: eventData.tiers
      });
      set({ loading: false });
    } catch (error) {
      set({ error: 'Failed to publish event listing', loading: false });
      throw error;
    }
  },

  updateEvent: async (id, eventData) => {
    try {
      const { data } = await apiClient.put(`/tickets/${id}`, eventData);
      set((state) => ({
        events: state.events.map((e) => (e.id === id ? data : e)),
      }));
    } catch (error) {
      set({ error: 'Failed to update event' });
    }
  }
}));