import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Stripe status → DB status (Portuguese)
const STATUS_MAP: Record<string, string> = {
  trialing: "testando",
  active: "ativo",
  past_due: "vencido",
  unpaid: "vencido",
  canceled: "cancelado",
  incomplete: "inativo",
  incomplete_expired: "inativo",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    let event: Stripe.Event;
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
      logStep("WARNING: No webhook secret configured");
    }

    logStep("Event received", { type: event.type, id: event.id });

    const updateProfile = async (customerEmail: string, updates: Record<string, any>) => {
      const { data: profile, error: findErr } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", customerEmail)
        .single();

      if (findErr || !profile) {
        logStep("Profile not found", { customerEmail, error: findErr });
        return;
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updates)
        .eq("user_id", profile.user_id);

      if (error) logStep("Error updating profile", { error });
      else logStep("Profile updated", { userId: profile.user_id, updates });
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email || session.customer_email;
        if (!customerEmail) { logStep("No email in checkout session"); break; }

        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

        let status = "ativo";
        let periodEnd: string | null = null;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          status = STATUS_MAP[sub.status] || "inativo";
          periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }

        await updateProfile(customerEmail, {
          stripe_customer_id: customerId,
          subscription_status: status,
          current_period_end: periodEnd,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (!customer.email) break;

        await updateProfile(customer.email, {
          subscription_status: STATUS_MAP[subscription.status] || "inativo",
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerEmail = invoice.customer_email;
        if (!customerEmail) break;
        await updateProfile(customerEmail, { subscription_status: "vencido" });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (!customer.email) break;
        await updateProfile(customer.email, { subscription_status: "cancelado" });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
