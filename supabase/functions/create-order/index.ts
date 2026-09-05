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

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order, error } = await supabase.from("service_orders").insert({ name, email, urgency, message }).select().single();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const urgencyLabel = urgency === "urgent" ? "URGENT" : urgency === "soon" ? "Soon" : "Planned";
  const resend = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM_EMAIL"),
      to: [Deno.env.get("ORDER_TO_EMAIL")],
      subject: `[${urgencyLabel}] New GreenVolt service request`,
      text: `Name: ${name}\nEmail: ${email}\nUrgency: ${urgencyLabel}\n\n${message || "(No details provided)"}`,
    }),
  });
  if (!resend.ok) return new Response(JSON.stringify({ error: "Order saved but email notification failed", orderId: order.id }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  return new Response(JSON.stringify({ ok: true, orderId: order.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
