// ============================================================
// Préparation d'une image avant l'envoi
// ------------------------------------------------------------
// Une photo de téléphone pèse souvent 3 à 5 Mo. Avant l'envoi, le
// navigateur la redimensionne avec un <canvas> : l'envoi est plus
// rapide et le stockage plus léger. Le serveur revérifie de toute
// façon le type et la taille du fichier (RG02.19, RG09.6).
// ============================================================

// Lit le fichier choisi en image dessinable (orientation du téléphone respectée)
async function chargerImage(fichier) {
  if (window.createImageBitmap) {
    return createImageBitmap(fichier, { imageOrientation: 'from-image' })
  }
  return new Promise(function (resoudre, rejeter) {
    const image = new Image()
    image.onload = () => resoudre(image)
    image.onerror = () => rejeter(new Error('Image illisible.'))
    image.src = URL.createObjectURL(fichier)
  })
}

// Canvas -> fichier JPEG
function versJpeg(canvas, qualite) {
  return new Promise(function (resoudre, rejeter) {
    canvas.toBlob((blob) => (blob ? resoudre(blob) : rejeter(new Error('Conversion impossible.'))), 'image/jpeg', qualite)
  })
}

// Photo de profil : carré de « taille » pixels, recadré au centre
export async function preparerPhotoProfil(fichier, taille = 512) {
  const image = await chargerImage(fichier)
  const cote = Math.min(image.width, image.height)
  const canvas = document.createElement('canvas')
  canvas.width = taille
  canvas.height = taille
  canvas.getContext('2d').drawImage(image,
    (image.width - cote) / 2, (image.height - cote) / 2, cote, cote, 0, 0, taille, taille)
  return versJpeg(canvas, 0.88)
}

// Photo envoyée dans la messagerie : 1600 pixels au plus sur le grand côté
export async function preparerPhotoMessage(fichier, cotemax = 1600) {
  const image = await chargerImage(fichier)
  const echelle = Math.min(1, cotemax / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * echelle)
  canvas.height = Math.round(image.height * echelle)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return versJpeg(canvas, 0.85)
}
