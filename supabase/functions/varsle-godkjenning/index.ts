// UTKAST: Edge Function som sender pushvarsel til alle voksne i familien
// når et barn krysser av en oppgave (status = 'venter').
// Kobles til en Database Webhook på INSERT i public.utforelser.
//
// Flyt:
//  1. Les ny rad fra webhook-payload.
//  2. Finn voksne i familien og deres Expo push-tokens (push_mottakere).
//  3. Send til https://exp.host/--/api/v2/push/send, f.eks.
//     "Emma har ryddet (stuen) – 20 kr. Trykk for å godkjenne."
//
// Bygges etter at designet er godkjent.
Deno.serve(() => new Response('Ikke implementert', { status: 501 }));
