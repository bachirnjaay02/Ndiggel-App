const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { memberId, memberName, associationId, amount, period, method } = req.body || {};
  if (!memberId || !associationId || !amount || !period) {
    return res.status(400).json({ error: 'Paramètres manquants (memberId, associationId, amount, period)' });
  }

  const PAYTECH_API_KEY    = process.env.PAYTECH_API_KEY;
  const PAYTECH_API_SECRET = process.env.PAYTECH_API_SECRET;
  if (!PAYTECH_API_KEY || !PAYTECH_API_SECRET) {
    return res.status(500).json({ error: 'PayTech non configuré sur ce serveur' });
  }

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  // Reject if already paid
  const { data: paid } = await supabase
    .from('cotisations')
    .select('id')
    .eq('member_id', memberId)
    .eq('period', period)
    .eq('status', 'paid')
    .maybeSingle();

  if (paid) return res.status(409).json({ error: 'Cotisation déjà payée pour cette période' });

  // Reuse existing pending record or create a new one
  let cotisationId;
  const { data: pending } = await supabase
    .from('cotisations')
    .select('id')
    .eq('member_id', memberId)
    .eq('period', period)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending) {
    await supabase.from('cotisations')
      .update({ method: method ?? 'orange_money' })
      .eq('id', pending.id);
    cotisationId = pending.id;
  } else {
    const { data: created, error } = await supabase
      .from('cotisations')
      .insert({
        member_id:      memberId,
        association_id: associationId,
        amount,
        method:         method ?? 'orange_money',
        status:         'pending',
        period,
      })
      .select('id')
      .single();
    if (error || !created) return res.status(500).json({ error: error?.message || 'Erreur base de données' });
    cotisationId = created.id;
  }

  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const base  = `${proto}://${host}`;

  const methodLabel = method === 'wave' ? 'Wave' : 'Orange Money';
  const paytechBody = {
    item_name:    `Cotisation ${period} — ${memberName ?? 'Membre'} via ${methodLabel}`,
    item_price:   amount,
    command_name: `cotis_${cotisationId}`,
    currency:     'XOF',
    notify_url:   `${base}/api/paytech/cotisation-ipn`,
    success_url:  `${base}/member/pay?payment=success&period=${encodeURIComponent(period)}`,
    cancel_url:   `${base}/member/pay?payment=cancel`,
    custom_field: JSON.stringify({ cotisation_id: cotisationId }),
    env:          'prod',
  };

  let paytechData;
  try {
    const r = await fetch('https://paytech.sn/api/payment/request-payment', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY':       PAYTECH_API_KEY,
        'API_SECRET':    PAYTECH_API_SECRET,
      },
      body: JSON.stringify(paytechBody),
    });
    paytechData = await r.json();
  } catch {
    return res.status(502).json({ error: 'Impossible de contacter PayTech' });
  }

  if (!paytechData.success || !paytechData.redirect_url) {
    return res.status(502).json({ error: 'Réponse PayTech invalide', details: paytechData });
  }

  return res.status(200).json({ redirect_url: paytechData.redirect_url });
};
