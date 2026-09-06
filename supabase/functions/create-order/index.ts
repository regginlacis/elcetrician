import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const { name, email, urgency, message } = await request.json();
  if (!name || !email || !["normal", "soon", "urgent"].includes(urgency)) {
    return new Response(JSON.stringify({ error: "Invalid order" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase server configuration is incomplete" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: order, error } = await supabase.from("service_orders").insert({ name, email, urgency, message }).select().single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const urgencyLabel = urgency === "urgent" ? "URGENT" : urgency === "soon" ? "Soon" : "Planned";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const toEmail = Deno.env.get("ORDER_TO_EMAIL");
  if (!resendKey || !fromEmail || !toEmail) {
    return new Response(JSON.stringify({ error: "Order saved but email configuration is incomplete", orderId: order.id }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let resend: Response;
  try {
    resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `[${urgencyLabel}] New GreenVolt service request`,
        text: `Name: ${name}\nEmail: ${email}\nUrgency: ${urgencyLabel}\n\n${message || "(No details provided)"}`,
      }),
    });
  } catch (emailError) {
    console.error("Resend request failed", emailError);
    return new Response(JSON.stringify({ error: "Order saved but email provider could not be reached", orderId: order.id }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!resend.ok) {
    const resendError = await resend.text();
    console.error("Resend rejected email", resend.status, resendError);
    return new Response(JSON.stringify({ error: "Order saved but email notification failed", providerStatus: resend.status, providerMessage: resendError, orderId: order.id }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ ok: true, orderId: order.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
