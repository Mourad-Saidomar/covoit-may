<template>
  <footer id="main-footer" class="bg-cm-dark text-white pt-5 pb-4 mt-5">
    <div class="container">
      <div class="row g-4">
        <div class="col-lg-4">
          <h5 class="brand-logo text-white">
            <img src="/favicon.ico" alt="Logo Covoit'May" class="img-fluid" />
            Covoit'<span class="accent">May</span>
          </h5>
          <p class="text-white-50 small mb-2">
            La plateforme de covoiturage pensée pour Mayotte : trajets courts et récurrents,
            entre voisins, en toute confiance.
          </p>
          <p class="text-white-50 small">
            <i class="bi bi-geo-alt me-1"></i>Mamoudzou, Mayotte (976)
          </p>
        </div>
        <div class="col-6 col-lg-2">
          <h6 class="text-uppercase small fw-bold mb-3">Navigation</h6>
          <ul class="list-unstyled small">
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" to="/">Accueil</router-link></li>
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" to="/recherche">Rechercher</router-link></li>
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" to="/inscription">Devenir conducteur</router-link></li>
          </ul>
        </div>
        <div class="col-6 col-lg-3">
          <h6 class="text-uppercase small fw-bold mb-3">Informations</h6>
          <ul class="list-unstyled small">
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" :to="{ name: 'about' }">À propos de Covoit'May</router-link></li>
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" :to="{ name: 'terms' }">Conditions générales (CGU)</router-link></li>
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" :to="{ name: 'privacy' }">Politique de confidentialité (RGPD)</router-link></li>
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" :to="{ name: 'legal' }">Cadre légal du covoiturage</router-link></li>
            <li class="mb-2"><router-link class="text-white-50 text-decoration-none" :to="{ name: 'contact' }"><i class="bi bi-envelope me-1"></i>Nous contacter</router-link></li>
          </ul>
        </div>
        <div class="col-lg-3">
          <h6 class="text-uppercase small fw-bold mb-3">Paiement en démonstration</h6>
          <p class="text-white-50 small">
            <i class="bi bi-info-circle me-1"></i>Aucune transaction réelle n'est effectuée.<br />
            <i class="bi bi-credit-card me-1"></i>Le paiement affiché est une simulation d'interface.
          </p>
        </div>
      </div>
      <hr class="border-secondary" />
      <p class="text-center text-white-50 small mb-0">
        © {{ new Date().getFullYear() }} Covoit'May — Plateforme de covoiturage local à Mayotte.
        Démo — les paiements sont simulés.
      </p>
      <p class="text-center text-white-50 small mb-0 mt-1">
        Cartes : © les contributeurs OpenStreetMap (ODbL) et IGN (Licence Ouverte).
      </p>
    </div>
  </footer>
</template>
