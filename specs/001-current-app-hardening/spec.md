# Feature Specification: Consolidation de Covoit'May

**Feature Branch**: `001-current-app-hardening`

**Created**: 2026-09-21

**Status**: Draft

**Input**: Analyse et amélioration ciblée de l'application Covoit'May existante, sans la recréer ni
changer son architecture sans nécessité.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Réserver sans incohérence (Priority: P1)

En tant que passager, je peux demander une réservation sur un trajet disponible et recevoir un état
cohérent, sans pouvoir réserver mon propre trajet, réserver plus de places que disponibles, ni provoquer
une réservation contradictoire.

**Why this priority**: La réservation est le parcours essentiel de la plateforme et sa cohérence fonde la
confiance dans toute la démonstration.

**Independent Test**: Avec un compte passager et un trajet ouvert, demander une place, puis vérifier que
le conducteur peut accepter une seule fois dans la limite des places et que les tentatives invalides sont
refusées avec un retour clair.

**Acceptance Scenarios**:

1. **Given** un passager connecté et un trajet ouvert d'un autre conducteur, **When** il confirme une
   demande dans la limite des places disponibles, **Then** une seule demande en attente est créée.
2. **Given** une demande déjà traitée ou un trajet sans capacité suffisante, **When** une transition de
   réservation est tentée, **Then** l'état et le nombre de places restent inchangés.
3. **Given** le conducteur du trajet, **When** il consulte son propre trajet, **Then** l'action de
   réservation ne lui est pas proposée.

---

### User Story 2 - Publier conformément au statut conducteur (Priority: P2)

En tant que conducteur dont la vérification est en attente, je peux préparer un trajet, mais il ne devient
pas consultable par les passagers avant la validation de mon profil.

**Why this priority**: Le texte existant promet cette règle ; le comportement doit correspondre à cette
promesse sans supprimer le formulaire déjà présent.

**Independent Test**: Avec un conducteur non vérifié, publier un trajet puis vérifier qu'il reste en
attente ; après validation par l'administrateur, vérifier qu'il devient accessible.

**Acceptance Scenarios**:

1. **Given** un conducteur non vérifié, **When** il publie un trajet valide, **Then** le trajet est créé
   avec un état d'attente non visible dans la recherche publique.
2. **Given** un administrateur qui valide ce conducteur, **When** la validation est appliquée, **Then** ses
   trajets en attente deviennent ouverts et consultables.

---

### User Story 3 - Utiliser les parcours de démonstration de façon accessible (Priority: P3)

En tant qu'utilisateur sur mobile ou au clavier, je peux comprendre qu'il s'agit d'une démonstration,
interagir avec les contrôles critiques et fermer les fenêtres de manière prévisible.

**Why this priority**: L'application contient déjà un design responsive ; cette amélioration corrige les
obstacles évidents sans modifier son identité visuelle.

**Independent Test**: Ouvrir le formulaire d'avis au clavier, constater son rôle et son intitulé, le fermer
avec Échap, puis vérifier sur un petit écran que les actions essentielles restent visibles.

**Acceptance Scenarios**:

1. **Given** le formulaire d'avis ouvert, **When** l'utilisateur appuie sur Échap ou utilise le bouton de
   fermeture, **Then** la fenêtre se ferme et le contrôle d'ouverture conserve le focus.
2. **Given** une action simulée de paiement ou d'authentification, **When** elle est affichée, **Then** le
   texte ne laisse pas entendre qu'un service réel a traité une transaction ou sécurisé des données.

### Edge Cases

- Un identifiant de trajet ou de profil inexistant affiche une issue de repli plutôt qu'une erreur de page.
- Une session de démonstration stockée mais invalide est traitée comme déconnectée.
- La disponibilité d'un trajet ne devient jamais négative, y compris si une action est répétée.
- Les modifications métier de démonstration sont perdues au rechargement ; cette limite reste explicitement
  communiquée et n'est pas présentée comme une persistance réelle.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST conserver les écrans, routes et rôles existants pour les visiteurs,
  passagers, conducteurs et administrateurs.
- **FR-002**: Le système MUST empêcher la création ou l'acceptation d'une réservation qui dépasse les
  places disponibles, concerne le conducteur du trajet, ou duplique une réservation active du même
  passager pour le même trajet.
- **FR-003**: Le système MUST appliquer les transitions de réservation uniquement depuis l'état en attente
  et laisser les données inchangées lorsqu'une transition est invalide.
- **FR-004**: Le système MUST créer les trajets d'un conducteur non vérifié dans un état d'attente invisible
  pour la recherche publique, puis les ouvrir à la validation de ce conducteur.
- **FR-005**: Le système MUST présenter des retours utilisateur clairs lorsqu'une action de réservation ou
  de publication ne peut pas être réalisée.
- **FR-006**: Le système MUST permettre la fermeture accessible de la fenêtre d'avis et fournir les
  informations sémantiques nécessaires à son usage au clavier.
- **FR-007**: Le système MUST décrire les données, paiements, vérifications et authentification simulés
  comme des éléments de démonstration et ne pas les faire passer pour des services réels.

### Key Entities

- **Utilisateur**: personne ayant un rôle passager, conducteur ou administrateur, un statut de compte et,
  pour les conducteurs, un état de vérification.
- **Trajet**: proposition de covoiturage rattachée à un conducteur, avec itinéraire, horaire, capacité,
  prix et état de visibilité.
- **Réservation**: demande d'un passager pour un trajet, avec nombre de places, montant et état.
- **Avis**: évaluation laissée après un trajet éligible, rattachée à son auteur et à sa cible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sur les scénarios de réservation vérifiés, 100 % des transitions invalides conservent le
  nombre de places et l'état de réservation précédents.
- **SC-002**: Un conducteur non vérifié ne voit aucun de ses nouveaux trajets apparaître dans la recherche
  publique avant sa validation ; après validation, 100 % de ses trajets en attente deviennent consultables.
- **SC-003**: Les trois parcours critiques — recherche, demande de réservation et publication — restent
  réalisables sur une largeur de 320 pixels sans action essentielle masquée.
- **SC-004**: Le build de production termine sans erreur après les améliorations.

## Assumptions

- Le périmètre reste une démonstration front-end avec données en mémoire ; un backend, une base de données,
  une authentification sécurisée et un paiement réel sont hors périmètre.
- Les rôles, noms de routes, données de démonstration, composants et identité visuelle déjà présents sont la
  référence à préserver.
- L'administrateur existant est l'autorité qui valide les conducteurs dans cette démonstration.
- Aucun nouveau framework de tests n'est introduit uniquement pour ces corrections ciblées ; les scénarios
  reproductibles et le build constituent la validation proportionnée.
