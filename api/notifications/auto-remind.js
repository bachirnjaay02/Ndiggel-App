const webpush    = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { associationId } = req.body || {};
  if (!associationId) return res.status(400).json({ error: 'associationId requis' });

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
  );

  const { data: assoc, error: assocErr } = await supabase
    .from('associations')
    .select('auto_reminder_enabled, auto_reminder_message, auto_reminder_last_period')
    .eq('id', associationId)
    .single();

  if (assocErr || !assoc) return res.status(404).json({ error: 'Association introuvable' });

  const now = new Date();
  const currentPeriod = `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;

  // Already sent for this period — skip
  if (assoc.auto_reminder_last_period === currentPeriod) {
    return res.status(200).json({ sent: false, reason: 'already_sent', period: currentPeriod });
  }

  const message = assoc.auto_reminder_message
    || 'Bonjour, n\'oubliez pas de régler votre cotisation du mois. Merci !';

  const { error: insertErr } = await supabase.from('notifications').insert({
    association_id: associationId,
    title:          `Rappel : Cotisation ${currentPeriod}`,
    message,
    type:           'reminder',
    target:         'pending',
  });

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  await supabase.from('associations')
    .update({ auto_reminder_last_period: currentPeriod })
    .eq('id', associationId);

  // Envoyer aussi les push notifications
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    try {
      webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL || 'contact@ndiggel.app'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
      );
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('association_id', associationId);

      if (subs?.length) {
        const payload = JSON.stringify({
          title: `Rappel : Cotisation ${currentPeriod}`,
          body:  message,
          url:   '/member/notifications',
        });
        const expired = [];
        await Promise.all(subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
            );
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) expired.push(sub.endpoint);
          }
        }));
        if (expired.length > 0) {
          await supabase.from('push_subscriptions').delete().in('endpoint', expired);
        }
      }
    } catch {}
  }

  return res.status(200).json({ sent: true, period: currentPeriod });
};
