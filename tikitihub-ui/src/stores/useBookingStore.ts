import { create } from 'zustand';
import apiClient from '../lib/client';

interface BookingState {
  bookings: any[];
  loading: boolean;
  error: string | null;
  fetchUserBookings: () => Promise<void>;
  redeemTicketGateScan: (payload: {qrRedemptionToken: string; eventId: string | number}) => Promise<ScanResponse>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  loading: false,
  error: null,

  fetchUserBookings: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get("/bookings/my-bookings");
      const data = response.data || response;
      set({ bookings: data, loading: false });
    } catch (err: any) {
      console.error("Store error fetching bookings:", err);
      set({ error: "Failed to sync your tickets", loading: false });
    }
  },

  redeemTicketGateScan: async (payload: {qrRedemptionToken: string; eventId: string | number;}) => {
    try {
      const response = await apiClient.post("/bookings/redeem", payload);
      return { success: true, message: response.data.message };
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || error.response?.data?.message || "Scan verification failed.";
      return { success: false, message: errorMessage };
    }
  }
}));