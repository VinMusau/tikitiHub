import { create } from 'zustand';
import apiClient from '../lib/client';

interface PaymentState {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  checkoutRequestId: string | null;
  
  initiateMpesaPush: (phone: string, amount: number, ticketId: number, quantity: number) => Promise<boolean>;
  clearPaymentState: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  loading: false,
  error: null,
  successMessage: null,
  checkoutRequestId: null,

  initiateMpesaPush: async (phone, amount, ticketId, quantity) => {
    set({ loading: true, error: null, successMessage: null });
    try {
      const { data } = await apiClient.post('/payments/stk-push', {
        phone,
        amount: Math.round(amount).toString(),
        ticketId: ticketId.toString(),
        quantity: quantity.toString()
      });
      console.log("=== DARAJA RESPONDED WITH ===", data);

      if (data && data.ResponseCode === "0") {
        set({
          loading: false,
          checkoutRequestId: data.CheckoutRequestID,
          successMessage: "STK Push sent successfully! Check your device to enter your M-Pesa PIN.",
          error: null
        });
        return true;
      } else {
        set({ 
          loading: false, 
          error: data.CustomerMessage || "Failed to trigger the M-Pesa push menu engine." 
        });
        return false;
      }
    } catch (error: any) {
      console.error("M-Pesa execution initialization failure:", error);
      const msg = error.response?.data?.error || "Unable to dispatch request to Daraja network API gateway.";
      set({ loading: false, error: msg });
      return false;
    }
  },

  clearPaymentState: () => set({ loading: false, error: null, successMessage: null, checkoutRequestId: null })
}));