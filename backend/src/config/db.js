// ============================================================
// Connexion à la base MariaDB
// ------------------------------------------------------------
// Un "pool" garde quelques connexions ouvertes et les prête aux
// requêtes : c'est plus rapide que d'en ouvrir une à chaque fois.
// Les identifiants viennent du fichier .env (jamais écrits dans
// le code, RG13.10).
// ============================================================
import mariadb from 'mariadb'

export const pool = mariadb.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'covoitmay',
  connectionLimit: 10,
  // Les dates arrivent en texte ("2026-09-28 17:30:00") : aucun décalage horaire
  dateStrings: true,
  // Les nombres arrivent en nombres JavaScript (pas en BigInt ni en texte)
  insertIdAsNumber: true,
  bigIntAsNumber: true,
  decimalAsNumber: true
})

// Exécute une requête préparée. Les valeurs passent par les "?" :
// elles ne sont jamais collées dans le texte SQL, ce qui empêche
// l'injection SQL (RG13.3).
// "connexion" permet de faire la requête dans une transaction.
export function requete(sql, valeurs = [], connexion = pool) {
  return connexion.execute(sql, valeurs)
}

// Exécute plusieurs requêtes en "tout ou rien" (transaction) :
// si une seule échoue, aucune n'est enregistrée.
export async function transaction(travail) {
  const connexion = await pool.getConnection()
  try {
    await connexion.beginTransaction()
    const resultat = await travail(connexion)
    await connexion.commit()
    return resultat
  } catch (erreur) {
    await connexion.rollback()
    throw erreur
  } finally {
    connexion.release()
  }
}

// Vérifie au démarrage que la base répond
export async function verifierConnexion() {
  const connexion = await pool.getConnection()
  connexion.release()
}
