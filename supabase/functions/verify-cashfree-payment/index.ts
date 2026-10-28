import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CF_API_BASE = "https://sandbox.cashfree.com/pg";
const CF_API_VERSION = "2023-08-01";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cfAppId = Deno.env.get("CF_APP_ID");
    const cfSecretKey = Deno.env.get("CF_SECRET_KEY");
    if (!cfAppId || !cfSecretKey) {
      return jsonResponse(503, {
        error: "Cashfree credentials not configured. Set CF_APP_ID and CF_SECRET_KEY as edge function secrets.",
      });
    }

    // Accept either query param (redirect return) or JSON body (polling)
    let orderId: string | null = null;
    let callerUserId: string | null = null;

    if (req.method === "GET") {
      const url = new URL(req.url);
      orderId = url.searchParams.get("order_id");
    } else if (req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData.user) {
          callerUserId = userData.user.id;
        }
      }
      const body = await req.json();
      orderId = body.orderId;
    }

    if (!orderId) {
      return jsonResponse(400, { error: "order_id is required" });
    }

    // Find the transaction by gateway_order_id
    let query = supabase.from("transactions").select("*").eq("gateway_order_id", orderId);
    if (callerUserId) {
      query = query.eq("sender_id", callerUserId);
    }
    const { data: txn, error: txnErr } = await query.maybeSingle();

    if (txnErr || !txn) {
      return jsonResponse(404, { error: "Transaction not found for this order" });
    }

    // If already confirmed, return current state
    if (txn.status !== "pending" && txn.status !== "processing") {
      return jsonResponse(200, {
        status: txn.status,
        gatewayPaymentId: txn.gateway_payment_id,
        transactionId: txn.id,
        referenceId: txn.reference_id,
        alreadyProcessed: true,
      });
    }

    // Fetch payments for this order from Cashfree
    const cfResponse = await fetch(`${CF_API_BASE}/orders/${orderId}/payments`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": CF_API_VERSION,
        "x-client-id": cfAppId,
        "x-client-secret": cfSecretKey,
      },
    });

    const cfPayments = await cfResponse.json();

    if (!cfResponse.ok) {
      return jsonResponse(cfResponse.status, {
        error: "Failed to fetch payment status from Cashfree",
        details: cfPayments.message || cfPayments.error || JSON.stringify(cfPayments),
      });
    }

    const payments = Array.isArray(cfPayments) ? cfPayments : [];
    if (payments.length === 0) {
      return jsonResponse(200, {
        status: "pending",
        transactionId: txn.id,
        referenceId: txn.reference_id,
        message: "No payment attempts yet",
      });
    }

    const successfulPayment = payments.find((p: { payment_status: string }) =>
      p.payment_status === "SUCCESS" || p.payment_status === "PAID"
    );
    const latestPayment = successfulPayment || payments[payments.length - 1];

    let finalStatus = "pending";
    const cfPaymentStatus = latestPayment.payment_status?.toUpperCase();

    if (cfPaymentStatus === "SUCCESS" || cfPaymentStatus === "PAID") {
      finalStatus = "success";
    } else if (cfPaymentStatus === "FAILED" || cfPaymentStatus === "EXPIRED") {
      finalStatus = "failed";
    } else if (cfPaymentStatus === "CANCELLED" || cfPaymentStatus === "USER_DROPPED") {
      finalStatus = "cancelled";
    } else {
      return jsonResponse(200, {
        status: "pending",
        transactionId: txn.id,
        referenceId: txn.reference_id,
        cfPaymentStatus,
      });
    }

    // Confirm the payment server-side using the service role RPC
    const { error: confirmError } = await supabase.rpc("confirm_gateway_payment", {
      p_transaction_id: txn.id,
      p_gateway_payment_id: latestPayment.cf_payment_id || latestPayment.payment_id,
      p_final_status: finalStatus,
    });

    if (confirmError) {
      return jsonResponse(500, {
        error: "Failed to confirm payment",
        details: confirmError.message,
      });
    }

    return jsonResponse(200, {
      status: finalStatus,
      gatewayPaymentId: latestPayment.cf_payment_id || latestPayment.payment_id,
      transactionId: txn.id,
      referenceId: txn.reference_id,
      cfPaymentStatus,
    });
  } catch (err) {
    return jsonResponse(500, {
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err),
    });
  }

  function jsonResponse(status: number, data: unknown) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
// verify-cashfree-payment v2
