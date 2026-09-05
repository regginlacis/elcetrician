# Order intake setup

Orders should be delivered to `betijalacite@gmail.com`.

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
2. Deploy `supabase/functions/create-order` as an Edge Function.
3. Add these function secrets:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `ORDER_TO_EMAIL`
4. Set the deployed function URL before the closing `</body>` tag:

```html
<script>
  window.GREENVOLT_ORDER_ENDPOINT = "https://YOUR_PROJECT.supabase.co/functions/v1/create-order";
</script>
```

The `urgency` column is indexed so `urgent` orders can be handled before `soon` and `normal` requests in the admin queue. Never put the Supabase service-role key in the website.

## Required accounts

- Create a Supabase account at https://supabase.com.
- Create a Resend account at https://resend.com.
- Resend requires a verified sender/domain for production delivery. Use the verified sender as `RESEND_FROM_EMAIL`.
- Set `ORDER_TO_EMAIL` to `betijalacite@gmail.com`.
