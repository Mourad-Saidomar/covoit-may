-- ============================================================
-- Base LOCALE uniquement, après 2026-10-temps-reel.sql :
-- droits du compte covoitmay_app sur les nouvelles tables (RG13.9).
-- En production (alwaysdata), l'utilisateur de l'application a déjà
-- les droits sur sa base : ce fichier n'y sert pas.
--   & "C:\Program Files\MariaDB 12.3\bin\mariadb.exe" -u root -p covoitmay -e "source database/migrations/2026-10-temps-reel-droits-local.sql"
-- ============================================================
GRANT INSERT, UPDATE, DELETE ON code_verification TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
GRANT INSERT ON message_masque TO 'covoitmay_app'@'localhost', 'covoitmay_app'@'127.0.0.1';
FLUSH PRIVILEGES;
SHOW GRANTS FOR 'covoitmay_app'@'localhost';
