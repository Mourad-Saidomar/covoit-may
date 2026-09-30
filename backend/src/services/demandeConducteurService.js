// ============================================================
// Service DEMANDE CONDUCTEUR (vérification d'identité)
// ------------------------------------------------------------
// Un passager (ou un conducteur inscrit mais pas encore vérifié)
// envoie son véhicule, sa pièce d'identité et son permis.
// L'administrateur accepte ou refuse.
// ============================================================
import fs from 'node:fs/promises'
import path from 'node:path'
import { transaction } from '../config/db.js'
import { ErreurApi } from '../middlewares/errorHandler.js'
import { DOSSIER_JUSTIFICATIFS, supprimerFichiersRecus } from '../middlewares/uploadJustificatifs.js'
import * as demandeModel from '../models/demandeConducteurModel.js'
import * as utilisateurModel from '../models/utilisateurModel.js'
import * as vehiculeModel from '../models/vehiculeModel.js'
import * as journalModel from '../models/journalModel.js'
import * as parametreModel from '../models/parametreModel.js'

export async function deposer(req) {
  const fichiers = {
    identite: req.files.pieceIdentite[0].filename,
    permis: req.files.permis[0].filename
  }
  try {
    // La base vérifie : une seule demande en attente (RG08.2),
    // compte autorisé et pas déjà vérifié (RG08.3)
    const id = await demandeModel.creer(req.body, fichiers, req.utilisateur.id)
    return demandeModel.versDemande(await demandeModel.trouverParId(id))
  } catch (erreur) {
    // Demande refusée par la base : on ne garde pas les fichiers
    supprimerFichiersRecus(req)
    throw erreur
  }
}

export async function mesDemandes(idUtilisateur) {
  const lignes = await demandeModel.listerParUtilisateur(idUtilisateur)
  return lignes.map(demandeModel.versDemande)
}

// ---------- Administrateur ----------

export async function lister(statut) {
  const lignes = await demandeModel.lister(statut)
  return lignes.map(demandeModel.versDemande)
}

// Chemin du justificatif demandé (téléchargement réservé à l'administrateur, RG08.4)
export async function cheminJustificatif(id, type) {
  const demande = await demandeModel.trouverParId(id)
  if (!demande) throw new ErreurApi(404, 'Demande introuvable.')
  const nom = type === 'identite' ? demande.fichier_identite : demande.fichier_permis
  if (!nom) throw new ErreurApi(410, 'Ce justificatif a été effacé (durée de conservation dépassée).')
  // Le nom vient de la base et ne contient que [0-9a-f] + extension :
  // path.basename empêche tout de même de sortir du dossier
  return path.join(DOSSIER_JUSTIFICATIFS, path.basename(nom))
}

async function demandeEnAttente(id, cx) {
  const demande = await demandeModel.trouverParId(id, cx)
  if (!demande) throw new ErreurApi(404, 'Demande introuvable.')
  if (demande.statut !== 'en_attente') throw new ErreurApi(409, 'Cette demande a déjà été traitée.')
  return demande
}

// Acceptation : la personne devient conductrice vérifiée, son véhicule
// est enregistré. Elle garde ses réservations de passager (RG08.7).
export async function accepter(admin, id, ip) {
  await transaction(async function (cx) {
    const demande = await demandeEnAttente(id, cx)
    await utilisateurModel.devenirConducteur(demande.id_utilisateur, admin.id, cx)
    const existant = await vehiculeModel.trouverParImmatriculation(demande.immatriculation, cx)
    if (existant) {
      await vehiculeModel.reactiver(existant.id_vehicule, cx)
    } else {
      await vehiculeModel.creer({
        marque: demande.marque,
        modele: demande.modele,
        couleur: demande.couleur,
        immatriculation: demande.immatriculation,
        nbPlaces: demande.nb_places
      }, demande.id_utilisateur, cx)
    }
    await demandeModel.accepter(id, admin.id, cx)
    await journalModel.ajouter({
      idAdmin: admin.id, action: 'VALIDATION_CONDUCTEUR', tableCible: 'demande_conducteur', idCible: id, ip
    }, cx)
  })
  return demandeModel.versDemande(await demandeModel.trouverParId(id))
}

// Refus motivé (RG08.6). Un conducteur inscrit mais refusé voit son
// compte passer à « refusé » ; un passager reste passager.
export async function refuser(admin, id, motif, ip) {
  await transaction(async function (cx) {
    const demande = await demandeEnAttente(id, cx)
    await demandeModel.refuser(id, admin.id, motif, cx)
    const utilisateur = await utilisateurModel.trouverParId(demande.id_utilisateur, cx)
    if (utilisateur.role === 'conducteur' && utilisateur.statut_compte === 'en_attente') {
      await utilisateurModel.changerStatut(utilisateur.id_utilisateur, 'refuse', cx)
    }
    await journalModel.ajouter({
      idAdmin: admin.id, action: 'REFUS_CONDUCTEUR', tableCible: 'demande_conducteur', idCible: id, details: motif, ip
    }, cx)
  })
  return demandeModel.versDemande(await demandeModel.trouverParId(id))
}

// Effacement des justificatifs 30 jours après la décision (RG08.8).
// Lancé au démarrage du serveur puis une fois par jour.
export async function purgerJustificatifs() {
  const reglages = await parametreModel.valeurs()
  const demandes = await demandeModel.aPurger(reglages.conservation_justificatifs_jours || 30)
  for (const d of demandes) {
    for (const nom of [d.fichier_identite, d.fichier_permis]) {
      if (nom) await fs.rm(path.join(DOSSIER_JUSTIFICATIFS, path.basename(nom)), { force: true })
    }
    await demandeModel.effacerFichiers(d.id_demande)
  }
  return demandes.length
}
