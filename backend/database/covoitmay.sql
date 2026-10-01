-- ============================================================
-- Covoit'May : base de données MariaDB (version 10.11 ou plus)
-- ------------------------------------------------------------
-- Ce script crée TOUT d'un coup :
--   1. les tables, avec leurs contraintes (clés, UNIQUE, CHECK)
--   2. les triggers : les règles de gestion vérifiées par la base
--   3. les procédures et les vues
--   4. les données de démonstration (toutes les situations)
--   5. le compte MariaDB de l'application (droits minimaux)
--
-- Chaque règle porte son code (RG04.3, RG13.9…) : c'est le même
-- code que dans le cahier des charges, partie 3 « Règles de gestion ».
--
-- Lancer le script (invite de commandes, dossier backend) :
--   mariadb -u root -p < database/covoitmay.sql
-- ou l'ouvrir dans HeidiSQL (installé avec MariaDB) et tout exécuter.
--
-- ATTENTION : la base "covoitmay" est SUPPRIMÉE puis recréée.
-- Toutes les données qu'elle contenait sont perdues.
-- ============================================================

SET NAMES utf8mb4;
-- Mode strict : une valeur invalide provoque une erreur au lieu
-- d'être tronquée en silence. Les triggers gardent ce mode.
SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DROP DATABASE IF EXISTS covoitmay;
CREATE DATABASE covoitmay CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;
USE covoitmay;


-- ============================================================
-- 1. LES TABLES
-- ============================================================

-- ---------- Communes de Mayotte (liste de référence) ----------
-- Les lieux de départ et d'arrivée d'un trajet ou d'une alerte
-- doivent exister ici (RG04.6, RG11.1).
CREATE TABLE commune (
  id_commune INT NOT NULL AUTO_INCREMENT,
  nom        VARCHAR(60) NOT NULL,
  latitude   DECIMAL(8,5) NOT NULL,
  longitude  DECIMAL(8,5) NOT NULL,
  PRIMARY KEY (id_commune),
  UNIQUE KEY uk_commune_nom (nom),
  -- Le point doit être sur Mayotte (cadre autour de l'île)
  CONSTRAINT ck_commune_position CHECK (latitude BETWEEN -13.10 AND -12.55 AND longitude BETWEEN 44.95 AND 45.35)
) ENGINE=InnoDB;

-- ---------- Administrateurs ----------
CREATE TABLE administrateur (
  id_admin            INT NOT NULL AUTO_INCREMENT,
  nom                 VARCHAR(100) NOT NULL,
  prenom              VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL,
  mot_de_passe        CHAR(60) NOT NULL,          -- empreinte bcrypt, jamais le mot de passe en clair
  fonction            VARCHAR(100) DEFAULT NULL,
  actif               TINYINT(1) NOT NULL DEFAULT 1,
  tentatives_echouees TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloque_jusqu_a      DATETIME DEFAULT NULL,
  derniere_connexion  DATETIME DEFAULT NULL,
  date_creation       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_admin),
  UNIQUE KEY uk_admin_email (email),                                                -- RG01.1
  CONSTRAINT ck_admin_email CHECK (email REGEXP '^[^@ ]+@[^@ ]+[.][a-z]{2,}$'),
  CONSTRAINT ck_admin_mdp CHECK (mot_de_passe LIKE '$2_$%' AND CHAR_LENGTH(mot_de_passe) = 60)  -- RG01.2
) ENGINE=InnoDB;

-- ---------- Utilisateurs (passagers et conducteurs) ----------
CREATE TABLE utilisateur (
  id_utilisateur      INT NOT NULL AUTO_INCREMENT,
  nom                 VARCHAR(100) NOT NULL,
  prenom              VARCHAR(100) NOT NULL,
  email               VARCHAR(150) NOT NULL,
  email_verifie       TINYINT(1) NOT NULL DEFAULT 0,  -- code reçu par email validé (RG02.20)
  email_verifie_le    DATETIME DEFAULT NULL,
  mot_de_passe        CHAR(60) DEFAULT NULL,      -- NULL uniquement pour un compte supprimé
  telephone           VARCHAR(20) DEFAULT NULL,   -- NULL uniquement pour un compte supprimé
  adresse             VARCHAR(255) DEFAULT NULL,
  commune             VARCHAR(60) DEFAULT NULL,
  date_naissance      DATE DEFAULT NULL,
  bio                 VARCHAR(500) DEFAULT NULL,
  photo               VARCHAR(255) DEFAULT NULL,  -- clé de la photo de profil dans le stockage (RG02.19)
  role                ENUM('passager','conducteur') NOT NULL DEFAULT 'passager',        -- RG02.2
  statut_verification TINYINT(1) NOT NULL DEFAULT 0,
  statut_compte       ENUM('actif','en_attente','suspendu','refuse','supprime') NOT NULL DEFAULT 'actif',
  note_moyenne        DECIMAL(2,1) NOT NULL DEFAULT 0.0,
  nb_avis             INT UNSIGNED NOT NULL DEFAULT 0,
  cgu_acceptees_le    DATETIME NOT NULL,                                                 -- RG02.9
  tentatives_echouees TINYINT UNSIGNED NOT NULL DEFAULT 0,                               -- RG02.13
  bloque_jusqu_a      DATETIME DEFAULT NULL,
  derniere_connexion  DATETIME DEFAULT NULL,
  date_inscription    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_modification   DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  date_suppression    DATETIME DEFAULT NULL,
  id_admin            INT DEFAULT NULL,           -- administrateur qui a vérifié l'identité (RG02.4)
  PRIMARY KEY (id_utilisateur),
  UNIQUE KEY uk_utilisateur_email (email),                                             -- RG02.1
  KEY fk_utilisateur_administrateur (id_admin),
  KEY fk_utilisateur_commune (commune),
  CONSTRAINT fk_utilisateur_administrateur FOREIGN KEY (id_admin) REFERENCES administrateur (id_admin),
  CONSTRAINT fk_utilisateur_commune FOREIGN KEY (commune) REFERENCES commune (nom),
  CONSTRAINT ck_util_email CHECK (email REGEXP '^[^@ ]+@[^@ ]+[.][a-z]{2,}$'),          -- RG02.6
  CONSTRAINT ck_util_mdp CHECK (mot_de_passe IS NULL OR (mot_de_passe LIKE '$2_$%' AND CHAR_LENGTH(mot_de_passe) = 60)),  -- RG02.5
  CONSTRAINT ck_util_telephone CHECK (telephone IS NULL OR telephone REGEXP '^(\\+262 ?|0)[1-9]([ .]?[0-9]{2}){4}$'),       -- RG02.7
  CONSTRAINT ck_util_note CHECK (note_moyenne BETWEEN 0 AND 5),
  -- Un profil vérifié est rattaché à l'administrateur qui l'a vérifié (RG02.4)
  CONSTRAINT ck_util_verif_admin CHECK (statut_verification = 0 OR id_admin IS NOT NULL),
  -- Un conducteur actif a forcément une identité vérifiée (RG02.11)
  CONSTRAINT ck_util_conducteur_actif CHECK (NOT (role = 'conducteur' AND statut_compte = 'actif' AND statut_verification = 0)),
  -- Compte supprimé = données personnelles effacées (RG02.14)
  CONSTRAINT ck_util_suppression CHECK ((statut_compte = 'supprime') = (mot_de_passe IS NULL)
                                        AND (statut_compte <> 'supprime' OR (telephone IS NULL AND date_suppression IS NOT NULL))),
  CONSTRAINT ck_util_telephone_obligatoire CHECK (statut_compte = 'supprime' OR telephone IS NOT NULL),
  -- La photo d'un compte supprimé est effacée avec ses autres données (RG02.19)
  CONSTRAINT ck_util_photo_suppression CHECK (statut_compte <> 'supprime' OR photo IS NULL),
  CONSTRAINT ck_util_email_verifie CHECK (email_verifie = 0 OR email_verifie_le IS NOT NULL)          -- RG02.20
) ENGINE=InnoDB;

-- ---------- Codes de vérification envoyés par email ----------
-- Inscription (vérifier l'adresse) et mot de passe oublié. Le code n'est
-- jamais stocké : seulement son empreinte (HMAC-SHA256). 10 minutes,
-- 5 essais au plus (RG02.21).
CREATE TABLE code_verification (
  id_code        INT NOT NULL AUTO_INCREMENT,
  objet          ENUM('inscription','mot_de_passe') NOT NULL,
  empreinte      CHAR(64) NOT NULL,
  tentatives     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  date_creation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expire_le      DATETIME NOT NULL,
  utilise_le     DATETIME DEFAULT NULL,
  id_utilisateur INT NOT NULL,
  PRIMARY KEY (id_code),
  KEY idx_code_utilisateur (id_utilisateur, objet, date_creation),
  CONSTRAINT fk_code_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT ck_code_empreinte CHECK (empreinte REGEXP '^[0-9a-f]{64}$'),
  CONSTRAINT ck_code_expiration CHECK (expire_le > date_creation AND expire_le <= date_creation + INTERVAL 10 MINUTE),
  CONSTRAINT ck_code_tentatives CHECK (tentatives BETWEEN 0 AND 5)
) ENGINE=InnoDB;

-- ---------- Véhicules ----------
CREATE TABLE vehicule (
  id_vehicule     INT NOT NULL AUTO_INCREMENT,
  marque          VARCHAR(50) NOT NULL,
  modele          VARCHAR(50) NOT NULL,
  couleur         VARCHAR(30) DEFAULT NULL,
  immatriculation VARCHAR(20) NOT NULL,
  nb_places       TINYINT UNSIGNED NOT NULL,      -- places offertes aux passagers
  actif           TINYINT(1) NOT NULL DEFAULT 1,  -- 0 = ancien véhicule (RG03.7)
  date_ajout      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_utilisateur  INT NOT NULL,
  PRIMARY KEY (id_vehicule),
  UNIQUE KEY uk_vehicule_immatriculation (immatriculation),                            -- RG03.3
  -- Sert à la clé étrangère composée de TRAJET (RG04.2)
  UNIQUE KEY uk_vehicule_proprietaire (id_vehicule, id_utilisateur),
  KEY fk_vehicule_utilisateur (id_utilisateur),
  CONSTRAINT fk_vehicule_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),  -- RG03.1
  CONSTRAINT ck_vehicule_places CHECK (nb_places BETWEEN 1 AND 8),                    -- RG03.4, RG03.6
  CONSTRAINT ck_vehicule_immat CHECK (immatriculation REGEXP '^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$')  -- RG03.5
) ENGINE=InnoDB;

-- ---------- Demandes pour devenir conducteur (vérification d'identité) ----------
CREATE TABLE demande_conducteur (
  id_demande       INT NOT NULL AUTO_INCREMENT,
  marque           VARCHAR(50) NOT NULL,
  modele           VARCHAR(50) NOT NULL,
  couleur          VARCHAR(30) DEFAULT NULL,
  immatriculation  VARCHAR(20) NOT NULL,
  nb_places        TINYINT UNSIGNED NOT NULL,
  -- Noms aléatoires des fichiers, rangés hors du dossier public (RG08.4).
  -- Passent à NULL quand les fichiers sont effacés (RG08.8).
  fichier_identite VARCHAR(255) DEFAULT NULL,
  fichier_permis   VARCHAR(255) DEFAULT NULL,
  statut           ENUM('en_attente','acceptee','refusee') NOT NULL DEFAULT 'en_attente',
  motif_refus      VARCHAR(500) DEFAULT NULL,
  date_demande     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_traitement  DATETIME DEFAULT NULL,
  id_utilisateur   INT NOT NULL,
  id_admin         INT DEFAULT NULL,
  -- Vaut l'id de l'utilisateur tant que la demande est en attente, NULL sinon :
  -- l'index UNIQUE empêche d'avoir deux demandes en attente (RG08.2)
  en_attente_pour  INT AS (IF(statut = 'en_attente', id_utilisateur, NULL)) PERSISTENT,
  PRIMARY KEY (id_demande),
  UNIQUE KEY uk_demande_une_en_attente (en_attente_pour),
  KEY fk_demande_utilisateur (id_utilisateur),
  KEY fk_demande_admin (id_admin),
  CONSTRAINT fk_demande_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT fk_demande_admin FOREIGN KEY (id_admin) REFERENCES administrateur (id_admin),
  CONSTRAINT ck_demande_places CHECK (nb_places BETWEEN 1 AND 8),
  CONSTRAINT ck_demande_immat CHECK (immatriculation REGEXP '^[A-Z]{2}-[0-9]{3}-[A-Z]{2}$'),
  CONSTRAINT ck_demande_fichiers CHECK (statut <> 'en_attente' OR (fichier_identite IS NOT NULL AND fichier_permis IS NOT NULL)),  -- RG08.1
  CONSTRAINT ck_demande_traitement CHECK (statut = 'en_attente' OR (id_admin IS NOT NULL AND date_traitement IS NOT NULL)),       -- RG08.5
  CONSTRAINT ck_demande_motif CHECK (statut <> 'refusee' OR motif_refus IS NOT NULL)                                               -- RG08.6
) ENGINE=InnoDB;

-- ---------- Trajets ----------
CREATE TABLE trajet (
  id_trajet          INT NOT NULL AUTO_INCREMENT,
  lieu_depart        VARCHAR(60) NOT NULL,
  lieu_arrivee       VARCHAR(60) NOT NULL,
  point_rdv          VARCHAR(150) NOT NULL,
  date_trajet        DATE NOT NULL,
  heure_depart       TIME NOT NULL,
  places_total       TINYINT UNSIGNED NOT NULL,
  places_disponibles TINYINT UNSIGNED NOT NULL DEFAULT 0,  -- calculé par la base (RG04.9, RG05.5)
  prix               DECIMAL(6,2) NOT NULL,                 -- prix par place
  detour_accepte     TINYINT(1) NOT NULL DEFAULT 0,
  recurrent          TINYINT(1) NOT NULL DEFAULT 0,
  jours_recurrents   SET('lun','mar','mer','jeu','ven','sam','dim') DEFAULT NULL,
  description        VARCHAR(500) DEFAULT NULL,
  statut             ENUM('ouvert','complet','termine','annule') NOT NULL DEFAULT 'ouvert',
  date_publication   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_annulation    DATETIME DEFAULT NULL,
  id_utilisateur     INT NOT NULL,                          -- le conducteur
  id_vehicule        INT NOT NULL,
  PRIMARY KEY (id_trajet),
  -- Un conducteur ne publie pas deux trajets au même moment (RG04.10)
  UNIQUE KEY uk_trajet_conducteur_horaire (id_utilisateur, date_trajet, heure_depart),
  KEY fk_trajet_utilisateur (id_utilisateur),
  KEY fk_trajet_vehicule (id_vehicule, id_utilisateur),
  -- Index de la recherche de trajets (BNF08)
  KEY idx_trajet_recherche (lieu_depart, lieu_arrivee, date_trajet),
  KEY idx_trajet_statut_date (statut, date_trajet),
  CONSTRAINT fk_trajet_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),   -- RG04.1
  -- Le véhicule appartient au conducteur du trajet (RG04.2)
  CONSTRAINT fk_trajet_vehicule FOREIGN KEY (id_vehicule, id_utilisateur) REFERENCES vehicule (id_vehicule, id_utilisateur),
  CONSTRAINT fk_trajet_depart FOREIGN KEY (lieu_depart) REFERENCES commune (nom),        -- RG04.6
  CONSTRAINT fk_trajet_arrivee FOREIGN KEY (lieu_arrivee) REFERENCES commune (nom),
  CONSTRAINT ck_trajet_lieux CHECK (lieu_depart <> lieu_arrivee),                                          -- RG04.6
  CONSTRAINT ck_trajet_prix CHECK (prix BETWEEN 1 AND 10),                                                  -- RG04.5, RG04.7
  CONSTRAINT ck_trajet_places CHECK (places_total BETWEEN 1 AND 6),                                         -- RG04.8
  CONSTRAINT ck_trajet_dispo CHECK (places_disponibles <= places_total),
  CONSTRAINT ck_trajet_recurrence CHECK ((recurrent = 0 AND (jours_recurrents IS NULL OR jours_recurrents = ''))
                                      OR (recurrent = 1 AND jours_recurrents <> '')),                       -- RG04.17
  CONSTRAINT ck_trajet_annulation CHECK (statut <> 'annule' OR date_annulation IS NOT NULL)
) ENGINE=InnoDB;

-- ---------- Paramètres de la plateforme ----------
CREATE TABLE parametre (
  cle               VARCHAR(50) NOT NULL,
  valeur            VARCHAR(100) NOT NULL,
  description       VARCHAR(255) NOT NULL,
  date_modification DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  id_admin          INT DEFAULT NULL,           -- dernier administrateur qui l'a modifié
  PRIMARY KEY (cle),
  CONSTRAINT fk_parametre_admin FOREIGN KEY (id_admin) REFERENCES administrateur (id_admin),
  CONSTRAINT ck_parametre_valeur CHECK (valeur REGEXP '^[0-9]+([.][0-9]+)?$')
) ENGINE=InnoDB;

-- ---------- Réservations ----------
CREATE TABLE reservation (
  id_reservation      INT NOT NULL AUTO_INCREMENT,
  date_reservation    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nb_places_reservees TINYINT UNSIGNED NOT NULL,
  -- Ces trois valeurs sont calculées par la base, jamais envoyées par le client (RG05.6)
  prix_unitaire       DECIMAL(6,2) NOT NULL DEFAULT 0,
  montant             DECIMAL(8,2) NOT NULL DEFAULT 0,
  taux_commission     DECIMAL(4,3) NOT NULL DEFAULT 0,
  statut              ENUM('en_attente','confirmee','refusee','annulee','terminee') NOT NULL DEFAULT 'en_attente',
  date_reponse        DATETIME DEFAULT NULL,
  date_annulation     DATETIME DEFAULT NULL,
  annulee_par         ENUM('passager','conducteur','admin','systeme') DEFAULT NULL,
  id_utilisateur      INT NOT NULL,             -- le passager
  id_trajet           INT NOT NULL,
  -- 1 si la réservation est active, NULL sinon : l'index UNIQUE
  -- interdit deux réservations actives sur le même trajet (RG05.4)
  active              TINYINT AS (IF(statut IN ('en_attente','confirmee'), 1, NULL)) PERSISTENT,
  PRIMARY KEY (id_reservation),
  UNIQUE KEY uk_reservation_active (id_utilisateur, id_trajet, active),
  KEY fk_reservation_utilisateur (id_utilisateur),
  KEY fk_reservation_trajet (id_trajet, statut),
  CONSTRAINT fk_reservation_trajet FOREIGN KEY (id_trajet) REFERENCES trajet (id_trajet),                 -- RG05.1
  CONSTRAINT fk_reservation_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT ck_reservation_places CHECK (nb_places_reservees BETWEEN 1 AND 6),                           -- RG05.12
  CONSTRAINT ck_reservation_montant CHECK (montant = prix_unitaire * nb_places_reservees),
  CONSTRAINT ck_reservation_taux CHECK (taux_commission BETWEEN 0 AND 0.3),
  CONSTRAINT ck_reservation_annulation CHECK (statut <> 'annulee' OR (date_annulation IS NOT NULL AND annulee_par IS NOT NULL))
) ENGINE=InnoDB;

-- ---------- Paiements ----------
-- Aucune donnée de carte bancaire : seule la référence du prestataire
-- de paiement est conservée (RG06.6).
CREATE TABLE paiement (
  id_paiement        INT NOT NULL AUTO_INCREMENT,
  reference          VARCHAR(40) NOT NULL,
  montant            DECIMAL(8,2) NOT NULL DEFAULT 0,   -- calculé par la base (RG06.5)
  commission         DECIMAL(8,2) NOT NULL DEFAULT 0,   -- calculée par la base (RG06.5)
  montant_net        DECIMAL(8,2) AS (montant - commission) PERSISTENT,  -- reversé au conducteur
  mode_paiement      ENUM('carte','mobile_money') NOT NULL,              -- RG06.4
  statut             ENUM('autorise','valide','annule','rembourse','echoue') NOT NULL DEFAULT 'autorise',
  date_creation      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_paiement      DATETIME DEFAULT NULL,     -- date de l'encaissement
  date_remboursement DATETIME DEFAULT NULL,
  id_reservation     INT NOT NULL,
  PRIMARY KEY (id_paiement),
  UNIQUE KEY uk_paiement_reference (reference),
  UNIQUE KEY uk_paiement_reservation (id_reservation),                                                  -- RG06.2
  CONSTRAINT fk_paiement_reservation FOREIGN KEY (id_reservation) REFERENCES reservation (id_reservation),  -- RG06.1
  CONSTRAINT ck_paiement_montant CHECK (montant > 0),                                                    -- RG06.3
  CONSTRAINT ck_paiement_commission CHECK (commission >= 0 AND commission <= montant),
  CONSTRAINT ck_paiement_dates CHECK ((statut NOT IN ('valide','rembourse') OR date_paiement IS NOT NULL)
                                   AND (statut <> 'rembourse' OR date_remboursement IS NOT NULL))
) ENGINE=InnoDB;

-- ---------- Avis ----------
CREATE TABLE avis (
  id_avis           INT NOT NULL AUTO_INCREMENT,
  note              TINYINT NOT NULL,
  commentaire       VARCHAR(500) NOT NULL,
  date_avis         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  signale           TINYINT(1) NOT NULL DEFAULT 0,
  motif_signalement VARCHAR(255) DEFAULT NULL,
  date_signalement  DATETIME DEFAULT NULL,
  id_signaleur      INT DEFAULT NULL,
  id_utilisateur    INT NOT NULL,               -- l'auteur (le passager)
  id_cible          INT NOT NULL,               -- la personne notée (le conducteur)
  id_trajet         INT NOT NULL,
  PRIMARY KEY (id_avis),
  UNIQUE KEY uk_avis_auteur_trajet (id_utilisateur, id_trajet),                                          -- RG07.5
  KEY fk_avis_trajet (id_trajet),
  KEY idx_avis_cible (id_cible, signale),
  CONSTRAINT fk_avis_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),   -- RG07.1
  CONSTRAINT fk_avis_cible FOREIGN KEY (id_cible) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT fk_avis_signaleur FOREIGN KEY (id_signaleur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT fk_avis_trajet FOREIGN KEY (id_trajet) REFERENCES trajet (id_trajet),
  CONSTRAINT ck_avis_note CHECK (note BETWEEN 1 AND 5),                                                  -- RG07.4
  CONSTRAINT ck_avis_commentaire CHECK (CHAR_LENGTH(TRIM(commentaire)) >= 10),                           -- RG07.7
  CONSTRAINT ck_avis_soi_meme CHECK (id_utilisateur <> id_cible),                                        -- RG07.6
  CONSTRAINT ck_avis_signalement CHECK (signale = 0 OR (motif_signalement IS NOT NULL AND date_signalement IS NOT NULL AND id_signaleur IS NOT NULL))  -- RG07.10
) ENGINE=InnoDB;

-- ---------- Messages ----------
CREATE TABLE message (
  id_message      INT NOT NULL AUTO_INCREMENT,
  -- Un message est un texte, une photo ou un message vocal (RG09.6)
  type_message    ENUM('texte','image','vocal') NOT NULL DEFAULT 'texte',
  contenu         VARCHAR(1000) NOT NULL DEFAULT '',
  -- Photo ou vocal : clé du fichier dans le stockage, son type et sa durée
  fichier         VARCHAR(255) DEFAULT NULL,
  fichier_type    VARCHAR(50) DEFAULT NULL,
  duree_secondes  SMALLINT UNSIGNED DEFAULT NULL,
  date_envoi      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Accusés : reçu (le destinataire était connecté), puis lu (RG09.9)
  date_reception  DATETIME DEFAULT NULL,
  lu              TINYINT(1) NOT NULL DEFAULT 0,
  date_lecture    DATETIME DEFAULT NULL,
  -- Texte modifié dans les 15 minutes (RG09.3), supprimé pour tous (RG09.8)
  date_modification DATETIME DEFAULT NULL,
  supprime_le     DATETIME DEFAULT NULL,
  id_expediteur   INT NOT NULL,
  id_destinataire INT NOT NULL,
  PRIMARY KEY (id_message),
  KEY fk_message_expediteur (id_expediteur),
  KEY idx_message_non_lus (id_destinataire, lu),
  CONSTRAINT fk_message_expediteur FOREIGN KEY (id_expediteur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT fk_message_destinataire FOREIGN KEY (id_destinataire) REFERENCES utilisateur (id_utilisateur),
  -- Un texte n'est jamais vide et n'a pas de fichier ; une photo ou un vocal a toujours son fichier ;
  -- un message supprimé pour tous n'a plus de contenu (RG09.2, RG09.6, RG09.8)
  CONSTRAINT ck_message_contenu CHECK (
       (supprime_le IS NOT NULL AND fichier IS NULL AND contenu = '')
    OR (supprime_le IS NULL AND type_message = 'texte' AND fichier IS NULL AND CHAR_LENGTH(TRIM(contenu)) > 0)
    OR (supprime_le IS NULL AND type_message <> 'texte' AND fichier IS NOT NULL AND fichier_type IS NOT NULL)),
  -- Un vocal dure de 1 seconde à 2 minutes ; seul un vocal a une durée (RG09.7)
  CONSTRAINT ck_message_duree CHECK ((type_message = 'vocal' AND duree_secondes BETWEEN 1 AND 120)
                                     OR (type_message <> 'vocal' AND duree_secondes IS NULL)),
  CONSTRAINT ck_message_personnes CHECK (id_expediteur <> id_destinataire)                               -- RG09.1
) ENGINE=InnoDB;

-- Messages masqués par une personne (« supprimer pour moi », RG09.8)
CREATE TABLE message_masque (
  id_message     INT NOT NULL,
  id_utilisateur INT NOT NULL,
  date_masquage  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_message, id_utilisateur),
  CONSTRAINT fk_masque_message FOREIGN KEY (id_message) REFERENCES message (id_message),
  CONSTRAINT fk_masque_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur)
) ENGINE=InnoDB;

-- ---------- Litiges ----------
CREATE TABLE litige (
  id_litige         INT NOT NULL AUTO_INCREMENT,
  motif             VARCHAR(255) NOT NULL,
  description       VARCHAR(2000) DEFAULT NULL,
  statut            ENUM('ouvert','en_cours','resolu') NOT NULL DEFAULT 'ouvert',
  decision          ENUM('remboursement_total','remboursement_partiel','avertissement','sans_suite') DEFAULT NULL,
  resolution        VARCHAR(1000) DEFAULT NULL,
  montant_rembourse DECIMAL(8,2) DEFAULT NULL,
  date_ouverture    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_resolution   DATETIME DEFAULT NULL,
  id_reservation    INT NOT NULL,
  id_demandeur      INT NOT NULL,
  id_admin          INT DEFAULT NULL,
  -- Un seul litige non résolu par réservation (RG10.3)
  en_cours_sur      INT AS (IF(statut <> 'resolu', id_reservation, NULL)) PERSISTENT,
  PRIMARY KEY (id_litige),
  UNIQUE KEY uk_litige_un_en_cours (en_cours_sur),
  KEY fk_litige_reservation (id_reservation),
  KEY fk_litige_demandeur (id_demandeur),
  KEY fk_litige_admin (id_admin),
  CONSTRAINT fk_litige_reservation FOREIGN KEY (id_reservation) REFERENCES reservation (id_reservation),
  CONSTRAINT fk_litige_demandeur FOREIGN KEY (id_demandeur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT fk_litige_admin FOREIGN KEY (id_admin) REFERENCES administrateur (id_admin),
  CONSTRAINT ck_litige_admin CHECK (statut = 'ouvert' OR id_admin IS NOT NULL),                           -- RG10.5
  CONSTRAINT ck_litige_resolution CHECK (statut <> 'resolu' OR (decision IS NOT NULL AND resolution IS NOT NULL AND date_resolution IS NOT NULL)),
  CONSTRAINT ck_litige_montant CHECK (montant_rembourse IS NULL OR montant_rembourse >= 0)
) ENGINE=InnoDB;

-- ---------- Alertes de trajet ----------
CREATE TABLE alerte (
  id_alerte      INT NOT NULL AUTO_INCREMENT,
  lieu_depart    VARCHAR(60) NOT NULL,
  lieu_arrivee   VARCHAR(60) NOT NULL,
  heure_min      TIME NOT NULL,
  heure_max      TIME NOT NULL,
  prix_max       DECIMAL(6,2) DEFAULT NULL,
  active         TINYINT(1) NOT NULL DEFAULT 1,
  date_creation  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Les trajets publiés après cette date sont « nouveaux » (RG11.6)
  derniere_consultation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_utilisateur INT NOT NULL,
  PRIMARY KEY (id_alerte),
  UNIQUE KEY uk_alerte_doublon (id_utilisateur, lieu_depart, lieu_arrivee, heure_min, heure_max),       -- RG11.3
  CONSTRAINT fk_alerte_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT fk_alerte_depart FOREIGN KEY (lieu_depart) REFERENCES commune (nom),
  CONSTRAINT fk_alerte_arrivee FOREIGN KEY (lieu_arrivee) REFERENCES commune (nom),
  CONSTRAINT ck_alerte_lieux CHECK (lieu_depart <> lieu_arrivee),                                        -- RG11.1
  CONSTRAINT ck_alerte_heures CHECK (heure_min < heure_max),
  CONSTRAINT ck_alerte_prix CHECK (prix_max IS NULL OR prix_max > 0)
) ENGINE=InnoDB;

-- ---------- Conducteurs favoris ----------
CREATE TABLE favori (
  id_utilisateur INT NOT NULL,
  id_conducteur  INT NOT NULL,
  date_ajout     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_utilisateur, id_conducteur),                                                         -- RG11.4
  CONSTRAINT fk_favori_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT fk_favori_conducteur FOREIGN KEY (id_conducteur) REFERENCES utilisateur (id_utilisateur),
  CONSTRAINT ck_favori_soi_meme CHECK (id_utilisateur <> id_conducteur)
) ENGINE=InnoDB;

-- ---------- Journal des actions des administrateurs ----------
CREATE TABLE journal_admin (
  id_journal  INT NOT NULL AUTO_INCREMENT,
  action      VARCHAR(60) NOT NULL,
  table_cible VARCHAR(40) NOT NULL,
  id_cible    INT DEFAULT NULL,
  details     VARCHAR(500) DEFAULT NULL,
  adresse_ip  VARCHAR(45) DEFAULT NULL,
  date_action DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_admin    INT NOT NULL,
  PRIMARY KEY (id_journal),
  KEY idx_journal_date (date_action),
  CONSTRAINT fk_journal_admin FOREIGN KEY (id_admin) REFERENCES administrateur (id_admin)             -- RG01.6
) ENGINE=InnoDB;


-- ============================================================
-- 2. LES TRIGGERS (règles vérifiées par la base elle-même)
-- ------------------------------------------------------------
-- Un trigger est un bout de code lancé automatiquement avant ou
-- après un INSERT, UPDATE ou DELETE. SIGNAL SQLSTATE '45000'
-- arrête l'opération et renvoie le message à l'application.
--
-- @import_initial : vaut 1 uniquement pendant le chargement des
-- données de démonstration (partie 4), pour pouvoir créer des
-- trajets passés, des comptes déjà vérifiés, etc. L'application
-- ne modifie jamais cette variable.
-- ============================================================

DELIMITER $$

-- ---------- Procédure : recalcul de la note d'un utilisateur (RG07.11) ----------
CREATE PROCEDURE recalculer_note(IN p_id_utilisateur INT)
BEGIN
  UPDATE utilisateur
     SET note_moyenne = COALESCE((SELECT ROUND(AVG(a.note), 1) FROM avis a
                                   WHERE a.id_cible = p_id_utilisateur AND a.signale = 0), 0),
         nb_avis = (SELECT COUNT(*) FROM avis a
                     WHERE a.id_cible = p_id_utilisateur AND a.signale = 0)
   WHERE id_utilisateur = p_id_utilisateur;
END$$

-- ---------- ADMINISTRATEUR ----------
CREATE TRIGGER trg_admin_avant_insertion BEFORE INSERT ON administrateur FOR EACH ROW
BEGIN
  SET NEW.email = LOWER(TRIM(NEW.email));
  IF EXISTS (SELECT 1 FROM utilisateur WHERE email = NEW.email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cet email est déjà utilisé par un compte utilisateur (RG01.5).';
  END IF;
END$$

CREATE TRIGGER trg_admin_avant_modification BEFORE UPDATE ON administrateur FOR EACH ROW
BEGIN
  SET NEW.email = LOWER(TRIM(NEW.email));
  IF NEW.email <> OLD.email AND EXISTS (SELECT 1 FROM utilisateur WHERE email = NEW.email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cet email est déjà utilisé par un compte utilisateur (RG01.5).';
  END IF;
  IF OLD.actif = 1 AND NEW.actif = 0
     AND (SELECT COUNT(*) FROM administrateur WHERE actif = 1) <= 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Il doit toujours rester au moins un administrateur actif (RG01.4).';
  END IF;
END$$

CREATE TRIGGER trg_admin_avant_suppression BEFORE DELETE ON administrateur FOR EACH ROW
BEGIN
  IF OLD.actif = 1 AND (SELECT COUNT(*) FROM administrateur WHERE actif = 1) <= 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Il doit toujours rester au moins un administrateur actif (RG01.4).';
  END IF;
END$$

-- ---------- JOURNAL : ni modifiable ni supprimable (RG01.6) ----------
CREATE TRIGGER trg_journal_avant_modification BEFORE UPDATE ON journal_admin FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le journal des administrateurs ne peut pas être modifié (RG01.6).';
END$$

CREATE TRIGGER trg_journal_avant_suppression BEFORE DELETE ON journal_admin FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le journal des administrateurs ne peut pas être supprimé (RG01.6).';
END$$

-- ---------- UTILISATEUR ----------
CREATE TRIGGER trg_utilisateur_avant_insertion BEFORE INSERT ON utilisateur FOR EACH ROW
BEGIN
  SET NEW.email = LOWER(TRIM(NEW.email));                                  -- RG02.6
  IF EXISTS (SELECT 1 FROM administrateur WHERE email = NEW.email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cet email est déjà utilisé (RG01.5).';
  END IF;
  IF NEW.date_naissance IS NOT NULL AND NEW.date_naissance > CURDATE() - INTERVAL 18 YEAR THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Il faut avoir au moins 18 ans pour s’inscrire (RG02.8).';
  END IF;
  IF COALESCE(@import_initial, 0) = 0 THEN
    -- Un nouveau compte n'est jamais vérifié, quoi que le client envoie (RG02.10)
    SET NEW.statut_verification = 0;
    SET NEW.id_admin = NULL;
    SET NEW.statut_compte = IF(NEW.role = 'conducteur', 'en_attente', 'actif');
    SET NEW.note_moyenne = 0, NEW.nb_avis = 0;
    SET NEW.tentatives_echouees = 0, NEW.bloque_jusqu_a = NULL;
    SET NEW.date_inscription = NOW();
  END IF;
END$$

CREATE TRIGGER trg_utilisateur_avant_modification BEFORE UPDATE ON utilisateur FOR EACH ROW
BEGIN
  SET NEW.email = LOWER(TRIM(NEW.email));
  IF NEW.email <> OLD.email AND EXISTS (SELECT 1 FROM administrateur WHERE email = NEW.email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cet email est déjà utilisé (RG01.5).';
  END IF;
  IF NEW.date_naissance IS NOT NULL AND NEW.date_naissance > CURDATE() - INTERVAL 18 YEAR THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Il faut avoir au moins 18 ans (RG02.8).';
  END IF;
  -- Un compte supprimé l'est définitivement (RG02.14)
  IF OLD.statut_compte = 'supprime' AND NEW.statut_compte <> 'supprime' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un compte supprimé ne peut pas être réactivé (RG02.14).';
  END IF;
  -- Avant la suppression, plus rien ne doit être en cours
  IF NEW.statut_compte = 'supprime' AND OLD.statut_compte <> 'supprime' AND (
       EXISTS (SELECT 1 FROM reservation WHERE id_utilisateur = OLD.id_utilisateur AND statut IN ('en_attente','confirmee'))
    OR EXISTS (SELECT 1 FROM trajet WHERE id_utilisateur = OLD.id_utilisateur AND statut IN ('ouvert','complet'))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Les trajets et réservations en cours doivent être annulés avant la suppression du compte (RG02.14).';
  END IF;
  -- Passager -> conducteur : seulement avec une identité vérifiée (RG08.10)
  IF OLD.role = 'passager' AND NEW.role = 'conducteur' AND NEW.statut_verification = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un passager ne devient conducteur qu’après vérification de son identité (RG08.10).';
  END IF;
  IF OLD.role = 'conducteur' AND NEW.role = 'passager'
     AND EXISTS (SELECT 1 FROM trajet WHERE id_utilisateur = OLD.id_utilisateur AND statut IN ('ouvert','complet')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un conducteur qui a des trajets ouverts ne peut pas redevenir passager.';
  END IF;
END$$

-- ---------- VÉHICULE ----------
CREATE TRIGGER trg_vehicule_avant_insertion BEFORE INSERT ON vehicule FOR EACH ROW
BEGIN
  SET NEW.immatriculation = UPPER(TRIM(NEW.immatriculation));             -- RG03.5
  IF (SELECT role FROM utilisateur WHERE id_utilisateur = NEW.id_utilisateur) <> 'conducteur' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seul un conducteur peut posséder un véhicule (RG03.2).';
  END IF;
END$$

CREATE TRIGGER trg_vehicule_avant_modification BEFORE UPDATE ON vehicule FOR EACH ROW
BEGIN
  SET NEW.immatriculation = UPPER(TRIM(NEW.immatriculation));
  IF NEW.id_utilisateur <> OLD.id_utilisateur THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le propriétaire d’un véhicule ne peut pas changer (RG03.8).';
  END IF;
END$$

-- ---------- DEMANDE CONDUCTEUR ----------
CREATE TRIGGER trg_demande_avant_insertion BEFORE INSERT ON demande_conducteur FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  DECLARE v_compte VARCHAR(20);
  DECLARE v_verifie TINYINT;

  SET NEW.immatriculation = UPPER(TRIM(NEW.immatriculation));
  SELECT role, statut_compte, statut_verification INTO v_role, v_compte, v_verifie
    FROM utilisateur WHERE id_utilisateur = NEW.id_utilisateur;
  IF v_role IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Utilisateur introuvable.';
  END IF;
  -- La plaque ne doit pas appartenir au véhicule de quelqu'un d'autre (RG03.3)
  IF EXISTS (SELECT 1 FROM vehicule WHERE immatriculation = NEW.immatriculation
              AND id_utilisateur <> NEW.id_utilisateur) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cette immatriculation est déjà enregistrée par un autre membre (RG03.3).';
  END IF;
  IF COALESCE(@import_initial, 0) = 0 THEN
    IF v_compte IN ('suspendu','refuse','supprime') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce compte ne peut pas déposer de demande (RG08.3).';
    END IF;
    IF v_role = 'conducteur' AND v_verifie = 1 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce conducteur est déjà vérifié (RG08.3).';
    END IF;
    SET NEW.statut = 'en_attente', NEW.id_admin = NULL, NEW.date_traitement = NULL, NEW.motif_refus = NULL;
    SET NEW.date_demande = NOW();
  END IF;
END$$

CREATE TRIGGER trg_demande_avant_modification BEFORE UPDATE ON demande_conducteur FOR EACH ROW
BEGIN
  IF OLD.statut <> 'en_attente' AND NEW.statut <> OLD.statut THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Une demande déjà traitée ne change plus de décision (RG08.9).';
  END IF;
  IF NEW.immatriculation <> OLD.immatriculation OR NEW.marque <> OLD.marque OR NEW.modele <> OLD.modele
     OR NEW.nb_places <> OLD.nb_places OR NEW.id_utilisateur <> OLD.id_utilisateur THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le contenu d’une demande ne se modifie pas : il faut en déposer une nouvelle.';
  END IF;
  -- Les fichiers ne peuvent qu'être effacés (passage à NULL, RG08.8)
  IF (NEW.fichier_identite IS NOT NULL AND NOT (NEW.fichier_identite <=> OLD.fichier_identite))
     OR (NEW.fichier_permis IS NOT NULL AND NOT (NEW.fichier_permis <=> OLD.fichier_permis)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Les justificatifs d’une demande ne peuvent pas être remplacés.';
  END IF;
  IF OLD.statut = 'en_attente' AND NEW.statut <> 'en_attente' THEN
    SET NEW.date_traitement = NOW();
  END IF;
END$$

-- ---------- TRAJET ----------
CREATE TRIGGER trg_trajet_avant_insertion BEFORE INSERT ON trajet FOR EACH ROW
BEGIN
  DECLARE v_role VARCHAR(20);
  DECLARE v_compte VARCHAR(20);
  DECLARE v_verifie TINYINT;
  DECLARE v_places TINYINT;
  DECLARE v_actif TINYINT;

  SELECT role, statut_compte, statut_verification INTO v_role, v_compte, v_verifie
    FROM utilisateur WHERE id_utilisateur = NEW.id_utilisateur;
  IF v_role IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Conducteur introuvable (RG04.1).';
  END IF;
  SELECT nb_places, actif INTO v_places, v_actif
    FROM vehicule WHERE id_vehicule = NEW.id_vehicule AND id_utilisateur = NEW.id_utilisateur;
  IF v_places IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le véhicule doit exister et appartenir au conducteur (RG04.1, RG04.2).';
  END IF;
  IF NEW.places_total > v_places THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Plus de places proposées que la capacité du véhicule (RG04.3).';
  END IF;
  -- À la publication, toutes les places sont libres (RG04.9)
  SET NEW.places_disponibles = NEW.places_total;
  IF COALESCE(@import_initial, 0) = 0 THEN
    IF v_role <> 'conducteur' OR v_verifie = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seul un conducteur à l’identité vérifiée peut publier un trajet (RG02.3).';
    END IF;
    IF v_compte <> 'actif' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce compte n’est pas actif (RG02.12).';
    END IF;
    IF v_actif = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce véhicule n’est plus actif (RG04.11).';
    END IF;
    IF TIMESTAMP(NEW.date_trajet, NEW.heure_depart) <= NOW() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La date du trajet doit être dans le futur (RG04.4).';
    END IF;
    SET NEW.statut = 'ouvert', NEW.date_annulation = NULL, NEW.date_publication = NOW();
  END IF;
END$$

CREATE TRIGGER trg_trajet_avant_modification BEFORE UPDATE ON trajet FOR EACH ROW
BEGIN
  DECLARE v_places TINYINT;

  IF NEW.id_utilisateur <> OLD.id_utilisateur THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le conducteur d’un trajet ne peut pas changer.';
  END IF;

  -- Modification de l'itinéraire, de l'horaire, du prix ou du véhicule
  IF NEW.lieu_depart <> OLD.lieu_depart OR NEW.lieu_arrivee <> OLD.lieu_arrivee
     OR NEW.date_trajet <> OLD.date_trajet OR NEW.heure_depart <> OLD.heure_depart
     OR NEW.prix <> OLD.prix OR NEW.places_total <> OLD.places_total
     OR NEW.id_vehicule <> OLD.id_vehicule THEN
    IF OLD.statut NOT IN ('ouvert','complet') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un trajet terminé ou annulé ne peut plus être modifié (RG04.13).';
    END IF;
    IF EXISTS (SELECT 1 FROM reservation WHERE id_trajet = OLD.id_trajet AND statut IN ('en_attente','confirmee')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce trajet a des réservations actives : itinéraire, horaire, prix, places et véhicule sont figés (RG04.14).';
    END IF;
    SELECT nb_places INTO v_places FROM vehicule
     WHERE id_vehicule = NEW.id_vehicule AND id_utilisateur = NEW.id_utilisateur AND actif = 1;
    IF v_places IS NULL OR NEW.places_total > v_places THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Véhicule inactif ou capacité insuffisante (RG04.3, RG04.11).';
    END IF;
    IF COALESCE(@import_initial, 0) = 0 AND TIMESTAMP(NEW.date_trajet, NEW.heure_depart) <= NOW() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La date du trajet doit être dans le futur (RG04.4).';
    END IF;
    -- Aucune réservation active : toutes les places sont libres
    SET NEW.places_disponibles = NEW.places_total;
  END IF;

  -- Complet à 0 place, de nouveau ouvert si une place se libère (RG04.12)
  IF NEW.statut = 'ouvert' AND NEW.places_disponibles = 0 THEN
    SET NEW.statut = 'complet';
  ELSEIF NEW.statut = 'complet' AND NEW.places_disponibles > 0 THEN
    SET NEW.statut = 'ouvert';
  END IF;

  -- Cycle de vie du trajet (RG04.13)
  IF NEW.statut <> OLD.statut THEN
    IF OLD.statut IN ('termine','annule') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un trajet terminé ou annulé ne change plus de statut (RG04.13).';
    END IF;
    IF COALESCE(@import_initial, 0) = 0 AND NEW.statut = 'termine'
       AND TIMESTAMP(NEW.date_trajet, NEW.heure_depart) > NOW() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un trajet ne peut être terminé qu’après son départ (RG04.13).';
    END IF;
    IF COALESCE(@import_initial, 0) = 0 AND NEW.statut = 'annule'
       AND TIMESTAMP(NEW.date_trajet, NEW.heure_depart) <= NOW() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un trajet déjà parti ne peut plus être annulé (RG04.13).';
    END IF;
    IF NEW.statut = 'annule' THEN
      SET NEW.date_annulation = NOW();
    END IF;
  END IF;
END$$

-- ---------- RÉSERVATION ----------
CREATE TRIGGER trg_reservation_avant_insertion BEFORE INSERT ON reservation FOR EACH ROW
BEGIN
  DECLARE v_statut_trajet VARCHAR(20);
  DECLARE v_depart DATETIME;
  DECLARE v_conducteur INT;
  DECLARE v_dispo TINYINT;
  DECLARE v_prix DECIMAL(6,2);
  DECLARE v_compte VARCHAR(20);
  DECLARE v_taux DECIMAL(4,3);

  SELECT statut, TIMESTAMP(date_trajet, heure_depart), id_utilisateur, places_disponibles, prix
    INTO v_statut_trajet, v_depart, v_conducteur, v_dispo, v_prix
    FROM trajet WHERE id_trajet = NEW.id_trajet;
  IF v_conducteur IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trajet introuvable (RG05.1).';
  END IF;
  SELECT statut_compte INTO v_compte FROM utilisateur WHERE id_utilisateur = NEW.id_utilisateur;
  IF v_compte IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Passager introuvable (RG05.1).';
  END IF;
  IF NEW.id_utilisateur = v_conducteur THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un conducteur ne peut pas réserver son propre trajet (RG05.3).';
  END IF;
  IF NEW.nb_places_reservees > v_dispo THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Il ne reste pas assez de places sur ce trajet (RG05.2).';
  END IF;
  IF COALESCE(@import_initial, 0) = 0 THEN
    IF v_statut_trajet <> 'ouvert' OR v_depart <= NOW() THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce trajet n’est plus ouvert à la réservation (RG05.7).';
    END IF;
    IF v_compte NOT IN ('actif','en_attente') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce compte ne peut pas réserver (RG05.7).';
    END IF;
    SET NEW.statut = 'en_attente', NEW.date_reponse = NULL, NEW.date_annulation = NULL, NEW.annulee_par = NULL;
    SET NEW.date_reservation = NOW();
  END IF;
  -- Prix, montant et commission viennent de la base, jamais du client (RG05.6)
  SELECT CAST(valeur AS DECIMAL(4,3)) INTO v_taux FROM parametre WHERE cle = 'taux_commission';
  SET NEW.prix_unitaire = v_prix;
  SET NEW.montant = v_prix * NEW.nb_places_reservees;
  IF COALESCE(@import_initial, 0) = 0 OR NEW.taux_commission = 0 THEN
    SET NEW.taux_commission = v_taux;
  END IF;
END$$

-- Une réservation créée directement confirmée (données de démo) occupe des places
CREATE TRIGGER trg_reservation_apres_insertion AFTER INSERT ON reservation FOR EACH ROW
BEGIN
  IF NEW.statut IN ('confirmee','terminee') THEN
    UPDATE trajet SET places_disponibles = places_disponibles - NEW.nb_places_reservees
     WHERE id_trajet = NEW.id_trajet;
  END IF;
END$$

CREATE TRIGGER trg_reservation_avant_modification BEFORE UPDATE ON reservation FOR EACH ROW
BEGIN
  DECLARE v_dispo TINYINT;
  DECLARE v_statut_trajet VARCHAR(20);

  IF NEW.id_trajet <> OLD.id_trajet OR NEW.id_utilisateur <> OLD.id_utilisateur
     OR NEW.nb_places_reservees <> OLD.nb_places_reservees OR NEW.montant <> OLD.montant
     OR NEW.prix_unitaire <> OLD.prix_unitaire OR NEW.taux_commission <> OLD.taux_commission THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Une réservation ne se modifie pas : il faut l’annuler et en créer une nouvelle.';
  END IF;

  IF NEW.statut <> OLD.statut THEN
    -- Cycle de vie de la réservation (RG05.8)
    IF NOT ((OLD.statut = 'en_attente' AND NEW.statut IN ('confirmee','refusee','annulee'))
         OR (OLD.statut = 'confirmee' AND NEW.statut IN ('annulee','terminee'))) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce changement de statut de réservation est interdit (RG05.8).';
    END IF;
    IF NEW.statut = 'confirmee' THEN
      SELECT places_disponibles, statut INTO v_dispo, v_statut_trajet FROM trajet WHERE id_trajet = NEW.id_trajet;
      IF v_statut_trajet <> 'ouvert' OR v_dispo < NEW.nb_places_reservees THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Il ne reste plus assez de places pour accepter cette demande (RG05.2).';
      END IF;
    END IF;
    IF NEW.statut IN ('confirmee','refusee') THEN
      SET NEW.date_reponse = NOW();
    END IF;
    IF NEW.statut = 'annulee' THEN
      IF NEW.annulee_par IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Il faut préciser qui annule la réservation.';
      END IF;
      SET NEW.date_annulation = NOW();
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_reservation_apres_modification AFTER UPDATE ON reservation FOR EACH ROW
BEGIN
  DECLARE v_depart DATETIME;
  DECLARE v_delai INT;

  IF NEW.statut <> OLD.statut THEN
    -- Places du trajet (RG05.5 et RG05.10)
    IF OLD.statut NOT IN ('confirmee','terminee') AND NEW.statut IN ('confirmee','terminee') THEN
      UPDATE trajet SET places_disponibles = places_disponibles - NEW.nb_places_reservees
       WHERE id_trajet = NEW.id_trajet;
    ELSEIF OLD.statut IN ('confirmee','terminee') AND NEW.statut NOT IN ('confirmee','terminee') THEN
      UPDATE trajet SET places_disponibles = places_disponibles + NEW.nb_places_reservees
       WHERE id_trajet = NEW.id_trajet;
    END IF;

    -- Paiement lié (RG06.7 et RG06.8)
    IF NEW.statut = 'confirmee' THEN
      -- Le paiement est encaissé quand le conducteur accepte
      UPDATE paiement SET statut = 'valide' WHERE id_reservation = NEW.id_reservation AND statut = 'autorise';
    ELSEIF OLD.statut = 'en_attente' AND NEW.statut IN ('refusee','annulee') THEN
      -- Rien n'a été encaissé : l'autorisation est libérée
      UPDATE paiement SET statut = 'annule' WHERE id_reservation = NEW.id_reservation AND statut = 'autorise';
    ELSEIF OLD.statut = 'confirmee' AND NEW.statut = 'annulee' THEN
      SELECT TIMESTAMP(date_trajet, heure_depart) INTO v_depart FROM trajet WHERE id_trajet = NEW.id_trajet;
      SELECT CAST(valeur AS UNSIGNED) INTO v_delai FROM parametre WHERE cle = 'delai_remboursement_heures';
      -- Remboursé si ce n'est pas le passager qui annule, ou s'il annule assez tôt
      IF NEW.annulee_par <> 'passager' OR v_depart >= NOW() + INTERVAL v_delai HOUR THEN
        UPDATE paiement SET statut = 'rembourse' WHERE id_reservation = NEW.id_reservation AND statut = 'valide';
      END IF;
    END IF;
  END IF;
END$$

-- ---------- PAIEMENT ----------
CREATE TRIGGER trg_paiement_avant_insertion BEFORE INSERT ON paiement FOR EACH ROW
BEGIN
  DECLARE v_montant DECIMAL(8,2);
  DECLARE v_taux DECIMAL(4,3);

  SELECT montant, taux_commission INTO v_montant, v_taux
    FROM reservation WHERE id_reservation = NEW.id_reservation;
  IF v_montant IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Réservation introuvable (RG06.1).';
  END IF;
  -- Montant et commission calculés par la base (RG06.5)
  SET NEW.montant = v_montant;
  SET NEW.commission = ROUND(v_montant * v_taux, 2);
  IF COALESCE(@import_initial, 0) = 0 THEN
    SET NEW.statut = 'autorise', NEW.date_paiement = NULL, NEW.date_remboursement = NULL;
    SET NEW.date_creation = NOW();
  END IF;
END$$

CREATE TRIGGER trg_paiement_avant_modification BEFORE UPDATE ON paiement FOR EACH ROW
BEGIN
  IF NEW.montant <> OLD.montant OR NEW.commission <> OLD.commission OR NEW.reference <> OLD.reference
     OR NEW.mode_paiement <> OLD.mode_paiement OR NEW.id_reservation <> OLD.id_reservation THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Les données d’un paiement ne peuvent pas être modifiées (RG06.9).';
  END IF;
  IF NEW.statut <> OLD.statut THEN
    IF NOT ((OLD.statut = 'autorise' AND NEW.statut IN ('valide','annule','echoue'))
         OR (OLD.statut = 'valide' AND NEW.statut = 'rembourse')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce changement de statut de paiement est interdit (RG06.7).';
    END IF;
    IF NEW.statut = 'valide' THEN
      SET NEW.date_paiement = NOW();
    ELSEIF NEW.statut = 'rembourse' THEN
      SET NEW.date_remboursement = NOW();
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_paiement_avant_suppression BEFORE DELETE ON paiement FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un paiement ne peut pas être supprimé (RG06.9).';
END$$

-- ---------- AVIS ----------
CREATE TRIGGER trg_avis_avant_insertion BEFORE INSERT ON avis FOR EACH ROW
BEGIN
  DECLARE v_depart DATETIME;
  DECLARE v_conducteur INT;

  SELECT TIMESTAMP(date_trajet, heure_depart), id_utilisateur INTO v_depart, v_conducteur
    FROM trajet WHERE id_trajet = NEW.id_trajet;
  IF v_conducteur IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Trajet introuvable (RG07.1).';
  END IF;
  IF v_depart > NOW() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un avis ne peut être déposé qu’après le trajet (RG07.2).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM reservation WHERE id_trajet = NEW.id_trajet
                  AND id_utilisateur = NEW.id_utilisateur AND statut IN ('confirmee','terminee')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seul un passager ayant voyagé sur ce trajet peut le noter (RG07.3).';
  END IF;
  -- L'avis porte toujours sur le conducteur du trajet (RG07.6)
  SET NEW.id_cible = v_conducteur;
  IF COALESCE(@import_initial, 0) = 0 THEN
    IF v_depart < NOW() - INTERVAL 30 DAY THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le délai de 30 jours pour noter ce trajet est dépassé (RG07.8).';
    END IF;
    SET NEW.signale = 0, NEW.motif_signalement = NULL, NEW.date_signalement = NULL, NEW.id_signaleur = NULL;
    SET NEW.date_avis = NOW();
  END IF;
END$$

CREATE TRIGGER trg_avis_avant_modification BEFORE UPDATE ON avis FOR EACH ROW
BEGIN
  IF NEW.note <> OLD.note OR NEW.commentaire <> OLD.commentaire OR NEW.id_utilisateur <> OLD.id_utilisateur
     OR NEW.id_cible <> OLD.id_cible OR NEW.id_trajet <> OLD.id_trajet THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un avis publié ne peut plus être modifié (RG07.9).';
  END IF;
  IF NEW.signale = 1 AND OLD.signale = 0 THEN
    IF NOT (NEW.id_signaleur <=> OLD.id_cible) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seule la personne notée peut signaler cet avis (RG07.10).';
    END IF;
    SET NEW.date_signalement = NOW();
  END IF;
END$$

CREATE TRIGGER trg_avis_apres_insertion AFTER INSERT ON avis FOR EACH ROW
BEGIN
  CALL recalculer_note(NEW.id_cible);                                       -- RG07.11
END$$

CREATE TRIGGER trg_avis_apres_modification AFTER UPDATE ON avis FOR EACH ROW
BEGIN
  IF NEW.signale <> OLD.signale THEN
    CALL recalculer_note(NEW.id_cible);
  END IF;
END$$

CREATE TRIGGER trg_avis_apres_suppression AFTER DELETE ON avis FOR EACH ROW
BEGIN
  CALL recalculer_note(OLD.id_cible);
END$$

-- ---------- MESSAGE ----------
CREATE TRIGGER trg_message_avant_insertion BEFORE INSERT ON message FOR EACH ROW
BEGIN
  DECLARE v_expediteur VARCHAR(20);
  DECLARE v_destinataire VARCHAR(20);

  SELECT statut_compte INTO v_expediteur FROM utilisateur WHERE id_utilisateur = NEW.id_expediteur;
  SELECT statut_compte INTO v_destinataire FROM utilisateur WHERE id_utilisateur = NEW.id_destinataire;
  IF v_expediteur IS NULL OR v_destinataire IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expéditeur ou destinataire introuvable.';
  END IF;
  IF v_expediteur NOT IN ('actif','en_attente') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce compte ne peut plus envoyer de message (RG09.5).';
  END IF;
  IF v_destinataire = 'supprime' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce destinataire n’existe plus.';
  END IF;
  -- Les deux personnes doivent être liées par une réservation (RG09.1)
  IF NOT EXISTS (SELECT 1 FROM reservation r JOIN trajet t ON t.id_trajet = r.id_trajet
                  WHERE (r.id_utilisateur = NEW.id_expediteur AND t.id_utilisateur = NEW.id_destinataire)
                     OR (r.id_utilisateur = NEW.id_destinataire AND t.id_utilisateur = NEW.id_expediteur)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La messagerie relie un passager et le conducteur d’un trajet réservé (RG09.1).';
  END IF;
  IF COALESCE(@import_initial, 0) = 0 THEN
    SET NEW.lu = 0, NEW.date_lecture = NULL, NEW.date_envoi = NOW();
  END IF;
END$$

CREATE TRIGGER trg_message_avant_modification BEFORE UPDATE ON message FOR EACH ROW
BEGIN
  -- Ce qui ne change jamais : les personnes, la date d'envoi, le type
  IF NEW.id_expediteur <> OLD.id_expediteur OR NEW.id_destinataire <> OLD.id_destinataire
     OR NEW.date_envoi <> OLD.date_envoi OR NEW.type_message <> OLD.type_message THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un message envoyé ne peut pas changer d’auteur, de destinataire ni de type (RG09.3).';
  END IF;
  -- Un message supprimé pour tous le reste
  IF OLD.supprime_le IS NOT NULL AND NOT (NEW.supprime_le <=> OLD.supprime_le) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un message supprimé ne peut pas être restauré (RG09.8).';
  END IF;
  -- Suppression pour tous : 24 heures au plus après l'envoi ; le contenu est effacé (RG09.8)
  IF NEW.supprime_le IS NOT NULL AND OLD.supprime_le IS NULL THEN
    IF NOW() > OLD.date_envoi + INTERVAL 24 HOUR THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un message ne peut être supprimé pour tous que dans les 24 heures qui suivent son envoi (RG09.8).';
    END IF;
    SET NEW.supprime_le = NOW(), NEW.contenu = '', NEW.fichier = NULL, NEW.fichier_type = NULL, NEW.date_modification = NULL;
  ELSEIF OLD.supprime_le IS NOT NULL THEN
    -- Message déjà supprimé : seuls les accusés de lecture peuvent encore changer
    IF NEW.contenu <> OLD.contenu OR NOT (NEW.fichier <=> OLD.fichier) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un message supprimé ne peut plus être modifié (RG09.8).';
    END IF;
  ELSE
    -- Modification : un texte, dans les 15 minutes qui suivent l'envoi (RG09.3)
    IF NOT (NEW.fichier <=> OLD.fichier) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Une photo ou un vocal envoyé ne peut pas être remplacé (RG09.3).';
    END IF;
    IF NEW.contenu <> OLD.contenu THEN
      IF OLD.type_message <> 'texte' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seul un message texte peut être modifié (RG09.3).';
      END IF;
      IF NOW() > OLD.date_envoi + INTERVAL 15 MINUTE THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un message ne peut être modifié que dans les 15 minutes qui suivent son envoi (RG09.3).';
      END IF;
      SET NEW.date_modification = NOW();
    END IF;
  END IF;
  -- Accusés : reçu puis lu, jamais en arrière (RG09.9)
  IF OLD.lu = 1 THEN
    SET NEW.lu = 1, NEW.date_lecture = OLD.date_lecture;
  ELSEIF NEW.lu = 1 THEN
    SET NEW.date_lecture = NOW();
  END IF;
  IF OLD.date_reception IS NOT NULL THEN
    SET NEW.date_reception = OLD.date_reception;
  ELSEIF NEW.lu = 1 AND NEW.date_reception IS NULL THEN
    SET NEW.date_reception = NOW();
  END IF;
END$$

-- ---------- LITIGE ----------
CREATE TRIGGER trg_litige_avant_insertion BEFORE INSERT ON litige FOR EACH ROW
BEGIN
  DECLARE v_passager INT;
  DECLARE v_conducteur INT;
  DECLARE v_statut VARCHAR(20);
  DECLARE v_montant DECIMAL(8,2);

  SELECT r.id_utilisateur, t.id_utilisateur, r.statut, r.montant
    INTO v_passager, v_conducteur, v_statut, v_montant
    FROM reservation r JOIN trajet t ON t.id_trajet = r.id_trajet
   WHERE r.id_reservation = NEW.id_reservation;
  IF v_passager IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Réservation introuvable.';
  END IF;
  IF NEW.id_demandeur NOT IN (v_passager, v_conducteur) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seuls le passager et le conducteur de la réservation peuvent ouvrir un litige (RG10.1).';
  END IF;
  IF v_statut NOT IN ('confirmee','terminee','annulee') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un litige porte sur une réservation confirmée, terminée ou annulée (RG10.2).';
  END IF;
  IF NEW.montant_rembourse > v_montant THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le remboursement dépasse le montant de la réservation (RG10.6).';
  END IF;
  IF COALESCE(@import_initial, 0) = 0 THEN
    SET NEW.statut = 'ouvert', NEW.id_admin = NULL, NEW.decision = NULL, NEW.resolution = NULL;
    SET NEW.montant_rembourse = NULL, NEW.date_resolution = NULL, NEW.date_ouverture = NOW();
  END IF;
END$$

CREATE TRIGGER trg_litige_avant_modification BEFORE UPDATE ON litige FOR EACH ROW
BEGIN
  DECLARE v_montant DECIMAL(8,2);

  IF NEW.id_reservation <> OLD.id_reservation OR NEW.id_demandeur <> OLD.id_demandeur THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La réservation et le demandeur d’un litige ne changent pas.';
  END IF;
  IF NEW.statut <> OLD.statut THEN
    -- Cycle de vie : ouvert -> en cours -> résolu (RG10.4)
    IF NOT ((OLD.statut = 'ouvert' AND NEW.statut IN ('en_cours','resolu'))
         OR (OLD.statut = 'en_cours' AND NEW.statut = 'resolu')) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce changement de statut de litige est interdit (RG10.4).';
    END IF;
    IF NEW.statut = 'resolu' THEN
      SET NEW.date_resolution = NOW();
    END IF;
  END IF;
  SELECT montant INTO v_montant FROM reservation WHERE id_reservation = NEW.id_reservation;
  IF NEW.montant_rembourse > v_montant THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le remboursement dépasse le montant de la réservation (RG10.6).';
  END IF;
END$$

-- ---------- ALERTE ----------
CREATE TRIGGER trg_alerte_avant_insertion BEFORE INSERT ON alerte FOR EACH ROW
BEGIN
  IF NEW.active = 1 AND (SELECT COUNT(*) FROM alerte WHERE id_utilisateur = NEW.id_utilisateur AND active = 1)
     >= (SELECT CAST(valeur AS UNSIGNED) FROM parametre WHERE cle = 'nb_max_alertes') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nombre maximum d’alertes actives atteint (RG11.2).';
  END IF;
END$$

CREATE TRIGGER trg_alerte_avant_modification BEFORE UPDATE ON alerte FOR EACH ROW
BEGIN
  IF NEW.id_utilisateur <> OLD.id_utilisateur THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Une alerte ne change pas de propriétaire.';
  END IF;
  IF NEW.active = 1 AND OLD.active = 0
     AND (SELECT COUNT(*) FROM alerte WHERE id_utilisateur = NEW.id_utilisateur AND active = 1)
     >= (SELECT CAST(valeur AS UNSIGNED) FROM parametre WHERE cle = 'nb_max_alertes') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nombre maximum d’alertes actives atteint (RG11.2).';
  END IF;
END$$

-- ---------- FAVORI ----------
CREATE TRIGGER trg_favori_avant_insertion BEFORE INSERT ON favori FOR EACH ROW
BEGIN
  IF (SELECT role FROM utilisateur WHERE id_utilisateur = NEW.id_conducteur) <> 'conducteur' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un favori désigne forcément un conducteur (RG11.4).';
  END IF;
END$$

-- ---------- PARAMÈTRE ----------
CREATE TRIGGER trg_parametre_avant_modification BEFORE UPDATE ON parametre FOR EACH ROW
BEGIN
  IF NEW.cle <> OLD.cle THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le nom d’un paramètre ne change pas.';
  END IF;
  IF NEW.cle = 'taux_commission' AND CAST(NEW.valeur AS DECIMAL(6,3)) > 0.3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Le taux de commission doit être compris entre 0 et 0,30 (RG12.1).';
  END IF;
  IF NEW.cle <> 'taux_commission' AND CAST(NEW.valeur AS DECIMAL(10,2)) < 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ce paramètre doit valoir au moins 1.';
  END IF;
END$$


-- ============================================================
-- 3. PROCÉDURES ET VUES
-- ============================================================

-- ---------- Clôture automatique des trajets passés ----------
-- Appelée par le backend au démarrage puis toutes les 15 minutes.
--   - demandes restées sans réponse au départ : annulées (RG05.11)
--   - 2 h après le départ : réservations confirmées et trajet
--     passent à « terminé » (RG04.16)
CREATE PROCEDURE cloturer_trajets_passes()
BEGIN
  DROP TEMPORARY TABLE IF EXISTS tmp_trajets_partis;
  CREATE TEMPORARY TABLE tmp_trajets_partis AS
    SELECT id_trajet, TIMESTAMP(date_trajet, heure_depart) AS depart
      FROM trajet
     WHERE statut IN ('ouvert','complet') AND TIMESTAMP(date_trajet, heure_depart) <= NOW();

  UPDATE reservation SET statut = 'annulee', annulee_par = 'systeme'
   WHERE statut = 'en_attente'
     AND id_trajet IN (SELECT id_trajet FROM tmp_trajets_partis);

  UPDATE reservation SET statut = 'terminee'
   WHERE statut = 'confirmee'
     AND id_trajet IN (SELECT id_trajet FROM tmp_trajets_partis WHERE depart <= NOW() - INTERVAL 2 HOUR);

  UPDATE trajet SET statut = 'termine'
   WHERE id_trajet IN (SELECT id_trajet FROM tmp_trajets_partis WHERE depart <= NOW() - INTERVAL 2 HOUR);

  DROP TEMPORARY TABLE tmp_trajets_partis;
END$$

DELIMITER ;

-- ---------- Vue : profil public (RG02.15) ----------
-- Seulement ce qu'un visiteur a le droit de voir : jamais l'email,
-- le téléphone, l'adresse ni le nom de famille complet.
CREATE VIEW v_profil_public AS
SELECT u.id_utilisateur,
       u.prenom,
       CONCAT(LEFT(u.nom, 1), '.') AS nom_initiale,
       u.commune,
       u.bio,
       u.photo,
       u.role,
       u.statut_verification,
       u.note_moyenne,
       u.nb_avis,
       u.date_inscription,
       (SELECT COUNT(*) FROM trajet t WHERE t.id_utilisateur = u.id_utilisateur AND t.statut = 'termine')
     + (SELECT COUNT(*) FROM reservation r WHERE r.id_utilisateur = u.id_utilisateur AND r.statut = 'terminee') AS nb_trajets,
       (SELECT CONCAT_WS(' ', v.marque, v.modele, v.couleur) FROM vehicule v
         WHERE v.id_utilisateur = u.id_utilisateur AND v.actif = 1
         ORDER BY v.id_vehicule DESC LIMIT 1) AS vehicule
  FROM utilisateur u
 WHERE u.statut_compte IN ('actif','en_attente');

-- ---------- Vue : trajets réservables ----------
CREATE VIEW v_trajets_disponibles AS
SELECT t.id_trajet, t.lieu_depart, t.lieu_arrivee, t.point_rdv,
       t.date_trajet, t.heure_depart, TIMESTAMP(t.date_trajet, t.heure_depart) AS date_depart,
       t.places_total, t.places_disponibles, t.prix, t.detour_accepte,
       t.recurrent, t.jours_recurrents, t.description, t.statut,
       t.id_utilisateur AS id_conducteur,
       p.prenom AS conducteur_prenom, p.nom_initiale AS conducteur_nom,
       p.note_moyenne AS conducteur_note, p.nb_avis AS conducteur_nb_avis,
       p.statut_verification AS conducteur_verifie, p.photo AS conducteur_photo,
       CONCAT_WS(' ', v.marque, v.modele, v.couleur) AS vehicule
  FROM trajet t
  JOIN v_profil_public p ON p.id_utilisateur = t.id_utilisateur
  JOIN vehicule v ON v.id_vehicule = t.id_vehicule
 WHERE t.statut = 'ouvert' AND TIMESTAMP(t.date_trajet, t.heure_depart) > NOW();


-- ============================================================
-- 4. DONNÉES DE DÉMONSTRATION
-- ------------------------------------------------------------
-- Toutes les situations sont représentées : chaque statut de
-- compte, de demande, de trajet, de réservation, de paiement,
-- d'avis et de litige. Les dates sont relatives à aujourd'hui
-- (CURDATE(), NOW()) pour que la démo reste valable.
--
-- Mots de passe (empreintes bcrypt ci-dessous) :
--   administrateurs : admin1234   |   membres : demo1234
-- ============================================================

SET @import_initial = 1;

-- ---------- Paramètres ----------
INSERT INTO parametre (cle, valeur, description) VALUES
('taux_commission',                   '0.12', 'Part prélevée par la plateforme sur chaque réservation (12 %)'),
('delai_remboursement_heures',        '24',   'Annulation par le passager : remboursée si faite au moins ce nombre d’heures avant le départ'),
('nb_max_alertes',                    '10',   'Nombre maximum d’alertes actives par utilisateur'),
('conservation_justificatifs_jours',  '30',   'Durée de conservation des justificatifs après la décision'),
('tentatives_connexion_max',          '5',    'Échecs de connexion avant blocage temporaire du compte'),
('duree_blocage_minutes',             '15',   'Durée du blocage après trop d’échecs de connexion');

-- ---------- Communes (coordonnées OpenStreetMap) ----------
INSERT INTO commune (nom, latitude, longitude) VALUES
('Mamoudzou', -12.78040, 45.22800), ('Koungou', -12.73580, 45.20670),
('Dzaoudzi-Labattoir', -12.78840, 45.27260), ('Pamandzi', -12.79830, 45.27470),
('Dembéni', -12.84330, 45.18400), ('Bandraboua', -12.70450, 45.12220),
('Tsingoni', -12.78970, 45.10380), ('Sada', -12.85180, 45.09930),
('Chirongui', -12.93540, 45.14920), ('Bandrélé', -12.91230, 45.19390),
('Mtsamboro', -12.69970, 45.06800), ('Ouangani', -12.84980, 45.13990),
('Chiconi', -12.83230, 45.11500), ('M''Tsangamouji', -12.76020, 45.08770),
('Kani-Kéli', -12.95650, 45.10530), ('Bouéni', -12.91070, 45.08010),
('Acoua', -12.72430, 45.05890), ('Passamainty', -12.80110, 45.20920),
('Kawéni', -12.77270, 45.22480), ('Combani', -12.78720, 45.13260),
('Vahibé', -12.79090, 45.17680), ('Longoni', -12.73450, 45.16320);

-- ---------- Administrateurs ----------
-- 1 et 2 actifs, 3 désactivé (ancien stagiaire)
INSERT INTO administrateur (id_admin, nom, prenom, email, mot_de_passe, fonction, actif, derniere_connexion, date_creation) VALUES
(1, 'Admin', 'Covoit''May', 'admin@covoitmay.yt', '$2b$10$lh/0t8A/.qpj9nyudqG0sOnRaGORehBLoQjwTg1pIFuGO773jorbK', 'Responsable de la plateforme', 1, NOW() - INTERVAL 2 HOUR, '2025-01-01 09:00:00'),
(2, 'Ahamada', 'Soilihi', 'moderation@covoitmay.yt', '$2b$10$lh/0t8A/.qpj9nyudqG0sOnRaGORehBLoQjwTg1pIFuGO773jorbK', 'Modérateur', 1, NOW() - INTERVAL 1 DAY, '2025-09-15 09:00:00'),
(3, 'Mohamed', 'Ali', 'stagiaire@covoitmay.yt', '$2b$10$lh/0t8A/.qpj9nyudqG0sOnRaGORehBLoQjwTg1pIFuGO773jorbK', 'Stagiaire (mission terminée)', 0, '2026-03-30 16:00:00', '2026-01-05 09:00:00');

-- ---------- Utilisateurs : une situation par compte ----------
INSERT INTO utilisateur (id_utilisateur, nom, prenom, email, mot_de_passe, telephone, commune, date_naissance, bio, role, statut_verification, statut_compte, cgu_acceptees_le, tentatives_echouees, bloque_jusqu_a, date_inscription, date_suppression, id_admin) VALUES
-- 1. Conductrice vérifiée et active
(1, 'Attoumani', 'Rachida', 'rachida@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 12 34 56', 'Mamoudzou', '1988-04-12',
 'Je fais le trajet Mamoudzou ↔ Combani tous les jours pour le travail. Ponctuelle et bonne ambiance garantie !', 'conducteur', 1, 'actif', '2025-03-12 18:20:00', 0, NULL, '2025-03-12 18:20:00', NULL, 1),
-- 2. Conducteur vérifié et actif
(2, 'Soulaimana', 'Ibrahim', 'ibrahim@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 98 76 54', 'Koungou', '1990-09-02',
 'Conducteur occasionnel, je partage mes frais d’essence sur mes trajets réguliers vers Kawéni.', 'conducteur', 1, 'actif', '2025-06-20 12:00:00', 0, NULL, '2025-06-20 12:00:00', NULL, 1),
-- 3. Passagère active (étudiante)
(3, 'Mari', 'Naïma', 'naima@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 45 67 89', 'Dembéni', '2004-01-20',
 'Étudiante au CUFR de Dembéni, je cherche des trajets réguliers vers Mamoudzou.', 'passager', 0, 'actif', '2025-09-01 08:10:00', 0, NULL, '2025-09-01 08:10:00', NULL, NULL),
-- 4. Conducteur inscrit, en attente de vérification (demande en attente)
(4, 'Abdou', 'Saïd', 'said@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 11 22 33', 'Sada', '1995-07-30',
 'Nouveau sur la plateforme, trajets Sada ↔ Mamoudzou le matin.', 'conducteur', 0, 'en_attente', NOW() - INTERVAL 3 DAY, 0, NULL, NOW() - INTERVAL 3 DAY, NULL, NULL),
-- 5. Passagère qui demande à devenir conductrice (demande en attente)
(5, 'Bacar', 'Fatima', 'fatima@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 55 44 33', 'Pamandzi', '1997-11-05',
 'Je travaille à Mamoudzou, je prends la barge puis un covoiturage.', 'passager', 0, 'actif', '2025-11-05 19:00:00', 0, NULL, '2025-11-05 19:00:00', NULL, NULL),
-- 6. Ancien passager devenu conducteur (demande acceptée) ; voyage aussi comme passager
(6, 'Madi', 'Anli', 'anli@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 70 81 92', 'Chiconi', '1992-03-14',
 'Infirmier au CHM, je propose mes trajets Chiconi ↔ Mamoudzou.', 'conducteur', 1, 'actif', '2026-01-10 20:00:00', 0, NULL, '2026-01-10 20:00:00', NULL, 2),
-- 7. Passagère dont la demande conducteur a été refusée (elle peut en refaire une)
(7, 'Houmadi', 'Zaïnaba', 'zainaba@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '+262 639 23 45 01', 'Tsingoni', '2001-06-22',
 NULL, 'passager', 0, 'actif', '2026-02-03 07:45:00', 0, NULL, '2026-02-03 07:45:00', NULL, NULL),
-- 8. Conducteur vérifié puis suspendu par l'administration
(8, 'Ousseni', 'Kamal', 'kamal@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 64 20 17', 'Sada', '1985-12-01',
 NULL, 'conducteur', 1, 'suspendu', '2025-10-18 10:00:00', 0, NULL, '2025-10-18 10:00:00', NULL, 1),
-- 9. Conductrice refusée à l'inscription (compte refusé)
(9, 'Saïd', 'Mariama', 'mariama@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 38 90 55', 'Bouéni', '1979-08-17',
 NULL, 'conducteur', 0, 'refuse', NOW() - INTERVAL 46 DAY, 0, NULL, NOW() - INTERVAL 46 DAY, NULL, NULL),
-- 10. Compte supprimé à la demande de la personne : données anonymisées (RGPD)
(10, 'Anonyme', 'Compte supprimé', 'supprime-10@anonyme.invalid', NULL, NULL, NULL, NULL,
 NULL, 'passager', 0, 'supprime', '2025-12-01 12:00:00', 0, NULL, '2025-12-01 12:00:00', NOW() - INTERVAL 2 DAY, NULL),
-- 11. Passagère bloquée 15 minutes après 5 mots de passe faux
(11, 'Abdallah', 'Hadidja', 'hadidja@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 77 66 55', 'Dzaoudzi-Labattoir', '1999-02-09',
 NULL, 'passager', 0, 'actif', '2026-04-14 09:30:00', 5, NOW() + INTERVAL 15 MINUTE, '2026-04-14 09:30:00', NULL, NULL),
-- 12. Nouveau passager inscrit hier
(12, 'Combo', 'Moussa', 'moussa@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 10 20 30', 'Bandraboua', '2002-10-30',
 NULL, 'passager', 0, 'actif', NOW() - INTERVAL 1 DAY, 0, NULL, NOW() - INTERVAL 1 DAY, NULL, NULL);

-- ---------- Demandes conducteur : chaque statut ----------
INSERT INTO demande_conducteur (id_demande, marque, modele, couleur, immatriculation, nb_places, fichier_identite, fichier_permis, statut, motif_refus, date_demande, date_traitement, id_utilisateur, id_admin) VALUES
-- acceptées il y a longtemps : justificatifs déjà effacés (RG08.8)
(1, 'Peugeot', '208', 'grise', 'FX-208-KM', 4, NULL, NULL, 'acceptee', NULL, '2025-03-12 18:25:00', '2025-03-13 10:00:00', 1, 1),
(2, 'Dacia', 'Duster', 'blanche', 'GB-517-DZ', 4, NULL, NULL, 'acceptee', NULL, '2025-06-20 12:10:00', '2025-06-21 09:30:00', 2, 1),
(3, 'Hyundai', 'i10', 'noire', 'FT-609-SA', 3, NULL, NULL, 'acceptee', NULL, '2025-10-18 10:05:00', '2025-10-19 11:00:00', 8, 1),
-- en attente : justificatifs présents
(4, 'Renault', 'Clio', 'rouge', 'HC-341-SD', 4, '3f8a1c9e2b7d4f60a1e5c8b9d2f4a7e1.pdf', '9b2e7d1a4c6f8e03b5a9d7c1e2f4b6a8.jpg', 'en_attente', NULL, NOW() - INTERVAL 3 DAY, NULL, 4, NULL),
(5, 'Toyota', 'Yaris', 'bleue', 'HD-902-PM', 4, 'c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4.pdf', 'e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1.pdf', 'en_attente', NULL, NOW() - INTERVAL 20 HOUR, NULL, 5, NULL),
-- acceptée récemment : justificatifs encore conservés
(6, 'Renault', 'Kangoo', 'verte', 'HA-118-CH', 4, '7a9c1e3f5b7d9a1c3e5f7b9d1a3c5e7f.pdf', 'b8d0f2a4c6e8b0d2f4a6c8e0b2d4f6a8.png', 'acceptee', NULL, NOW() - INTERVAL 6 DAY, NOW() - INTERVAL 5 DAY, 6, 2),
-- refusée récemment (passagère, peut refaire une demande)
(7, 'Kia', 'Picanto', 'blanche', 'HB-772-TS', 3, 'd2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2.jpg', 'f9e7d5c3b1a9f7e5d3c1b9a7f5e3d1c9.jpg', 'refusee', 'Photo du permis illisible : merci d’envoyer un nouveau scan en couleur.', NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 10 DAY, 7, 2),
-- refusée il y a plus de 30 jours : justificatifs effacés
(8, 'Citroën', 'C3', 'grise', 'GZ-450-BN', 4, NULL, NULL, 'refusee', 'Permis de conduire expiré.', NOW() - INTERVAL 45 DAY, NOW() - INTERVAL 40 DAY, 9, 1);

-- Les comptes de démonstration ont déjà validé leur adresse email (RG02.20)
UPDATE utilisateur SET email_verifie = 1, email_verifie_le = date_inscription WHERE statut_compte <> 'supprime';

-- ---------- Véhicules ----------
INSERT INTO vehicule (id_vehicule, marque, modele, couleur, immatriculation, nb_places, actif, date_ajout, id_utilisateur) VALUES
(1, 'Peugeot', '208', 'grise', 'FX-208-KM', 4, 1, '2025-03-13 10:00:00', 1),
(2, 'Dacia', 'Duster', 'blanche', 'GB-517-DZ', 4, 1, '2025-06-21 09:30:00', 2),
(3, 'Renault', 'Kangoo', 'verte', 'HA-118-CH', 4, 1, NOW() - INTERVAL 5 DAY, 6),
(4, 'Hyundai', 'i10', 'noire', 'FT-609-SA', 3, 1, '2025-10-19 11:00:00', 8),
-- ancien véhicule de Rachida, désactivé (RG03.7)
(5, 'Kia', 'Picanto', 'rouge', 'EQ-990-MM', 3, 0, '2025-03-13 10:00:00', 1);

-- ---------- Trajets : chaque statut ----------
INSERT INTO trajet (id_trajet, lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, detour_accepte, recurrent, jours_recurrents, description, statut, date_publication, date_annulation, id_utilisateur, id_vehicule) VALUES
-- ouverts, à venir
(1, 'Mamoudzou', 'Combani', 'Rond-point du marché, Mamoudzou', CURDATE() + INTERVAL 1 DAY, '17:30', 3, 3.50, 1, 1, 'lun,mar,mer,jeu,ven',
 'Trajet retour du travail, départ précis à 17h30. Climatisation. Petit détour possible par Tsingoni.', 'ouvert', NOW() - INTERVAL 4 DAY, NULL, 1, 1),
(2, 'Koungou', 'Kawéni', 'Station Total Koungou', CURDATE() + INTERVAL 1 DAY, '06:45', 4, 2.00, 0, 1, 'lun,mar,mer,jeu,ven',
 'Départ tôt pour éviter les embouteillages de Kawéni. Merci d’être à l’heure !', 'ouvert', NOW() - INTERVAL 6 DAY, NULL, 2, 2),
-- deviendra « complet » avec les réservations ci-dessous (RG04.12)
(3, 'Combani', 'Mamoudzou', 'Place du marché de Combani', CURDATE() + INTERVAL 2 DAY, '07:00', 3, 3.50, 1, 1, 'lun,mar,mer,jeu,ven',
 'Trajet aller du matin vers Mamoudzou centre. Arrivée vers 7h45 selon circulation.', 'ouvert', NOW() - INTERVAL 4 DAY, NULL, 1, 1),
(4, 'Mamoudzou', 'Dembéni', 'Devant le CHM, Mamoudzou', CURDATE() + INTERVAL 2 DAY, '12:15', 4, 2.50, 1, 0, NULL,
 'Trajet ponctuel vers Dembéni, passage par Passamainty. Bagages ok.', 'ouvert', NOW() - INTERVAL 2 DAY, NULL, 2, 2),
(5, 'Chiconi', 'Mamoudzou', 'Mairie de Chiconi', CURDATE() + INTERVAL 3 DAY, '06:30', 3, 4.00, 0, 1, 'lun,mer,ven',
 'Départ tous les lundis, mercredis et vendredis vers le CHM.', 'ouvert', NOW() - INTERVAL 4 DAY, NULL, 6, 3),
-- terminés
(6, 'Mamoudzou', 'Bandrélé', 'Gare maritime, Mamoudzou', CURDATE() - INTERVAL 3 DAY, '16:00', 3, 4.50, 0, 0, NULL,
 'Trajet vers le sud, plage de Sakouli possible.', 'termine', NOW() - INTERVAL 9 DAY, NULL, 1, 1),
(7, 'Koungou', 'Mamoudzou', 'Station Total Koungou', CURDATE() - INTERVAL 5 DAY, '07:15', 4, 2.00, 0, 0, NULL,
 NULL, 'termine', NOW() - INTERVAL 10 DAY, NULL, 2, 2),
-- annulé par l'administration (conducteur suspendu)
(8, 'Sada', 'Mamoudzou', 'Mairie de Sada', CURDATE() + INTERVAL 4 DAY, '06:30', 3, 4.00, 0, 0, NULL,
 'Trajet matinal par la route du littoral.', 'annule', NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 2 DAY, 8, 4),
-- annulé par la conductrice le matin même
(9, 'Mamoudzou', 'Dzaoudzi-Labattoir', 'Gare maritime, Mamoudzou', CURDATE() - INTERVAL 1 DAY, '08:00', 3, 3.00, 0, 0, NULL,
 'Traversée en barge comprise.', 'annule', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 1 DAY, 1, 1),
-- ouvert, sans aucune réservation acceptée
(10, 'Kawéni', 'Longoni', 'Parking du Baobab, Kawéni', CURDATE() + INTERVAL 6 DAY, '18:00', 4, 3.00, 1, 0, NULL,
 'Retour vers le port de Longoni, détour possible par Koungou.', 'ouvert', NOW() - INTERVAL 1 DAY, NULL, 2, 2),
-- terminé (Anli comme conducteur)
(11, 'Mamoudzou', 'Chiconi', 'Place Zakia Madi, Mamoudzou', CURDATE() - INTERVAL 2 DAY, '17:45', 3, 4.00, 0, 0, NULL,
 NULL, 'termine', NOW() - INTERVAL 4 DAY, NULL, 6, 3);

-- ---------- Réservations : chaque statut ----------
-- Les places des trajets sont mises à jour par le trigger.
INSERT INTO reservation (id_reservation, id_utilisateur, id_trajet, nb_places_reservees, statut, date_reservation, date_reponse, date_annulation, annulee_par) VALUES
(1,  3,  1, 1, 'confirmee',  NOW() - INTERVAL 1 DAY,  NOW() - INTERVAL 23 HOUR, NULL, NULL),
(2,  5,  3, 1, 'en_attente', NOW() - INTERVAL 3 HOUR, NULL, NULL, NULL),     -- attend la réponse, trajet devenu complet
(3,  3,  6, 1, 'terminee',   NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 4 DAY, NULL, NULL),
(4,  5,  2, 1, 'confirmee',  NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 4 HOUR, NULL, NULL),
(5,  6,  3, 2, 'confirmee',  NOW() - INTERVAL 2 DAY,  NOW() - INTERVAL 2 DAY, NULL, NULL),   -- un conducteur voyage comme passager
(6,  7,  3, 1, 'confirmee',  NOW() - INTERVAL 1 DAY,  NOW() - INTERVAL 1 DAY, NULL, NULL),
(7,  7,  1, 1, 'refusee',    NOW() - INTERVAL 2 DAY,  NOW() - INTERVAL 2 DAY, NULL, NULL),
(8,  3,  2, 1, 'annulee',    NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 2 DAY, 'passager'),   -- annulée tôt : remboursée
(9,  5,  6, 1, 'terminee',   NOW() - INTERVAL 5 DAY,  NOW() - INTERVAL 5 DAY, NULL, NULL),
(10, 3,  7, 1, 'terminee',   NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY, NULL, NULL),
(11, 5,  7, 1, 'terminee',   NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY, NULL, NULL),
(12, 3,  8, 1, 'annulee',    NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 2 DAY, 'admin'),      -- trajet annulé par l'administration
(13, 10, 7, 1, 'terminee',   NOW() - INTERVAL 8 DAY,  NOW() - INTERVAL 8 DAY, NULL, NULL),                          -- historique d'un compte supprimé
(14, 11, 9, 1, 'annulee',    NOW() - INTERVAL 2 DAY,  NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY, 'conducteur'),
(15, 7, 11, 1, 'terminee',   NOW() - INTERVAL 3 DAY,  NOW() - INTERVAL 3 DAY, NULL, NULL),
(16, 3,  5, 1, 'en_attente', NOW() - INTERVAL 6 HOUR, NULL, NULL, NULL),
(17, 7,  7, 1, 'annulee',    NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY, NOW() - INTERVAL 5 DAY - INTERVAL 2 HOUR, 'passager'),   -- annulée trop tard : non remboursée
(18, 12, 4, 1, 'annulee',    NOW() - INTERVAL 20 HOUR, NULL, NOW() - INTERVAL 20 HOUR, 'systeme'),                  -- paiement refusé par la banque
(19, 12, 10, 2, 'en_attente', NOW() - INTERVAL 2 HOUR, NULL, NULL, NULL);

-- ---------- Paiements : chaque statut ----------
-- Montant et commission sont recalculés par le trigger (RG06.5).
INSERT INTO paiement (id_paiement, reference, mode_paiement, statut, date_creation, date_paiement, date_remboursement, id_reservation) VALUES
(1,  'CM-P-000001', 'carte',        'valide',    NOW() - INTERVAL 1 DAY,  NOW() - INTERVAL 23 HOUR, NULL, 1),
(2,  'CM-P-000002', 'carte',        'autorise',  NOW() - INTERVAL 3 HOUR, NULL, NULL, 2),
(3,  'CM-P-000003', 'carte',        'valide',    NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 4 DAY, NULL, 3),
(4,  'CM-P-000004', 'mobile_money', 'valide',    NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 4 HOUR, NULL, 4),
(5,  'CM-P-000005', 'carte',        'valide',    NOW() - INTERVAL 2 DAY,  NOW() - INTERVAL 2 DAY, NULL, 5),
(6,  'CM-P-000006', 'mobile_money', 'valide',    NOW() - INTERVAL 1 DAY,  NOW() - INTERVAL 1 DAY, NULL, 6),
(7,  'CM-P-000007', 'carte',        'annule',    NOW() - INTERVAL 2 DAY,  NULL, NULL, 7),
(8,  'CM-P-000008', 'carte',        'rembourse', NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 2 DAY, 8),
(9,  'CM-P-000009', 'carte',        'valide',    NOW() - INTERVAL 5 DAY,  NOW() - INTERVAL 5 DAY, NULL, 9),
(10, 'CM-P-000010', 'carte',        'valide',    NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY, NULL, 10),
(11, 'CM-P-000011', 'mobile_money', 'valide',    NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY, NULL, 11),
(12, 'CM-P-000012', 'carte',        'rembourse', NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 2 DAY, 12),
(13, 'CM-P-000013', 'carte',        'valide',    NOW() - INTERVAL 8 DAY,  NOW() - INTERVAL 8 DAY, NULL, 13),
(14, 'CM-P-000014', 'mobile_money', 'rembourse', NOW() - INTERVAL 2 DAY,  NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY, 14),
(15, 'CM-P-000015', 'carte',        'valide',    NOW() - INTERVAL 3 DAY,  NOW() - INTERVAL 3 DAY, NULL, 15),
(16, 'CM-P-000016', 'mobile_money', 'autorise',  NOW() - INTERVAL 6 HOUR, NULL, NULL, 16),
(17, 'CM-P-000017', 'carte',        'valide',    NOW() - INTERVAL 7 DAY,  NOW() - INTERVAL 7 DAY, NULL, 17),
(18, 'CM-P-000018', 'carte',        'echoue',    NOW() - INTERVAL 20 HOUR, NULL, NULL, 18),
(19, 'CM-P-000019', 'carte',        'autorise',  NOW() - INTERVAL 2 HOUR, NULL, NULL, 19);

-- ---------- Avis : publiés et signalé ----------
-- La note moyenne des conducteurs est recalculée par le trigger.
INSERT INTO avis (id_avis, note, commentaire, date_avis, signale, motif_signalement, date_signalement, id_signaleur, id_utilisateur, id_cible, id_trajet) VALUES
(1, 5, 'Rachida est très ponctuelle et sa voiture est impeccable. Super trajet vers Bandrélé !', NOW() - INTERVAL 2 DAY, 0, NULL, NULL, NULL, 3, 1, 6),
(2, 5, 'Toujours à l’heure, conduite prudente. Je recommande vivement.', NOW() - INTERVAL 2 DAY, 0, NULL, NULL, NULL, 5, 1, 6),
(3, 4, 'Bon trajet, un peu de retard au départ mais conducteur sympa.', NOW() - INTERVAL 4 DAY, 0, NULL, NULL, NULL, 3, 2, 7),
(4, 2, 'Conducteur désagréable, propos déplacés pendant tout le trajet…', NOW() - INTERVAL 4 DAY, 1, 'Propos mensongers et insultants', NOW() - INTERVAL 3 DAY, 2, 5, 2, 7),
(5, 5, 'Anli conduit prudemment et il est très arrangeant sur le point de rendez-vous.', NOW() - INTERVAL 1 DAY, 0, NULL, NULL, NULL, 7, 6, 11),
(6, 3, 'Trajet correct, rien de particulier à signaler.', NOW() - INTERVAL 4 DAY, 0, NULL, NULL, NULL, 10, 2, 7);

-- ---------- Messages ----------
INSERT INTO message (id_message, contenu, date_envoi, lu, date_lecture, id_expediteur, id_destinataire) VALUES
(1, 'Bonjour Rachida, votre trajet de 17h30 est-il toujours disponible ?', NOW() - INTERVAL 26 HOUR, 1, NOW() - INTERVAL 25 HOUR, 3, 1),
(2, 'Bonjour Naïma ! Oui, il reste 2 places. Je vous attends au rond-point du marché.', NOW() - INTERVAL 25 HOUR, 1, NOW() - INTERVAL 24 HOUR, 1, 3),
(3, 'Parfait, je viens de réserver. À demain !', NOW() - INTERVAL 24 HOUR, 1, NOW() - INTERVAL 23 HOUR, 3, 1),
(4, 'Bonjour, est-ce que vous passez près de la barge côté Grande-Terre ?', NOW() - INTERVAL 4 HOUR, 0, NULL, 5, 2),
(5, 'Bonjour Rachida, j’ai réservé deux places pour ma sœur et moi.', NOW() - INTERVAL 2 DAY, 1, NOW() - INTERVAL 2 DAY, 6, 1),
(6, 'C’est noté Anli, rendez-vous place du marché à 6h55.', NOW() - INTERVAL 1 DAY, 0, NULL, 1, 6),
(7, 'Bonjour, pourquoi le trajet de ce matin a-t-il été annulé ?', NOW() - INTERVAL 1 DAY, 1, NOW() - INTERVAL 1 DAY, 11, 1),
(8, 'Désolée, panne de voiture au dernier moment. Vous êtes remboursée intégralement.', NOW() - INTERVAL 23 HOUR, 1, NOW() - INTERVAL 22 HOUR, 1, 11);

-- ---------- Litiges : chaque statut ----------
INSERT INTO litige (id_litige, motif, description, statut, decision, resolution, montant_rembourse, date_ouverture, date_resolution, id_reservation, id_demandeur, id_admin) VALUES
(1, 'Trajet annulé la veille, j’ai dû prendre un taxi.', 'Le taxi m’a coûté 25 € pour aller à Mamoudzou.', 'en_cours', NULL, NULL, NULL, NOW() - INTERVAL 1 DAY, NULL, 12, 3, 2),
(2, 'Annulation une heure avant le départ, sans prévenir.', NULL, 'resolu', 'avertissement', 'Remboursement intégral déjà effectué. Avertissement envoyé à la conductrice.', NULL, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 10 HOUR, 14, 11, 1),
(3, 'Retard de 40 minutes au point de rendez-vous.', 'Le conducteur n’a pas répondu aux messages.', 'ouvert', NULL, NULL, NULL, NOW() - INTERVAL 3 HOUR, NULL, 11, 5, NULL),
(4, 'La passagère a annulé 2 heures avant le départ.', 'La place n’a pas pu être proposée à quelqu’un d’autre.', 'resolu', 'sans_suite', 'Annulation tardive : le paiement a été conservé et reversé au conducteur, conformément aux conditions.', 0, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 4 DAY, 17, 2, 1);

-- ---------- Alertes ----------
INSERT INTO alerte (id_alerte, lieu_depart, lieu_arrivee, heure_min, heure_max, prix_max, active, date_creation, id_utilisateur) VALUES
(1, 'Dembéni', 'Mamoudzou', '06:00', '08:00', 4.00, 1, NOW() - INTERVAL 20 DAY, 3),
(2, 'Dzaoudzi-Labattoir', 'Mamoudzou', '06:30', '07:30', NULL, 0, NOW() - INTERVAL 60 DAY, 5),
(3, 'Bandraboua', 'Mamoudzou', '05:30', '07:00', 3.00, 1, NOW() - INTERVAL 1 DAY, 12),
(4, 'Tsingoni', 'Mamoudzou', '06:00', '09:00', NULL, 1, NOW() - INTERVAL 15 DAY, 7);

-- ---------- Favoris ----------
INSERT INTO favori (id_utilisateur, id_conducteur, date_ajout) VALUES
(3, 1, NOW() - INTERVAL 30 DAY),
(5, 1, NOW() - INTERVAL 10 DAY),
(7, 6, NOW() - INTERVAL 1 DAY),
(6, 2, NOW() - INTERVAL 40 DAY);

-- ---------- Journal des administrateurs ----------
INSERT INTO journal_admin (action, table_cible, id_cible, details, adresse_ip, date_action, id_admin) VALUES
('VALIDATION_CONDUCTEUR', 'demande_conducteur', 1, 'Dossier de Rachida Attoumani validé', '127.0.0.1', '2025-03-13 10:00:00', 1),
('VALIDATION_CONDUCTEUR', 'demande_conducteur', 2, 'Dossier d’Ibrahim Soulaimana validé', '127.0.0.1', '2025-06-21 09:30:00', 1),
('MODIFICATION_PARAMETRE', 'parametre', NULL, 'taux_commission : 0.10 -> 0.12', '127.0.0.1', '2025-09-01 08:00:00', 1),
('VALIDATION_CONDUCTEUR', 'demande_conducteur', 3, 'Dossier de Kamal Ousseni validé', '127.0.0.1', '2025-10-19 11:00:00', 1),
('REFUS_CONDUCTEUR', 'demande_conducteur', 8, 'Dossier de Mariama Saïd refusé : permis expiré', '127.0.0.1', NOW() - INTERVAL 40 DAY, 1),
('REFUS_CONDUCTEUR', 'demande_conducteur', 7, 'Dossier de Zaïnaba Houmadi refusé : permis illisible', '127.0.0.1', NOW() - INTERVAL 10 DAY, 2),
('VALIDATION_CONDUCTEUR', 'demande_conducteur', 6, 'Dossier d’Anli Madi validé', '127.0.0.1', NOW() - INTERVAL 5 DAY, 2),
('SUSPENSION_COMPTE', 'utilisateur', 8, 'Trois annulations de dernière minute signalées', '127.0.0.1', NOW() - INTERVAL 2 DAY, 1),
('ANNULATION_TRAJET', 'trajet', 8, 'Trajet annulé à la suite de la suspension du conducteur', '127.0.0.1', NOW() - INTERVAL 2 DAY, 1),
('RESOLUTION_LITIGE', 'litige', 4, 'Sans suite', '127.0.0.1', NOW() - INTERVAL 4 DAY, 1),
('PRISE_EN_CHARGE_LITIGE', 'litige', 1, NULL, '127.0.0.1', NOW() - INTERVAL 20 HOUR, 2),
('RESOLUTION_LITIGE', 'litige', 2, 'Avertissement envoyé à la conductrice', '127.0.0.1', NOW() - INTERVAL 10 HOUR, 1);

SET @import_initial = NULL;


-- ============================================================
-- 5. COMPTE MARIADB DE L'APPLICATION (droits minimaux, RG13.9)
-- ------------------------------------------------------------
-- Le backend ne se connecte JAMAIS en root. Ce compte :
--   - lit toutes les tables et les vues ;
--   - n'a aucun droit de structure (CREATE, DROP, ALTER…) ;
--   - ne peut ni créer d'administrateur, ni supprimer un
--     utilisateur, un paiement ou une ligne du journal.
-- CHANGEZ le mot de passe ci-dessous, puis reportez-le dans
-- backend/.env (DB_PASSWORD).
-- ============================================================

DROP USER IF EXISTS 'covoitmay_app'@'localhost';
DROP USER IF EXISTS 'covoitmay_app'@'127.0.0.1';
CREATE USER 'covoitmay_app'@'localhost' IDENTIFIED BY 'Covoit-May_App_2026!';
CREATE USER 'covoitmay_app'@'127.0.0.1' IDENTIFIED BY 'Covoit-May_App_2026!';

GRANT SELECT ON covoitmay.* TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT UPDATE ON covoitmay.administrateur TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.utilisateur TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.vehicule TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.demande_conducteur TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.trajet TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.reservation TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.paiement TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON covoitmay.avis TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.message TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE ON covoitmay.litige TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON covoitmay.alerte TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, UPDATE, DELETE ON covoitmay.code_verification TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT ON covoitmay.message_masque TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT, DELETE ON covoitmay.favori TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT UPDATE ON covoitmay.parametre TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT ON covoitmay.journal_admin TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT EXECUTE ON PROCEDURE covoitmay.cloturer_trajets_passes TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
FLUSH PRIVILEGES;

-- ============================================================
-- Petit contrôle final : le nombre de lignes de chaque table
-- ============================================================
SELECT 'commune' AS table_name, COUNT(*) AS nb FROM commune
UNION ALL SELECT 'administrateur', COUNT(*) FROM administrateur
UNION ALL SELECT 'utilisateur', COUNT(*) FROM utilisateur
UNION ALL SELECT 'demande_conducteur', COUNT(*) FROM demande_conducteur
UNION ALL SELECT 'vehicule', COUNT(*) FROM vehicule
UNION ALL SELECT 'trajet', COUNT(*) FROM trajet
UNION ALL SELECT 'reservation', COUNT(*) FROM reservation
UNION ALL SELECT 'paiement', COUNT(*) FROM paiement
UNION ALL SELECT 'avis', COUNT(*) FROM avis
UNION ALL SELECT 'message', COUNT(*) FROM message
UNION ALL SELECT 'litige', COUNT(*) FROM litige
UNION ALL SELECT 'alerte', COUNT(*) FROM alerte
UNION ALL SELECT 'favori', COUNT(*) FROM favori
UNION ALL SELECT 'journal_admin', COUNT(*) FROM journal_admin;
