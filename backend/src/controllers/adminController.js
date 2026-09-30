// ============================================================
// Contrôleur ADMIN
// ============================================================
import * as adminService from '../services/adminService.js'

export async function tableauDeBord(req, res) {
  res.json(await adminService.tableauDeBord())
}

export async function parametresPublics(req, res) {
  res.json(await adminService.parametresPublics())
}

export async function parametres(req, res) {
  res.json(await adminService.parametres())
}

export async function modifierParametre(req, res) {
  res.json(await adminService.modifierParametre(req.utilisateur, req.params.cle, req.body.valeur, req.ip))
}

export async function journal(req, res) {
  res.json(await adminService.journal())
}
