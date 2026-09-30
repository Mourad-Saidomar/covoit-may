-- ============================================================
-- Migration « médias » : photos de profil, photos et messages
-- vocaux dans la messagerie
-- ------------------------------------------------------------
-- À lancer UNE fois sur une base déjà créée avec l'ancienne
-- version de covoitmay.sql (base locale, base de production).
-- Une base neuve créée avec covoitmay.sql n'en a pas besoin.
-- Aucune donnée n'est perdue.
--
-- En local (invite de commandes, dossier backend) :
--   mariadb -u root -p covoitmay < database/migrations/2026-10-medias.sql
-- En production (SSH alwaysdata, dossier ~/covoitmay/backend) :
--   mysql -h mysql-mourad.alwaysdata.net -u mourad -p mourad_covoitmay < database/migrations/2026-10-medias.sql
-- ============================================================

-- ---------- Photo de profil (RG02.19) ----------
ALTER TABLE utilisateur
  ADD COLUMN photo VARCHAR(255) DEFAULT NULL AFTER bio,
  ADD CONSTRAINT ck_util_photo_suppression CHECK (statut_compte <> 'supprime' OR photo IS NULL);

-- ---------- Photos et vocaux dans la messagerie (RG09.6, RG09.7) ----------
ALTER TABLE message
  ADD COLUMN type_message ENUM('texte','image','vocal') NOT NULL DEFAULT 'texte' AFTER id_message,
  MODIFY COLUMN contenu VARCHAR(1000) NOT NULL DEFAULT '',
  ADD COLUMN fichier VARCHAR(255) DEFAULT NULL AFTER contenu,
  ADD COLUMN fichier_type VARCHAR(50) DEFAULT NULL AFTER fichier,
  ADD COLUMN duree_secondes SMALLINT UNSIGNED DEFAULT NULL AFTER fichier_type,
  DROP CONSTRAINT ck_message_contenu;

ALTER TABLE message
  ADD CONSTRAINT ck_message_contenu CHECK ((type_message = 'texte' AND fichier IS NULL AND CHAR_LENGTH(TRIM(contenu)) > 0)
                                           OR (type_message <> 'texte' AND fichier IS NOT NULL AND fichier_type IS NOT NULL)),
  ADD CONSTRAINT ck_message_duree CHECK ((type_message = 'vocal' AND duree_secondes BETWEEN 1 AND 120)
                                         OR (type_message <> 'vocal' AND duree_secondes IS NULL));

-- Un message envoyé, fichier compris, ne se modifie plus (RG09.3)
DROP TRIGGER IF EXISTS trg_message_avant_modification;
DELIMITER $$
CREATE TRIGGER trg_message_avant_modification BEFORE UPDATE ON message FOR EACH ROW
BEGIN
  IF NEW.contenu <> OLD.contenu OR NEW.id_expediteur <> OLD.id_expediteur
     OR NEW.id_destinataire <> OLD.id_destinataire OR NEW.date_envoi <> OLD.date_envoi
     OR NEW.type_message <> OLD.type_message OR NOT (NEW.fichier <=> OLD.fichier) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un message envoyé ne peut plus être modifié (RG09.3).';
  END IF;
  IF NEW.lu = 1 AND OLD.lu = 0 THEN
    SET NEW.date_lecture = NOW();
  END IF;
END$$
DELIMITER ;

-- ---------- Vues : la photo fait partie du profil public ----------
CREATE OR REPLACE VIEW v_profil_public AS
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

CREATE OR REPLACE VIEW v_trajets_disponibles AS
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

-- Contrôle : les nouvelles colonnes existent
SELECT COLUMN_NAME, TABLE_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN ('photo','type_message','fichier','fichier_type','duree_secondes')
 ORDER BY TABLE_NAME, COLUMN_NAME;
