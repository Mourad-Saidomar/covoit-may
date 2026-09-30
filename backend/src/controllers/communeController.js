// ============================================================
// Contrôleur COMMUNE
// ============================================================
import * as communeService from '../services/communeService.js'

export async function lister(req, res) {
  res.json(await communeService.lister())
}
