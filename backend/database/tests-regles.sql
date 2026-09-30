-- ============================================================
-- Covoit'May : tests des règles de gestion dans la base
-- ------------------------------------------------------------
-- Chaque test essaie une opération INTERDITE : MariaDB doit
-- répondre par une erreur qui cite la règle (ex. « (RG05.3) »).
-- Les tests « ATTENDU : OK » montrent les calculs automatiques.
--
-- Tout se passe dans une transaction annulée à la fin (ROLLBACK) :
-- la base de démonstration n'est pas modifiée.
--
-- Lancer (dossier backend) – l'option --force continue après
-- chaque erreur attendue :
--   mariadb --force -u root -p covoitmay < database/tests-regles.sql
-- ============================================================

SET NAMES utf8mb4;
START TRANSACTION;

SELECT '--- RG01.1 / RG01.5 : email administrateur unique et distinct des utilisateurs' AS test;
INSERT INTO administrateur (nom, prenom, email, mot_de_passe)
VALUES ('Test', 'Doublon', 'naima@exemple.yt', '$2b$10$lh/0t8A/.qpj9nyudqG0sOnRaGORehBLoQjwTg1pIFuGO773jorbK');

SELECT '--- RG01.2 : mot de passe en clair refusé' AS test;
INSERT INTO administrateur (nom, prenom, email, mot_de_passe) VALUES ('Test', 'Clair', 'clair@covoitmay.yt', 'admin1234');

SELECT '--- RG01.4 : impossible de désactiver le dernier administrateur actif' AS test;
UPDATE administrateur SET actif = 0 WHERE id_admin = 2;   -- ATTENDU : OK (il en reste un)
UPDATE administrateur SET actif = 0 WHERE id_admin = 1;   -- ATTENDU : erreur

SELECT '--- RG01.6 : le journal ne se modifie pas' AS test;
UPDATE journal_admin SET details = 'effacé' WHERE id_journal = 1;
DELETE FROM journal_admin WHERE id_journal = 1;

SELECT '--- RG02.1 : email utilisateur unique (même avec des majuscules)' AS test;
INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, cgu_acceptees_le)
VALUES ('Test', 'Doublon', 'NAIMA@Exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 00 00 01', NOW());

SELECT '--- RG02.6 / RG02.7 : email et téléphone au bon format' AS test;
INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, cgu_acceptees_le)
VALUES ('Test', 'Email', 'pas-un-email', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 00 00 02', NOW());
INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, cgu_acceptees_le)
VALUES ('Test', 'Tel', 'tel@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '12345', NOW());

SELECT '--- RG02.8 : il faut être majeur' AS test;
INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, date_naissance, cgu_acceptees_le)
VALUES ('Test', 'Mineur', 'mineur@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 00 00 03', CURDATE() - INTERVAL 15 YEAR, NOW());

SELECT '--- RG02.10 : un nouveau compte n''est jamais vérifié, même si on l''envoie' AS test;
INSERT INTO utilisateur (nom, prenom, email, mot_de_passe, telephone, role, statut_verification, statut_compte, id_admin, cgu_acceptees_le)
VALUES ('Test', 'Malin', 'malin@exemple.yt', '$2b$10$nJflBPtcGshMw.NJeaHVzOSxl1VFEY50hAfSNLKunavRbj9ZScIQK', '0639 00 00 04', 'conducteur', 1, 'actif', 1, NOW());
SELECT role, statut_verification, statut_compte, id_admin FROM utilisateur WHERE email = 'malin@exemple.yt';  -- ATTENDU : conducteur, 0, en_attente, NULL

SELECT '--- RG02.14 : un compte supprimé ne revient pas' AS test;
UPDATE utilisateur SET statut_compte = 'actif' WHERE id_utilisateur = 10;

SELECT '--- RG02.3 : un conducteur non vérifié ne publie pas (même avec un véhicule)' AS test;
INSERT INTO vehicule (id_vehicule, marque, modele, immatriculation, nb_places, id_utilisateur) VALUES (99, 'Renault', 'Clio', 'HC-341-SD', 4, 4);
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Sada', 'Mamoudzou', 'Mairie', CURDATE() + INTERVAL 5 DAY, '07:00', 2, 3, 4, 99);

SELECT '--- RG03.2 : un passager ne possède pas de véhicule' AS test;
INSERT INTO vehicule (marque, modele, immatriculation, nb_places, id_utilisateur) VALUES ('Renault', 'Twingo', 'AA-111-AA', 3, 3);

SELECT '--- RG03.3 / RG03.5 : immatriculation unique et au format AA-123-AA' AS test;
INSERT INTO vehicule (marque, modele, immatriculation, nb_places, id_utilisateur) VALUES ('Peugeot', '308', 'fx-208-km', 4, 2);
INSERT INTO vehicule (marque, modele, immatriculation, nb_places, id_utilisateur) VALUES ('Peugeot', '308', '976-ABC', 4, 2);

SELECT '--- RG03.4 / RG03.6 : 1 à 8 places' AS test;
INSERT INTO vehicule (marque, modele, immatriculation, nb_places, id_utilisateur) VALUES ('Car', 'Bus', 'BB-222-BB', 20, 2);

SELECT '--- RG04.2 : le véhicule d''un autre conducteur est refusé' AS test;
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Koungou', 'Mamoudzou', 'Station', CURDATE() + INTERVAL 5 DAY, '07:00', 2, 3, 2, 1);

SELECT '--- RG04.3 : pas plus de places que le véhicule' AS test;
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Koungou', 'Mamoudzou', 'Station', CURDATE() + INTERVAL 5 DAY, '07:00', 5, 3, 2, 2);

SELECT '--- RG04.4 : pas de trajet dans le passé' AS test;
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Koungou', 'Mamoudzou', 'Station', CURDATE() - INTERVAL 1 DAY, '07:00', 2, 3, 2, 2);

SELECT '--- RG04.6 / RG04.7 : départ différent de l''arrivée, commune connue, prix de 1 à 10 €' AS test;
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Koungou', 'Koungou', 'Station', CURDATE() + INTERVAL 5 DAY, '07:00', 2, 3, 2, 2);
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Paris', 'Koungou', 'Station', CURDATE() + INTERVAL 5 DAY, '07:00', 2, 3, 2, 2);
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Koungou', 'Mamoudzou', 'Station', CURDATE() + INTERVAL 5 DAY, '07:00', 2, 25, 2, 2);

SELECT '--- RG04.10 : deux trajets au même moment' AS test;
INSERT INTO trajet (lieu_depart, lieu_arrivee, point_rdv, date_trajet, heure_depart, places_total, prix, id_utilisateur, id_vehicule)
VALUES ('Koungou', 'Mamoudzou', 'Station', CURDATE() + INTERVAL 1 DAY, '06:45', 2, 3, 2, 2);

SELECT '--- RG04.14 : trajet avec réservations actives figé' AS test;
UPDATE trajet SET prix = 5 WHERE id_trajet = 1;

SELECT '--- RG04.13 : un trajet terminé ne change plus' AS test;
UPDATE trajet SET statut = 'ouvert' WHERE id_trajet = 6;

SELECT '--- RG05.3 : le conducteur ne réserve pas son propre trajet' AS test;
INSERT INTO reservation (id_utilisateur, id_trajet, nb_places_reservees) VALUES (1, 1, 1);

SELECT '--- RG05.2 : pas plus de places que disponibles' AS test;
INSERT INTO reservation (id_utilisateur, id_trajet, nb_places_reservees) VALUES (12, 1, 3);

SELECT '--- RG05.4 : une seule réservation active par trajet' AS test;
INSERT INTO reservation (id_utilisateur, id_trajet, nb_places_reservees) VALUES (3, 1, 1);

SELECT '--- RG05.7 : trajet complet ou terminé non réservable, compte suspendu refusé' AS test;
INSERT INTO reservation (id_utilisateur, id_trajet, nb_places_reservees) VALUES (12, 3, 1);
INSERT INTO reservation (id_utilisateur, id_trajet, nb_places_reservees) VALUES (12, 6, 1);
INSERT INTO reservation (id_utilisateur, id_trajet, nb_places_reservees) VALUES (8, 4, 1);

SELECT '--- RG05.6 : le montant envoyé par le client est ignoré (ATTENDU : OK)' AS test;
INSERT INTO reservation (id_utilisateur, id_trajet, nb_places_reservees, prix_unitaire, montant, statut)
VALUES (12, 4, 2, 0.01, 0.02, 'confirmee');
SELECT statut, prix_unitaire, montant, taux_commission FROM reservation WHERE id_utilisateur = 12 AND id_trajet = 4 AND active = 1;  -- ATTENDU : en_attente, 2.50, 5.00, 0.120
INSERT INTO paiement (reference, mode_paiement, montant, id_reservation)
SELECT 'TEST-001', 'carte', 0.01, id_reservation FROM reservation WHERE id_utilisateur = 12 AND id_trajet = 4 AND active = 1;
SELECT montant, commission, montant_net, statut FROM paiement WHERE reference = 'TEST-001';  -- ATTENDU : 5.00, 0.60, 4.40, autorise

SELECT '--- RG05.5 / RG06.7 : acceptation -> places décrémentées, paiement encaissé (ATTENDU : OK)' AS test;
UPDATE reservation SET statut = 'confirmee' WHERE id_utilisateur = 12 AND id_trajet = 4 AND active = 1;
SELECT places_disponibles FROM trajet WHERE id_trajet = 4;         -- ATTENDU : 2
SELECT statut, date_paiement IS NOT NULL AS encaisse FROM paiement WHERE reference = 'TEST-001';   -- ATTENDU : valide, 1

SELECT '--- RG05.10 / RG06.8 : annulation 2 jours avant -> places rendues, remboursement (ATTENDU : OK)' AS test;
UPDATE reservation SET statut = 'annulee', annulee_par = 'passager' WHERE id_utilisateur = 12 AND id_trajet = 4 AND active = 1;
SELECT places_disponibles FROM trajet WHERE id_trajet = 4;         -- ATTENDU : 4
SELECT statut FROM paiement WHERE reference = 'TEST-001';           -- ATTENDU : rembourse

SELECT '--- RG05.8 : une réservation annulée ne revient pas' AS test;
UPDATE reservation SET statut = 'confirmee' WHERE id_reservation = 8;

SELECT '--- RG04.12 : trajet complet redevenu ouvert quand une place se libère (ATTENDU : OK)' AS test;
UPDATE reservation SET statut = 'annulee', annulee_par = 'passager' WHERE id_reservation = 6;
SELECT places_disponibles, statut FROM trajet WHERE id_trajet = 3;  -- ATTENDU : 1, ouvert

SELECT '--- RG06.2 / RG06.9 : un seul paiement par réservation, ni suppression ni modification' AS test;
INSERT INTO paiement (reference, mode_paiement, id_reservation) VALUES ('TEST-002', 'carte', 1);
DELETE FROM paiement WHERE id_paiement = 1;
UPDATE paiement SET commission = 0 WHERE id_paiement = 1;

SELECT '--- RG06.4 : mode de paiement inconnu' AS test;
INSERT INTO paiement (reference, mode_paiement, id_reservation) VALUES ('TEST-003', 'cheque', 16);

SELECT '--- RG07.2 / RG07.3 : avis avant le trajet, ou sans y avoir voyagé' AS test;
INSERT INTO avis (note, commentaire, id_utilisateur, id_cible, id_trajet) VALUES (5, 'Très bien, je recommande !', 3, 1, 1);
INSERT INTO avis (note, commentaire, id_utilisateur, id_cible, id_trajet) VALUES (5, 'Très bien, je recommande !', 12, 1, 6);

SELECT '--- RG07.4 / RG07.5 / RG07.7 : note de 1 à 5, un avis par trajet, commentaire de 10 caractères' AS test;
INSERT INTO avis (note, commentaire, id_utilisateur, id_cible, id_trajet) VALUES (6, 'Note beaucoup trop haute', 7, 6, 11);
INSERT INTO avis (note, commentaire, id_utilisateur, id_cible, id_trajet) VALUES (4, 'Deuxième avis sur le même trajet', 3, 1, 6);
INSERT INTO avis (note, commentaire, id_utilisateur, id_cible, id_trajet) VALUES (4, 'Bof', 5, 1, 6);

SELECT '--- RG07.9 / RG07.10 : avis non modifiable, signalé seulement par la personne notée' AS test;
UPDATE avis SET note = 1 WHERE id_avis = 1;
UPDATE avis SET signale = 1, motif_signalement = 'Pas d''accord', id_signaleur = 3 WHERE id_avis = 3;

SELECT '--- RG07.11 : l''avis signalé restauré compte dans la note (ATTENDU : OK)' AS test;
UPDATE avis SET signale = 0 WHERE id_avis = 4;
SELECT note_moyenne, nb_avis FROM utilisateur WHERE id_utilisateur = 2;   -- ATTENDU : 3.0, 3

SELECT '--- RG08.2 : une seule demande conducteur en attente' AS test;
INSERT INTO demande_conducteur (marque, modele, immatriculation, nb_places, fichier_identite, fichier_permis, id_utilisateur)
VALUES ('Toyota', 'Aygo', 'CC-333-CC', 3, 'a.pdf', 'b.pdf', 5);

SELECT '--- RG08.3 : compte suspendu ou conducteur déjà vérifié' AS test;
INSERT INTO demande_conducteur (marque, modele, immatriculation, nb_places, fichier_identite, fichier_permis, id_utilisateur)
VALUES ('Toyota', 'Aygo', 'CC-333-CC', 3, 'a.pdf', 'b.pdf', 1);

SELECT '--- RG08.6 : un refus est motivé' AS test;
UPDATE demande_conducteur SET statut = 'refusee', id_admin = 1 WHERE id_demande = 4;

SELECT '--- RG08.9 : une décision ne change plus' AS test;
UPDATE demande_conducteur SET statut = 'acceptee' WHERE id_demande = 7;

SELECT '--- RG08.10 : pas de passage conducteur sans vérification' AS test;
UPDATE utilisateur SET role = 'conducteur' WHERE id_utilisateur = 5;

SELECT '--- RG09.1 : messagerie seulement entre passager et conducteur liés' AS test;
INSERT INTO message (contenu, id_expediteur, id_destinataire) VALUES ('Bonjour !', 12, 1);

SELECT '--- RG09.3 / RG09.5 : message non modifiable, compte suspendu muet' AS test;
UPDATE message SET contenu = 'modifié' WHERE id_message = 1;
INSERT INTO message (contenu, id_expediteur, id_destinataire) VALUES ('Bonjour', 8, 3);

SELECT '--- RG10.1 / RG10.3 : litige par une partie, un seul en cours' AS test;
INSERT INTO litige (motif, id_reservation, id_demandeur) VALUES ('Je n''étais pas là', 1, 12);
INSERT INTO litige (motif, id_reservation, id_demandeur) VALUES ('Encore', 12, 3);

SELECT '--- RG10.4 : un litige résolu ne se rouvre pas' AS test;
UPDATE litige SET statut = 'ouvert' WHERE id_litige = 2;

SELECT '--- RG11.1 / RG11.4 : alerte cohérente, favori = un conducteur' AS test;
INSERT INTO alerte (lieu_depart, lieu_arrivee, heure_min, heure_max, id_utilisateur) VALUES ('Sada', 'Mamoudzou', '09:00', '07:00', 3);
INSERT INTO favori (id_utilisateur, id_conducteur) VALUES (3, 5);

SELECT '--- RG12.1 : commission de 0 à 30 %' AS test;
UPDATE parametre SET valeur = '0.5' WHERE cle = 'taux_commission';

SELECT '--- RG05.11 / RG04.16 : procédure de clôture (ATTENDU : OK)' AS test;
CALL cloturer_trajets_passes();
SELECT COUNT(*) AS trajets_passes_encore_ouverts FROM trajet
 WHERE statut IN ('ouvert','complet') AND TIMESTAMP(date_trajet, heure_depart) <= NOW() - INTERVAL 2 HOUR;   -- ATTENDU : 0

ROLLBACK;
SELECT 'Tests terminés : toutes les modifications ont été annulées (ROLLBACK).' AS fin;
