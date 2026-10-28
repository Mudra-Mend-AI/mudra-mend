/// <reference types="vite/client" />

interface Window {
  Cashfree?: (config: { mode: 'sandbox' | 'production' }) => {
    checkout: (options: {
      paymentSessionId: string;
      redirectTarget?: string;
      onSuccess?: (data: { order?: { order_id?: string }; payment?: { cf_payment_id?: string } }) => void;
      onFailure?: (data: { order?: { order_id?: string }; payment?: { cf_payment_id?: string } }) => void;
      onClose?: () => void;
    }) => Promise<{ error?: unknown; redirect?: boolean; paymentDetails?: { paymentMessage?: string } }>;
  };
}
