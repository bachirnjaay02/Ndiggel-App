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

  return res.status(200).json({ sent: true, period: currentPeriod });
};
