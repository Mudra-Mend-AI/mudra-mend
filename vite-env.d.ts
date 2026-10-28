/// <reference types="vite/client" />

interface Window {
  cashfree?: {
    paymentSessionId: string;
    redirect?: (target: string) => void;
    checkout: (options: {
      paymentSessionId: string;
      redirectTarget?: string;
      onSuccess?: (data: { order?: { order_id?: string }; payment?: { cf_payment_id?: string } }) => void;
      onFailure?: (data: { order?: { order_id?: string }; payment?: { cf_payment_id?: string } }) => void;
      onClose?: () => void;
    }) => void;
  };
}
