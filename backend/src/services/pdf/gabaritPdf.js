// ============================================================
// Gabarit commun des documents PDF (reçus, relevés, rapports)
// ------------------------------------------------------------
// Construit avec pdfkit, qui dessine le PDF côté serveur : les
// montants viennent de la base, le navigateur ne peut rien modifier.
// Charte du site : vert lagon, corail, crème (voir main.css).
// Utilisation :
//   const pdf = new DocumentPdf({ titre, typeDocument, reference })
//   pdf.titre('Reçu n° …', 'Émis le …')
//   pdf.blocs([...]); pdf.tableau([...], [...]); pdf.totaux([...])
//   const contenu = await pdf.terminer()   // Buffer du PDF
// ============================================================
import PDFDocument from 'pdfkit'

export const COULEURS = {
  vert: '#2D6C58',
  vertFonce: '#1F4D3E',
  vertClair: '#E8F2E9',
  corail: '#F57B57',
  corailFonce: '#DF563B',
  or: '#F6C764',
  creme: '#FBF7EE',
  texte: '#2D4038',
  gris: '#6B7B73',
  ligne: '#E4DFCF',
  blanc: '#FFFFFF'
}

const MARGE = 45
const HAUT_BANDEAU = 80

// Les polices standard du PDF (Helvetica) ne connaissent que l'alphabet
// « Windows-1252 » : on remplace les rares caractères hors de cet alphabet.
export function nettoyer(texte) {
  if (texte === null || texte === undefined) return ''
  return String(texte)
    .replace(/[ -​  ]/g, ' ')
    .replace(/→/g, '–')
    .replace(/[^\u0000-ÿŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]/g, '')
}

// 1234.5 -> « 1 234,50 € » (espace insécable)
export function euros(nombre) {
  const [entier, decimales] = Number(nombre || 0).toFixed(2).split('.')
  return entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + decimales + ' €'
}

// « 2026-09-30 » ou « 2026-09-30 17:42:00 » -> « 30/09/2026 » / « 30/09/2026 à 17:42 »
export function dateFr(texte) {
  if (!texte) return '—'
  const [a, m, j] = String(texte).slice(0, 10).split('-')
  return `${j}/${m}/${a}`
}
export function dateHeureFr(texte) {
  if (!texte) return '—'
  const heure = String(texte).replace('T', ' ').slice(11, 16)
  return heure ? `${dateFr(texte)} à ${heure}` : dateFr(texte)
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
// « 2026-09 » -> « septembre 2026 »
export function moisFr(mois) {
  const [a, m] = mois.split('-')
  return `${MOIS[Number(m) - 1]} ${a}`
}

// Date et heure actuelles à Mayotte, ex. « 30/09/2026 à 17:42 »
export function maintenantMayotte() {
  const parties = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Indian/Mayotte', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).map((p) => [p.type, p.value]))
  return `${parties.day}/${parties.month}/${parties.year} à ${parties.hour}:${parties.minute}`
}

export class DocumentPdf {
  constructor({ titre, typeDocument, reference = '', paysage = false }) {
    this.typeDocument = typeDocument
    this.reference = reference
    this.genereLe = maintenantMayotte()
    this.doc = new PDFDocument({
      size: 'A4',
      layout: paysage ? 'landscape' : 'portrait',
      margins: { top: MARGE, bottom: 60, left: MARGE, right: MARGE },
      bufferPages: true,
      info: { Title: nettoyer(titre), Author: "Covoit'May", Creator: "Covoit'May", Subject: nettoyer(typeDocument) }
    })
    this.morceaux = []
    this.doc.on('data', (m) => this.morceaux.push(m))
    this.largeur = this.doc.page.width - 2 * MARGE
    this.bandeau()
    this.doc.y = HAUT_BANDEAU + 28
  }

  get d() {
    return this.doc
  }

  // Bas de la zone d'écriture (au-dessus du pied de page)
  get bas() {
    return this.doc.page.height - 56
  }

  // ---------- Mise en page ----------

  // Grand bandeau de la première page : marque à gauche, type de document à droite
  bandeau() {
    const d = this.doc
    const l = d.page.width
    d.rect(0, 0, l, HAUT_BANDEAU).fill(COULEURS.vert)
    d.rect(0, HAUT_BANDEAU, l, 4).fill(COULEURS.or)
    d.font('Helvetica-Bold').fontSize(24).fillColor(COULEURS.blanc)
      .text("Covoit'", MARGE, 22, { continued: true }).fillColor(COULEURS.corail).text('May')
    d.font('Helvetica').fontSize(9).fillColor('#CFE3D8').text('Le covoiturage local à Mayotte', MARGE, 52)
    d.font('Helvetica-Bold').fontSize(11).fillColor(COULEURS.blanc)
      .text(nettoyer(this.typeDocument).toUpperCase(), MARGE, 26, { width: this.largeur, align: 'right', characterSpacing: 1 })
    if (this.reference) {
      d.font('Helvetica').fontSize(9).fillColor('#CFE3D8')
        .text(nettoyer(this.reference), MARGE, 44, { width: this.largeur, align: 'right' })
    }
  }

  // Petit rappel en haut des pages suivantes
  enTeteSuite() {
    const d = this.doc
    d.rect(0, 0, d.page.width, 6).fill(COULEURS.vert)
    d.font('Helvetica-Bold').fontSize(9).fillColor(COULEURS.vert).text("Covoit'May", MARGE, 20)
    d.font('Helvetica').fontSize(9).fillColor(COULEURS.gris)
      .text(nettoyer(this.typeDocument + (this.reference ? ' · ' + this.reference : '')), MARGE, 20, { width: this.largeur, align: 'right' })
    d.y = 44
  }

  nouvellePage() {
    this.doc.addPage()
    this.enTeteSuite()
  }

  // Passe à la page suivante s'il ne reste pas « hauteur » points
  assurerEspace(hauteur) {
    if (this.doc.y + hauteur > this.bas) this.nouvellePage()
  }

  espace(points = 12) {
    this.doc.y += points
  }

  titre(texte, sousTitre) {
    const d = this.doc
    d.font('Helvetica-Bold').fontSize(20).fillColor(COULEURS.vertFonce).text(nettoyer(texte), MARGE, d.y, { width: this.largeur })
    if (sousTitre) {
      d.moveDown(0.2)
      d.font('Helvetica').fontSize(10).fillColor(COULEURS.gris).text(nettoyer(sousTitre), { width: this.largeur })
    }
    this.espace(16)
  }

  // Titre de partie : petites capitales vertes et filet corail
  section(texte) {
    this.assurerEspace(60)
    const d = this.doc
    this.espace(6)
    const y = d.y
    d.font('Helvetica-Bold').fontSize(10).fillColor(COULEURS.vert)
      .text(nettoyer(texte).toUpperCase(), MARGE, y, { characterSpacing: 0.8 })
    d.rect(MARGE, d.y + 3, 36, 2).fill(COULEURS.corail)
    d.y += 12
  }

  // Pastille colorée (statut d'un paiement…)
  pastille(texte, couleurFond, couleurTexte = COULEURS.blanc) {
    const d = this.doc
    d.font('Helvetica-Bold').fontSize(10)
    const t = nettoyer(texte)
    const l = d.widthOfString(t) + 24
    const y = d.y
    d.roundedRect(MARGE, y, l, 22, 11).fill(couleurFond)
    d.fillColor(couleurTexte).text(t, MARGE, y + 6.5, { width: l, align: 'center' })
    d.y = y + 34
  }

  // Blocs d'informations côte à côte : [{ titre, lignes: [[libellé, valeur], …] }]
  blocs(liste) {
    const d = this.doc
    const ecart = 14
    const l = (this.largeur - ecart * (liste.length - 1)) / liste.length
    // Hauteur de chaque bloc selon ses lignes (les valeurs longues vont à la ligne)
    const hauteurs = liste.map((b) => 34 + b.lignes.reduce((h, [, valeur]) => {
      d.font('Helvetica-Bold').fontSize(10)
      return h + 12 + d.heightOfString(nettoyer(valeur), { width: l - 24 }) + 6
    }, 0))
    const h = Math.max(...hauteurs)
    this.assurerEspace(h + 10)
    const y = d.y
    liste.forEach((b, i) => {
      const x = MARGE + i * (l + ecart)
      d.roundedRect(x, y, l, h, 8).fill(COULEURS.creme)
      d.rect(x, y + 10, 3, 16).fill(COULEURS.corail)
      d.font('Helvetica-Bold').fontSize(10).fillColor(COULEURS.vertFonce).text(nettoyer(b.titre), x + 12, y + 12, { width: l - 24 })
      let yy = y + 34
      b.lignes.forEach(([libelle, valeur]) => {
        d.font('Helvetica').fontSize(8).fillColor(COULEURS.gris).text(nettoyer(libelle).toUpperCase(), x + 12, yy, { width: l - 24, characterSpacing: 0.4 })
        yy += 11
        d.font('Helvetica-Bold').fontSize(10).fillColor(COULEURS.texte).text(nettoyer(valeur), x + 12, yy, { width: l - 24 })
        yy += d.heightOfString(nettoyer(valeur), { width: l - 24 }) + 7
      })
    })
    d.y = y + h + 16
  }

  // Chiffres clés en cartes : [{ libelle, valeur, accent }]
  chiffres(liste, parLigne = 4) {
    const d = this.doc
    const ecart = 10
    const l = (this.largeur - ecart * (parLigne - 1)) / parLigne
    for (let i = 0; i < liste.length; i += parLigne) {
      this.assurerEspace(66)
      const y = d.y
      liste.slice(i, i + parLigne).forEach((c, j) => {
        const x = MARGE + j * (l + ecart)
        d.roundedRect(x, y, l, 56, 8).fill(c.accent ? COULEURS.vert : COULEURS.vertClair)
        d.font('Helvetica-Bold').fontSize(16).fillColor(c.accent ? COULEURS.blanc : COULEURS.vertFonce)
          .text(nettoyer(c.valeur), x + 10, y + 10, { width: l - 20 })
        d.font('Helvetica').fontSize(8).fillColor(c.accent ? '#CFE3D8' : COULEURS.gris)
          .text(nettoyer(c.libelle), x + 10, y + 34, { width: l - 20, height: 20, ellipsis: true })
      })
      d.y = y + 66
    }
    this.espace(4)
  }

  // Tableau : colonnes [{ titre, part (largeur relative), align }], lignes [[…], …]
  // Il continue sur la page suivante si besoin, en répétant l'en-tête.
  tableau(colonnes, lignes, { vide = 'Aucune donnée pour cette période.' } = {}) {
    const d = this.doc
    const total = colonnes.reduce((s, c) => s + (c.part || 1), 0)
    const largeurs = colonnes.map((c) => (this.largeur * (c.part || 1)) / total)
    const pad = 6

    const dessinerEnTete = () => {
      const y = d.y
      d.rect(MARGE, y, this.largeur, 20).fill(COULEURS.vert)
      let x = MARGE
      colonnes.forEach((c, i) => {
        d.font('Helvetica-Bold').fontSize(8).fillColor(COULEURS.blanc)
          .text(nettoyer(c.titre), x + pad, y + 6, { width: largeurs[i] - 2 * pad, align: c.align || 'left', lineBreak: false, ellipsis: true })
        x += largeurs[i]
      })
      d.y = y + 20
    }

    this.assurerEspace(46)
    dessinerEnTete()
    if (!lignes.length) {
      d.font('Helvetica-Oblique').fontSize(9).fillColor(COULEURS.gris)
        .text(nettoyer(vide), MARGE + pad, d.y + 8, { width: this.largeur - 2 * pad })
      d.y += 12
      this.espace(10)
      return
    }
    lignes.forEach((ligne, n) => {
      d.font('Helvetica').fontSize(9)
      const h = Math.max(...ligne.map((v, i) => d.heightOfString(nettoyer(v), { width: largeurs[i] - 2 * pad }))) + 2 * pad
      if (d.y + h > this.bas) {
        this.nouvellePage()
        dessinerEnTete()
      }
      const y = d.y
      if (n % 2 === 1) d.rect(MARGE, y, this.largeur, h).fill(COULEURS.creme)
      let x = MARGE
      ligne.forEach((v, i) => {
        d.font(colonnes[i].gras ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(COULEURS.texte)
          .text(nettoyer(v), x + pad, y + pad, { width: largeurs[i] - 2 * pad, align: colonnes[i].align || 'left' })
        x += largeurs[i]
      })
      d.moveTo(MARGE, y + h).lineTo(MARGE + this.largeur, y + h).lineWidth(0.5).strokeColor(COULEURS.ligne).stroke()
      d.y = y + h
    })
    this.espace(14)
  }

  // Encadré des totaux, à droite : [[libellé, valeur, fort?], …]
  totaux(lignes) {
    const d = this.doc
    const l = Math.min(280, this.largeur)
    const x = MARGE + this.largeur - l
    this.assurerEspace(lignes.length * 24 + 10)
    lignes.forEach(([libelle, valeur, fort]) => {
      const y = d.y
      if (fort) d.roundedRect(x, y, l, 26, 6).fill(COULEURS.vert)
      const couleur = fort ? COULEURS.blanc : COULEURS.texte
      d.font(fort ? 'Helvetica-Bold' : 'Helvetica').fontSize(fort ? 11 : 10).fillColor(couleur)
        .text(nettoyer(libelle), x + 12, y + (fort ? 8 : 5), { width: l - 130 })
      d.font('Helvetica-Bold').fontSize(fort ? 12 : 10).fillColor(couleur)
        .text(nettoyer(valeur), x + l - 130, y + (fort ? 7 : 5), { width: 118, align: 'right' })
      d.y = y + (fort ? 32 : 20)
    })
    this.espace(6)
  }

  // Petit paragraphe gris (mentions, remarques)
  note(texte, { couleur = COULEURS.gris, encadre = false } = {}) {
    const d = this.doc
    d.font('Helvetica').fontSize(8.5)
    const t = nettoyer(texte)
    const h = d.heightOfString(t, { width: this.largeur - (encadre ? 24 : 0) })
    this.assurerEspace(h + 20)
    if (encadre) {
      const y = d.y
      d.roundedRect(MARGE, y, this.largeur, h + 16, 6).fill('#FDF0EC')
      d.fillColor(COULEURS.corailFonce).text(t, MARGE + 12, y + 8, { width: this.largeur - 24 })
      d.y = y + h + 24
    } else {
      d.fillColor(couleur).text(t, MARGE, d.y, { width: this.largeur })
      this.espace(8)
    }
  }

  // Pied de page sur chaque page, puis le PDF complet (Buffer)
  terminer() {
    const d = this.doc
    const { start, count } = d.bufferedPageRange()
    for (let i = start; i < start + count; i++) {
      d.switchToPage(i)
      // Écrire sous la marge du bas ajouterait une page : on la libère le temps du pied
      const margeBas = d.page.margins.bottom
      d.page.margins.bottom = 0
      const y = d.page.height - 42
      d.moveTo(MARGE, y).lineTo(d.page.width - MARGE, y).lineWidth(0.5).strokeColor(COULEURS.ligne).stroke()
      d.font('Helvetica').fontSize(7.5).fillColor(COULEURS.gris)
        .text(nettoyer(`Covoit'May · plateforme de covoiturage local à Mayotte · document généré le ${this.genereLe}`),
          MARGE, y + 8, { width: this.largeur - 80, lineBreak: false })
        .text(`Page ${i - start + 1} / ${count}`, MARGE, y + 8, { width: this.largeur, align: 'right', lineBreak: false })
      d.page.margins.bottom = margeBas
    }
    return new Promise((resoudre, rejeter) => {
      d.on('end', () => resoudre(Buffer.concat(this.morceaux)))
      d.on('error', rejeter)
      d.end()
    })
  }
}
