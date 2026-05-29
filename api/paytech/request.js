const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { associationId, plan, amount } = req.body || {};
  if (!associationId || !plan || !amount) {
    return res.status(400).json({ error: 'Paramètres manquants (associationId, plan, amount)' });
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

  // Record the pending payment
  const { data: payment, error: paymentError } = await supabase
    .from('subscription_payments')
    .insert({ association_id: associationId, plan, amount, status: 'pending' })
    .select()
    .single();

  if (paymentError || !payment) {
    return res.status(500).json({ error: paymentError?.message || 'Erreur base de données' });
  }

  const host    = req.headers['x-forwarded-host'] || req.headers.host;
  const proto   = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;

  const body = {
    item_name:    `Abonnement Ndiggël — Plan ${plan}`,
    item_price:   amount,
    command_name: `ndiggel_sub_${payment.id}`,
    currency:     'XOF',
    notify_url:   `${baseUrl}/api/paytech/ipn`,
    success_url:  `${baseUrl}/admin/settings?payment=success&plan=${plan}`,
    cancel_url:   `${baseUrl}/admin/settings?payment=cancel`,
    custom_field: JSON.stringify({ payment_id: payment.id, association_id: associationId, plan }),
    env:          'prod',
  };

  let paytechData;
  try {
    const paytechRes = await fetch('https://paytech.sn/api/payment/request-payment', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY':       PAYTECH_API_KEY,
        'API_SECRET':    PAYTECH_API_SECRET,
      },
      body: JSON.stringify(body),
    });
    paytechData = await paytechRes.json();
  } catch (fetchErr) {
    return res.status(502).json({ error: 'Impossible de contacter PayTech' });
  }

  if (!paytechData.success || !paytechData.redirect_url) {
    return res.status(502).json({ error: 'Réponse PayTech invalide', details: paytechData });
  }

  // Store PayTech token for verification
  await supabase
    .from('subscription_payments')
    .update({ paytech_token: paytechData.token })
    .eq('id', payment.id);

  return res.status(200).json({ redirect_url: paytechData.redirect_url });
};
