const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { memberId, associationId, subscription } = req.body || {};
  if (!memberId || !associationId || !subscription?.endpoint) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
  );

  const { error } = await supabase.from('push_subscriptions').upsert({
    member_id:      memberId,
    association_id: associationId,
    endpoint:       subscription.endpoint,
    p256dh:         subscription.keys?.p256dh ?? '',
    auth:           subscription.keys?.auth    ?? '',
  }, { onConflict: 'endpoint' });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
};
