// ============================================================
// Modèle DEMANDE_CONDUCTEUR (vérification d'identité)
// ============================================================
import { requete } from '../config/db.js'

// Les noms de fichiers ne sont jamais envoyés au navigateur : seulement
// le fait qu'ils existent encore (l'administrateur les télécharge par l'API)
export function versDemande(l) {
  const demande = {
    id: l.id_demande,
    vehicule: {
      marque: l.marque,
      modele: l.modele,
      couleur: l.couleur,
      immatriculation: l.immatriculation,
      nbPlaces: l.nb_places
    },
    justificatifsDisponibles: l.fichier_identite !== null && l.fichier_permis !== null,
    statut: l.statut,
    motifRefus: l.motif_refus,
    date: l.date_demande,
    dateTraitement: l.date_traitement,
    utilisateurId: l.id_utilisateur
  }
  if (l.prenom !== undefined) {
    demande.utilisateur = { prenom: l.prenom, nom: l.nom, email: l.email, telephone: l.telephone, role: l.role }
  }
  return demande
}

export async function creer(d, fichiers, idUtilisateur) {
  const resultat = await requete(
    `INSERT INTO demande_conducteur (marque, modele, couleur, immatriculation, nb_places, fichier_identite, fichier_permis, id_utilisateur)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.marque, d.modele, d.couleur || null, d.immatriculation, d.nbPlaces, fichiers.identite, fichiers.permis, idUtilisateur])
  return resultat.insertId
}

export async function trouverParId(id, cx) {
  const [ligne] = await requete('SELECT * FROM demande_conducteur WHERE id_demande = ?', [id], cx)
  return ligne || null
}

export async function listerParUtilisateur(idUtilisateur) {
  return requete('SELECT * FROM demande_conducteur WHERE id_utilisateur = ? ORDER BY date_demande DESC', [idUtilisateur])
}

export async function lister(statut) {
  return requete(
    `SELECT d.*, u.prenom, u.nom, u.email, u.telephone, u.role
       FROM demande_conducteur d JOIN utilisateur u ON u.id_utilisateur = d.id_utilisateur
      WHERE (? IS NULL OR d.statut = ?)
      ORDER BY d.statut = 'en_attente' DESC, d.date_demande DESC`, [statut || null, statut || null])
}

export async function accepter(id, idAdmin, cx) {
  await requete("UPDATE demande_conducteur SET statut = 'acceptee', id_admin = ? WHERE id_demande = ?", [idAdmin, id], cx)
}

export async function refuser(id, idAdmin, motif, cx) {
  await requete(
    "UPDATE demande_conducteur SET statut = 'refusee', id_admin = ?, motif_refus = ? WHERE id_demande = ?",
    [idAdmin, motif, id], cx)
}

// Demandes traitées depuis plus de "jours" jours dont les fichiers existent encore (RG08.8)
export async function aPurger(jours) {
  return requete(
    `SELECT id_demande, fichier_identite, fichier_permis FROM demande_conducteur
      WHERE statut <> 'en_attente' AND date_traitement < NOW() - INTERVAL ? DAY
        AND (fichier_identite IS NOT NULL OR fichier_permis IS NOT NULL)`, [jours])
}

export async function effacerFichiers(id) {
  await requete('UPDATE demande_conducteur SET fichier_identite = NULL, fichier_permis = NULL WHERE id_demande = ?', [id])
}

export async function aUneDemandeEnAttente(idUtilisateur) {
  const [ligne] = await requete(
    "SELECT COUNT(*) AS nb FROM demande_conducteur WHERE id_utilisateur = ? AND statut = 'en_attente'", [idUtilisateur])
  return ligne.nb > 0
}
