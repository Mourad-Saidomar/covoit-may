// ============================================================
// Contenu des pages d'information (pied de page)
// ------------------------------------------------------------
// Rédigé à partir du cahier des charges du projet
// (infos_projet/Covoit-May-Cahier-des-Charges-v2.docx).
// Chaque page : un titre, une introduction et des sections.
// Une section contient des paragraphes et/ou une liste.
// La page InfoView.vue affiche la page demandée par la route.
//
// Les textes juridiques sont des textes de démonstration :
// ils devront être relus par un juriste avant une vraie mise
// en ligne.
// ============================================================

export const PAGES_INFO = {
  'a-propos': {
    titre: "À propos de Covoit'May",
    intro:
      "Covoit'May met en relation les habitants de Mayotte qui font les mêmes trajets au quotidien : pour aller au travail, au marché ou à l'école.",
    juridique: false,
    sections: [
      {
        id: 'contexte',
        titre: 'Pourquoi un covoiturage pensé pour Mayotte',
        paragraphes: [
          "Mayotte dispose d'un réseau de transport en commun limité et d'un fort tissu social de proximité. Les trajets y sont courts et reviennent chaque jour : domicile-travail, marché, écoles.",
          "Les plateformes existantes sont pensées pour les longs trajets en métropole. Covoit'May part des trajets de l'île : des communes comme Combani, Sada ou Pamandzi vers Mamoudzou et Kawéni, et l'inverse."
        ]
      },
      {
        id: 'probleme',
        titre: 'Ce qui freine le covoiturage aujourd’hui',
        liste: [
          'Il est difficile de trouver quelqu’un qui fait exactement le même trajet.',
          'Le manque de confiance envers des inconnus freine l’usage du covoiturage.',
          'On ne sait pas si un conducteur est ponctuel et fiable.',
          'Se mettre d’accord sur les horaires reste compliqué.',
          'Le transport coûte cher faute d’alternatives locales.',
          'Les conducteurs occasionnels manquent de visibilité.'
        ]
      },
      {
        id: 'reponse',
        titre: 'Ce que propose Covoit’May',
        liste: [
          'Une recherche par départ, arrivée et date, avec les communes de Mayotte.',
          'Des profils vérifiés : l’équipe contrôle l’identité de chaque conducteur.',
          'Des avis après chaque trajet, pour savoir avec qui vous voyagez.',
          'Une messagerie pour se coordonner avant le départ.',
          'Une réservation et un paiement en ligne, sans avance d’argent de la main à la main.'
        ]
      },
      {
        id: 'pour-qui',
        titre: 'Pour qui',
        liste: [
          'Les visiteurs : ils consultent les trajets et les profils des conducteurs, puis créent un compte.',
          'Les passagers : ils réservent une place, paient en ligne, échangent avec le conducteur et laissent un avis.',
          'Les conducteurs : ils publient leurs trajets, acceptent les demandes et partagent leurs frais. Un conducteur peut aussi voyager comme passager.',
          'L’équipe d’administration : elle vérifie les identités, modère les avis et arbitre les litiges.'
        ]
      },
      {
        id: 'benefices',
        titre: 'Ce que l’on y gagne',
        liste: [
          'Des trajets moins chers, pour les passagers comme pour les conducteurs.',
          'Moins de voitures sur les routes de l’île, et moins d’embouteillages à Kawéni.',
          'Plus de lien entre voisins d’un même quartier ou d’un même village.',
          'Des prix transparents sur chaque trajet.',
          'Du temps gagné pour organiser les trajets du quotidien.'
        ]
      },
      {
        id: 'projet',
        titre: 'Le projet',
        paragraphes: [
          "Covoit'May est un projet fil rouge réalisé par Mourad SAIDOMAR dans le cadre du titre professionnel Développeur web et web mobile (DWWM). Cette version est une démonstration : les paiements sont simulés et aucune transaction réelle n'est effectuée."
        ]
      }
    ]
  },

  'conditions-generales': {
    titre: "Conditions générales d'utilisation",
    intro:
      "Ces conditions expliquent comment utiliser Covoit'May : créer un compte, publier ou réserver un trajet, payer, laisser un avis.",
    juridique: true,
    sections: [
      {
        id: 'objet',
        titre: 'Objet du service',
        paragraphes: [
          "Covoit'May met en relation des conducteurs et des passagers pour partager un trajet et ses frais à Mayotte. Covoit'May n'est pas un transporteur : le trajet est organisé par le conducteur, pour son propre déplacement."
        ]
      },
      {
        id: 'compte',
        titre: 'Votre compte',
        liste: [
          'L’inscription se fait comme passager ou comme conducteur, avec vos nom, prénom, email, téléphone et commune.',
          'Une adresse email ne peut servir qu’à un seul compte.',
          'Le mot de passe comporte au moins 8 caractères. Vous êtes responsable de sa confidentialité.',
          'Vous vous engagez à donner des informations exactes et à les tenir à jour depuis « Mon profil ».',
          'Vous pouvez supprimer votre compte à tout moment depuis « Mon profil ».'
        ]
      },
      {
        id: 'conducteur',
        titre: 'Devenir conducteur',
        liste: [
          'Pour publier des trajets, le conducteur envoie une pièce d’identité et son permis de conduire (PDF, JPG ou PNG, 5 Mo au maximum).',
          'L’équipe vérifie ces documents. Tant que l’identité n’est pas validée, les trajets ne sont pas visibles des passagers.',
          'Un passager peut demander à devenir conducteur depuis « Mon profil ». Il garde ses réservations pendant et après la vérification.',
          'Un conducteur peut aussi réserver des places comme passager.'
        ]
      },
      {
        id: 'publier',
        titre: 'Publier un trajet',
        liste: [
          'Le trajet est rattaché au conducteur et à son véhicule.',
          'Le nombre de places proposées ne dépasse pas la capacité du véhicule.',
          'La date du trajet est dans le futur, et le départ est différent de l’arrivée.',
          'Le prix par place est supérieur à zéro et correspond à un partage de frais (voir la page « Cadre légal »).'
        ]
      },
      {
        id: 'reserver',
        titre: 'Réserver et payer',
        liste: [
          'Vous choisissez un nombre de places, dans la limite des places disponibles.',
          'Vous ne pouvez pas réserver votre propre trajet, ni avoir deux réservations actives sur le même trajet.',
          'Le paiement se fait en ligne, par carte ou par mobile money, par l’intermédiaire d’un prestataire de paiement sécurisé.',
          'La réservation reste « en attente » jusqu’à ce que le conducteur l’accepte. Les places disponibles diminuent à ce moment-là.',
          'Covoit’May retient une commission sur chaque réservation payée. Son montant est affiché avant le paiement.'
        ]
      },
      {
        id: 'annuler',
        titre: 'Annuler',
        liste: [
          'Le passager peut annuler une réservation à venir, en attente ou confirmée, depuis « Mes réservations ».',
          'Le conducteur peut annuler un trajet ouvert depuis « Mes trajets » : toutes les réservations liées sont alors annulées.'
        ]
      },
      {
        id: 'avis',
        titre: 'Avis',
        liste: [
          'Un avis est possible seulement après le trajet, si votre réservation a été confirmée.',
          'L’avis comprend une note de 1 à 5 et un commentaire. Un seul avis par trajet.',
          'Les avis signalés sont masqués puis vérifiés par l’équipe, qui peut les restaurer ou les supprimer.'
        ]
      },
      {
        id: 'litiges',
        titre: 'Litiges et sanctions',
        paragraphes: [
          "En cas de désaccord entre un passager et un conducteur, l'équipe examine le litige et prend une décision (remboursement, avertissement…).",
          "Un compte qui ne respecte pas ces conditions peut être suspendu ou supprimé. La personne est alors déconnectée et ne peut plus se connecter."
        ]
      }
    ]
  },

  confidentialite: {
    titre: 'Politique de confidentialité',
    intro:
      "Quelles données Covoit'May utilise, pourquoi, combien de temps, et comment exercer vos droits. Mayotte étant un département français, le Règlement général sur la protection des données (RGPD) s'applique.",
    juridique: true,
    sections: [
      {
        id: 'donnees',
        titre: 'Les données utilisées',
        liste: [
          'Votre compte : nom, prénom, email, téléphone, commune, mot de passe (enregistré chiffré), présentation.',
          'Pour les conducteurs : le véhicule, la pièce d’identité et le permis de conduire.',
          'Votre activité : trajets publiés, réservations, messages échangés, avis donnés et reçus.',
          'Les paiements : montant, date et statut. Les numéros de carte sont traités par le prestataire de paiement et ne sont jamais enregistrés par Covoit’May.'
        ]
      },
      {
        id: 'pourquoi',
        titre: 'Pourquoi',
        liste: [
          'Faire fonctionner le service : vous connecter, publier et réserver des trajets, payer, échanger.',
          'Vérifier l’identité des conducteurs, pour la sécurité des passagers.',
          'Modérer les avis et traiter les litiges.',
          'Produire des statistiques d’usage anonymes pour améliorer le service.'
        ]
      },
      {
        id: 'partage',
        titre: 'Qui voit vos données',
        liste: [
          'Les autres membres voient votre profil public : prénom, initiale du nom, commune, véhicule, ancienneté, note et avis.',
          'Votre numéro de téléphone et votre email ne sont pas affichés publiquement.',
          'Seule l’équipe d’administration consulte les pièces justificatives.',
          'Aucune donnée n’est vendue.'
        ]
      },
      {
        id: 'duree',
        titre: 'Combien de temps',
        paragraphes: [
          "Les données du compte sont conservées tant que le compte existe. Les pièces justificatives ne servent qu'à la vérification d'identité et ne sont pas gardées plus longtemps que nécessaire."
        ]
      },
      {
        id: 'droits',
        titre: 'Vos droits',
        liste: [
          'Accès et rectification : vos informations sont consultables et modifiables dans « Mon profil ».',
          'Effacement : le bouton « Supprimer mon compte » de « Mon profil » supprime votre compte définitivement.',
          'Opposition, limitation et portabilité : écrivez à l’équipe à l’adresse admin@covoitmay.yt.',
          'Réclamation : vous pouvez saisir la CNIL (www.cnil.fr).'
        ]
      }
    ]
  },

  'cadre-legal': {
    titre: 'Cadre légal du covoiturage',
    intro:
      "Covoit'May reste dans le cadre du covoiturage : un partage de frais entre particuliers, et non un service de transport payant.",
    juridique: true,
    sections: [
      {
        id: 'definition',
        titre: 'Ce qu’est le covoiturage',
        paragraphes: [
          "Le Code des transports (article L3132-1) définit le covoiturage comme l'utilisation en commun d'un véhicule par un conducteur et un ou plusieurs passagers, à titre non onéreux, excepté le partage des frais, dans le cadre d'un déplacement que le conducteur effectue pour son propre compte."
        ]
      },
      {
        id: 'partage-frais',
        titre: 'Un partage de frais, pas un bénéfice',
        liste: [
          'Le conducteur fait le trajet pour lui-même : il ne se déplace pas uniquement pour transporter des passagers.',
          'Le prix demandé couvre une part des frais du trajet (carburant, usure du véhicule…). Le conducteur ne doit pas en tirer de bénéfice.',
          'C’est pourquoi Covoit’May limite le prix d’une place : entre 1 € et 10 € dans cette version, ce qui correspond aux distances de l’île.'
        ]
      },
      {
        id: 'risques',
        titre: 'Si ce cadre n’est pas respecté',
        paragraphes: [
          "Un conducteur qui transporte des passagers pour gagner de l'argent exerce une activité de transport de personnes, soumise à d'autres règles (statut professionnel, autorisations, assurance spécifique). L'activité pourrait alors être requalifiée."
        ]
      },
      {
        id: 'impots-assurance',
        titre: 'Impôts et assurance',
        liste: [
          'Selon l’administration fiscale, les sommes reçues dans le cadre d’un vrai partage de frais ne sont pas des revenus imposables.',
          'L’assurance automobile obligatoire du conducteur couvre en principe les passagers transportés. Il est conseillé de vérifier son contrat.'
        ]
      }
    ]
  }
}
