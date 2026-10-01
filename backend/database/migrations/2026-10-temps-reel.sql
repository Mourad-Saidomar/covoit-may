-- ============================================================
-- Migration « temps réel et sécurité du compte »
-- ------------------------------------------------------------
-- - adresse email vérifiée par un code à 6 chiffres (RG02.20) ;
-- - codes de vérification (inscription, mot de passe oublié) (RG02.21) ;
-- - messagerie : accusés de réception et de lecture, modification
--   pendant 15 minutes, suppression pour soi ou pour tous (RG09.3,
--   RG09.8, RG09.9) ;
-- - alertes : trajets nouveaux depuis la dernière consultation (RG11.6).
-- À lancer UNE fois, APRÈS 2026-10-medias.sql. Aucune donnée perdue.
--
-- En local (PowerShell, dossier backend) :
--   & "C:\Program Files\MariaDB 12.3\bin\mariadb.exe" -u root -p covoitmay -e "source database/migrations/2026-10-temps-reel.sql"
-- En production (SSH, dossier ~/covoitmay/backend) :
--   mysql -h mysql-mourad.alwaysdata.net -u mourad -p mourad_covoitmay < database/migrations/2026-10-temps-reel.sql
-- ============================================================

-- ---------- Email vérifié (RG02.20) ----------
-- Les comptes existants sont considérés comme vérifiés.
ALTER TABLE utilisateur
  ADD COLUMN email_verifie TINYINT(1) NOT NULL DEFAULT 0 AFTER email,
  ADD COLUMN email_verifie_le DATETIME DEFAULT NULL AFTER email_verifie;
UPDATE utilisateur SET email_verifie = 1, email_verifie_le = date_inscription;
ALTER TABLE utilisateur
  ADD CONSTRAINT ck_util_email_verifie CHECK (email_verifie = 0 OR email_verifie_le IS NOT NULL);

-- ---------- Codes de vérification (RG02.21) ----------
-- Le code n'est jamais stocké : seulement son empreinte (HMAC-SHA256).
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

-- ---------- Messagerie (RG09.3, RG09.8, RG09.9) ----------
ALTER TABLE message
  ADD COLUMN date_reception DATETIME DEFAULT NULL AFTER date_envoi,
  ADD COLUMN date_modification DATETIME DEFAULT NULL AFTER date_lecture,
  ADD COLUMN supprime_le DATETIME DEFAULT NULL AFTER date_modification,
  DROP CONSTRAINT ck_message_contenu;
ALTER TABLE message
  ADD CONSTRAINT ck_message_contenu CHECK (
       (supprime_le IS NOT NULL AND fichier IS NULL AND contenu = '')
    OR (supprime_le IS NULL AND type_message = 'texte' AND fichier IS NULL AND CHAR_LENGTH(TRIM(contenu)) > 0)
    OR (supprime_le IS NULL AND type_message <> 'texte' AND fichier IS NOT NULL AND fichier_type IS NOT NULL));

-- Messages masqués par une personne (« supprimer pour moi »)
CREATE TABLE message_masque (
  id_message     INT NOT NULL,
  id_utilisateur INT NOT NULL,
  date_masquage  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_message, id_utilisateur),
  CONSTRAINT fk_masque_message FOREIGN KEY (id_message) REFERENCES message (id_message),
  CONSTRAINT fk_masque_utilisateur FOREIGN KEY (id_utilisateur) REFERENCES utilisateur (id_utilisateur)
) ENGINE=InnoDB;

DROP TRIGGER IF EXISTS trg_message_avant_modification;
DELIMITER $$
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
DELIMITER ;

-- ---------- Alertes : nouveaux trajets depuis la dernière visite (RG11.6) ----------
ALTER TABLE alerte
  ADD COLUMN derniere_consultation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER date_creation;

-- Base LOCALE seulement : lancer ensuite 2026-10-temps-reel-droits-local.sql
-- (droits du compte covoitmay_app, qui n'existe pas en production).

-- Contrôle
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND COLUMN_NAME IN ('email_verifie','date_reception','date_modification','supprime_le','derniere_consultation')
    OR (TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('code_verification','message_masque') AND COLUMN_NAME LIKE 'id_%')
 ORDER BY TABLE_NAME, COLUMN_NAME;
