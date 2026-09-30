// ============================================================
// Modèle JOURNAL_ADMIN (traçabilité des actions sensibles)
// ------------------------------------------------------------
// On peut seulement ajouter et lire : la base interdit toute
// modification ou suppression (RG01.6).
// ============================================================
import { requete } from '../config/db.js'

export async function ajouter({ idAdmin, action, tableCible, idCible = null, details = null, ip = null }, cx) {
  await requete(
    'INSERT INTO journal_admin (action, table_cible, id_cible, details, adresse_ip, id_admin) VALUES (?, ?, ?, ?, ?, ?)',
    [action, tableCible, idCible, details ? details.slice(0, 500) : null, ip, idAdmin], cx)
}

export async function lister(limite = 100) {
  const lignes = await requete(
    `SELECT j.*, a.prenom, a.nom FROM journal_admin j JOIN administrateur a ON a.id_admin = j.id_admin
      ORDER BY j.date_action DESC, j.id_journal DESC LIMIT ${Number(limite)}`)
  return lignes.map((l) => ({
    id: l.id_journal,
    date: l.date_action,
    administrateur: l.prenom + ' ' + l.nom,
    action: l.action,
    cible: l.table_cible + (l.id_cible ? ' #' + l.id_cible : ''),
    details: l.details,
    ip: l.adresse_ip
  }))
}
