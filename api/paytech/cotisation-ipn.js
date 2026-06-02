const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type_event, custom_field, ref_command } = req.body || {};

  if (type_event !== 'sale_complete') return res.status(200).json({ received: true });

  let customData;
  try {
    customData = typeof custom_field === 'string' ? JSON.parse(custom_field) : custom_field;
  } catch {
    return res.status(400).json({ error: 'custom_field invalide' });
  }

  const { cotisation_id } = customData || {};
  if (!cotisation_id) return res.status(400).json({ error: 'cotisation_id manquant' });

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY
  );

  const { error } = await supabase
    .from('cotisations')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', cotisation_id)
    .eq('status', 'pending');

  if (error) {
    console.error('[cotisation-ipn]', error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ received: true });
};
