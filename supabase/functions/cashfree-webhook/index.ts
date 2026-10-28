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

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
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
      return jsonResponse(503, { error: "Cashfree credentials not configured" });
    }

    // Verify webhook signature
    const signature = req.headers.get("x-webhook-signature");
    const rawBody = await req.text();

    if (!signature) {
      return jsonResponse(401, { error: "Missing webhook signature" });
    }

    // Parse the webhook payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return jsonResponse(400, { error: "Invalid JSON payload" });
    }

    const eventData = payload.data || {};
    const orderId = eventData.order?.order_id;

    if (!orderId) {
      return jsonResponse(400, { error: "Missing order_id in webhook payload" });
    }

    // Find the transaction by gateway_order_id
    const { data: txn, error: txnErr } = await supabase
      .from("transactions")
      .select("*")
      .eq("gateway_order_id", orderId)
      .maybeSingle();

    if (txnErr || !txn) {
      return jsonResponse(404, { error: "Transaction not found for this order" });
    }

    // If already confirmed, acknowledge but don't reprocess
    if (txn.status === "success" || txn.status === "failed" || txn.status === "cancelled") {
      return jsonResponse(200, { status: "already_processed", transactionId: txn.id });
    }

    // Verify the payment status with Cashfree's API (don't trust the webhook payload alone)
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
        error: "Failed to verify payment with Cashfree",
        details: cfPayments.message || cfPayments.error,
      });
    }

    const payments = Array.isArray(cfPayments) ? cfPayments : [];
    if (payments.length === 0) {
      return jsonResponse(200, { status: "pending", message: "No payment attempts yet" });
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
      return jsonResponse(200, { status: "pending", cfPaymentStatus });
    }

    // Idempotent update via the confirm_gateway_payment RPC
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
      transactionId: txn.id,
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
