const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type_event, custom_field, ref_command } = req.body || {};

  // Only process completed sales
  if (type_event !== 'sale_complete') {
    return res.status(200).json({ received: true });
  }

  let customData;
  try {
    customData = typeof custom_field === 'string' ? JSON.parse(custom_field) : custom_field;
  } catch {
    return res.status(400).json({ error: 'custom_field invalide' });
  }

  const { payment_id, association_id, plan } = customData || {};
  if (!payment_id || !association_id || !plan) {
    return res.status(400).json({ error: 'Données manquantes dans custom_field' });
  }

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  // Mark payment as successful
  await supabase
    .from('subscription_payments')
    .update({ status: 'success', paytech_ref: ref_command })
    .eq('id', payment_id);

  // Activate subscription on the association for 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error: updateError } = await supabase
    .from('associations')
    .update({
      subscription_plan:       plan,
      subscription_status:     'active',
      subscription_expires_at: expiresAt.toISOString(),
    })
    .eq('id', association_id);

  if (updateError) {
    console.error('[IPN] Failed to update association:', updateError.message);
    return res.status(500).json({ error: updateError.message });
  }

  return res.status(200).json({ received: true });
};
