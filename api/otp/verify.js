// OTP authentication has been removed. Authentication is now done via phone + password.
module.exports = async function handler(req, res) {
  return res.status(410).json({
    error: 'Le système OTP a été supprimé. Utilisez votre numéro et mot de passe pour vous connecter.',
  });
};
