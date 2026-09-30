// ============================================================
// Contrôleur DOCUMENTS : envoie le PDF en téléchargement
// ============================================================
import * as documentService from '../services/documentService.js'

// Un PDF contient des données personnelles : jamais gardé en cache
function envoyerPdf(res, { nom, contenu }) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${nom}"`,
    'Cache-Control': 'no-store'
  })
  res.send(contenu)
}

export async function recu(req, res) {
  envoyerPdf(res, await documentService.recu(req.utilisateur, req.params.id))
}

export async function releve(req, res) {
  envoyerPdf(res, await documentService.releveMensuel(req.utilisateur, req.params.mois))
}

export async function rapportActivite(req, res) {
  envoyerPdf(res, await documentService.rapportActivite(req.utilisateur, req.params.mois))
}

export async function transactions(req, res) {
  envoyerPdf(res, await documentService.releveTransactions(req.utilisateur, req.params.mois))
}

export async function journal(req, res) {
  envoyerPdf(res, await documentService.journalAdmin(req.utilisateur, req.params.mois))
}
