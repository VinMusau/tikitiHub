import { create } from 'zustand';
import apiClient from '../lib/client';

interface BookingState {
  bookings: any[];
  loading: boolean;
  error: string | null;
  fetchUserBookings: () => Promise<void>;
  redeemTicketGateScan: (qrToken: string) => Promise<ScanResponse>;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  loading: false,
  error: null,

  fetchUserBookings: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/bookings/my-bookings');
      const data = response.data || response;
      set({ bookings: data, loading: false });
    } catch (err: any) {
      console.error("Store error fetching bookings:", err);
      set({ error: 'Failed to sync your tickets', loading: false });
    }
  },

  redeemTicketGateScan: async (qrToken: string) => {
    try {
      const { data } = await apiClient.post('/bookings/redeem', { qrRedemptionToken: qrToken });
      
      const updatedBookings = get().bookings.map((b) => 
        b.qrRedemptionToken === qrToken 
          ? { ...b, status: 'REDEEMED', scannedAt: new Date().toISOString() } 
          : b
      );
      set({ bookings: updatedBookings });
      
      return { 
        success: true, 
        message: data.message || 'Access granted successfully!' 
      };
    } catch (error: any) {
      console.error("Gate scanning operation failure exception:", error);
      
      const targetError = error.response?.data?.error || 'Validation failure across ticket portal.';
      return { 
        success: false, 
        message: targetError 
      };
    }
  }
}));