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

    // Verify the caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Authorization required" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse(401, { error: "Invalid or expired session" });
    }

    const cfAppId = Deno.env.get("CF_APP_ID");
    const cfSecretKey = Deno.env.get("CF_SECRET_KEY");
    if (!cfAppId || !cfSecretKey) {
      return jsonResponse(503, {
        error: "Cashfree credentials not configured. Set CF_APP_ID and CF_SECRET_KEY as edge function secrets.",
      });
    }

    const body = await req.json();
    const {
      amount,
      recipientName,
      recipientAccount,
      recipientIfsc,
      recipientUpi,
      recipientMobile,
      purpose,
      paymentMode,
      assessmentId,
      idempotencyKey,
      returnUrl,
    } = body;

    if (!amount || amount <= 0) {
      return jsonResponse(400, { error: "A valid amount greater than 0 is required" });
    }

    // Idempotency: check if a transaction with this key already exists
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        // If already has a gateway order, return it
        if (existing.gateway_order_id && existing.status === "pending") {
          // Re-create the Cashfree order session
          const cfResp = await createCashfreeOrder(
            cfAppId, cfSecretKey,
            existing.gateway_order_id,
            amount, recipientName
          );
          if (cfResp.ok) {
            const cfData = await cfResp.json();
            return jsonResponse(200, {
              orderId: existing.gateway_order_id,
              paymentSessionId: cfData.payment_session_id,
              transactionId: existing.id,
              referenceId: existing.reference_id,
            });
          }
        }
        return jsonResponse(200, {
          transactionId: existing.id,
          referenceId: existing.reference_id,
          status: existing.status,
          alreadyExists: true,
        });
      }
    }

    const referenceId = "CF-" + Date.now().toString(36).toUpperCase();
    const orderId = "order_" + crypto.randomUUID().replace(/-/g, "");

    // Insert a pending transaction record with the service role
    const recipientRef = {
      name: recipientName || "Recipient",
      account: recipientAccount || null,
      ifsc: recipientIfsc || null,
      upi: recipientUpi || null,
      mobile: recipientMobile || null,
    };

    const { data: txn, error: txnErr } = await supabase
      .from("transactions")
      .insert({
        sender_id: userData.user.id,
        recipient_ref: recipientRef,
        amount: amount,
        currency: "INR",
        status: "pending",
        payment_mode: paymentMode || "upi",
        purpose: purpose || null,
        reference_id: referenceId,
        is_simulated: false,
        assessment_id: assessmentId || null,
        idempotency_key: idempotencyKey || null,
        gateway: "cashfree",
        gateway_order_id: orderId,
        risk_score: body.riskScore ?? null,
        ai_recommended_action: body.aiRecommendedAction ?? null,
      })
      .select()
      .single();

    if (txnErr || !txn) {
      return jsonResponse(500, {
        error: "Failed to create transaction record",
        details: txnErr?.message || "Unknown database error",
      });
    }

    // Create the order in Cashfree
    const cfResponse = await createCashfreeOrder(
      cfAppId, cfSecretKey, orderId, amount, recipientName
    );

    const cfData = await cfResponse.json();

    if (!cfResponse.ok) {
      // Update transaction to failed since order creation failed
      await supabase
        .from("transactions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", txn.id);

      return jsonResponse(cfResponse.status, {
        error: "Cashfree order creation failed",
        details: cfData.message || cfData.error || JSON.stringify(cfData),
      });
    }

    return jsonResponse(200, {
      orderId: orderId,
      paymentSessionId: cfData.payment_session_id,
      transactionId: txn.id,
      referenceId: referenceId,
    });
  } catch (err) {
    return jsonResponse(500, {
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err),
    });
  }

  async function createCashfreeOrder(
    appId: string,
    secretKey: string,
    orderId: string,
    amount: number,
    customerName: string
  ): Promise<Response> {
    return fetch(`${CF_API_BASE}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": CF_API_VERSION,
        "x-client-id": appId,
        "x-client-secret": secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: "guest",
          customer_name: customerName || "Customer",
          customer_phone: "9999999999",
          customer_email: "guest@example.com",
        },
        order_meta: {
          return_url: returnUrl
            ? `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}order_id=${orderId}`
            : `${Deno.env.get("SUPABASE_URL")}/functions/v1/verify-cashfree-payment?order_id=${orderId}`,
          payment_methods: null,
        },
      }),
    });
  }

  function jsonResponse(status: number, data: unknown) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
// create-cashfree-order v5 — returnUrl support
