/**
 * Vercel Cron Job — appelé automatiquement chaque jour à 08:00 UTC.
 * Envoie les rappels de cotisation aux associations dont c'est le jour configuré.
 */
const { createClient } = require('@supabase/supabase-js');

const MONTHS_FR = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const supabase = createClient(
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_ANON_KEY,
  );

  const now           = new Date();
  const today         = now.getDate();
  const currentPeriod = `${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;

  // Associations where auto-reminder is enabled AND today matches the configured day
  const { data: associations } = await supabase
    .from('associations')
    .select('id, auto_reminder_message, auto_reminder_last_period')
    .eq('auto_reminder_enabled', true)
    .eq('auto_reminder_day', today);

  if (!associations?.length) {
    return res.status(200).json({ processed: 0, sent: 0 });
  }

  let sent = 0;
  for (const assoc of associations) {
    // Skip if already sent this period
    if (assoc.auto_reminder_last_period === currentPeriod) continue;

    const message = assoc.auto_reminder_message
      || 'Bonjour, n\'oubliez pas de régler votre cotisation du mois. Merci !';

    const { error } = await supabase.from('notifications').insert({
      association_id: assoc.id,
      title:          `Rappel : Cotisation ${currentPeriod}`,
      message,
      type:           'reminder',
      target:         'pending',
    });

    if (!error) {
      await supabase.from('associations')
        .update({ auto_reminder_last_period: currentPeriod })
        .eq('id', assoc.id);
      sent++;
    }
  }

  return res.status(200).json({ processed: associations.length, sent, period: currentPeriod });
};
