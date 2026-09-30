// ============================================================
// Contrôleur PAIEMENT (administrateur)
// ============================================================
import * as paiementService from '../services/paiementService.js'

export async function transactions(req, res) {
  res.json(await paiementService.transactions())
}
