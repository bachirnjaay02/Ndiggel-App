const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { associationId, title, body, url = '/member/notifications' } = req.body || {};
  if (!associationId || !title) return res.status(400).json({ error: 'Paramètres manquants' });

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(200).json({ sent: 0, reason: 'VAPID non configuré' });
  }

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'contact@ndiggel.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('association_id', associationId);

  if (!subs?.length) return res.status(200).json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  const expired = [];

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) expired.push(sub.endpoint);
    }
  }));

  // Nettoyer les abonnements expirés
  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired);
  }

  return res.status(200).json({ sent, total: subs.length });
};
