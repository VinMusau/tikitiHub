import { create } from 'zustand';
import apiClient from '../lib/client';

interface PaymentState {
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  checkoutRequestId: string | null;

  /**
   * Trigger M-Pesa STK push for a specific tier purchase.
   * The server computes the amount (tierPrice * quantity * fee) — the client
   * does not send it.
   */
  initiateMpesaPush: (phone: string, tierId: number, quantity: number) => Promise<boolean>;
  clearPaymentState: () => void;
}

export const usePaymentStore = create<PaymentState>((set) => ({
  loading: false,
  error: null,
  successMessage: null,
  checkoutRequestId: null,

  initiateMpesaPush: async (phone, tierId, quantity) => {
    set({ loading: true, error: null, successMessage: null });

    try {
      const { data } = await apiClient.post('/payments/stk-push', {
        phone,
        tierId,
        quantity,
      });

      if (data && data.ResponseCode === '0') {
        set({
          loading: false,
          checkoutRequestId: data.CheckoutRequestID,
          successMessage:
            'STK Push sent successfully! Check your device to enter your M-Pesa PIN.',
          error: null,
        });
        return true;
      }

      set({
        loading: false,
        error: data?.CustomerMessage || 'Failed to trigger the M-Pesa push.',
      });
      return false;
    } catch (error: any) {
      console.error('M-Pesa execution initialization failure:', error);
      const apiError = error.response?.data;
      const msg =
        apiError?.error ||
        (apiError?.fields && Object.values(apiError.fields)[0]) ||
        'Unable to dispatch request to Daraja network API gateway.';
      set({ loading: false, error: msg as string });
      return false;
    }
  },

  clearPaymentState: () =>
    set({
      loading: false,
      error: null,
      successMessage: null,
      checkoutRequestId: null,
    }),
}));