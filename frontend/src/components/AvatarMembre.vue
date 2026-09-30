<!-- ============================================================
  Composant AvatarMembre : la photo de profil d'un membre, ou ses
  initiales dans un rond de couleur s'il n'en a pas (ou si l'image
  ne se charge pas).
  Utilisation : <AvatarMembre :personne="conducteur" taille="sm" />
  personne : { prenom, nom, photo } (photo = adresse renvoyée par l'API)
  taille : 'sm' (34 px), 'md' (44 px, par défaut), 'lg' (72 px), 'xl' (112 px)
============================================================ -->
<template>
  <span class="avatar" :class="'avatar-' + taille">
    <img
      v-if="source && !erreur"
      :src="source"
      :alt="texteAlternatif"
      class="avatar-photo"
      loading="lazy"
      decoding="async"
      @error="erreur = true"
    />
    <template v-else>{{ initiales }}</template>
  </span>
</template>

<script>
import { initials } from '../utils/format'
import { urlMedia } from '../services/api'

export default {
  name: 'AvatarMembre',

  props: {
    personne: { type: Object, default: null },
    taille: { type: String, default: 'md' }
  },

  data() {
    return { erreur: false }
  },

  computed: {
    source() {
      return this.personne && this.personne.photo ? urlMedia(this.personne.photo) : null
    },
    initiales() {
      return initials(this.personne)
    },
    texteAlternatif() {
      return this.personne ? 'Photo de ' + this.personne.prenom : ''
    }
  },

  watch: {
    // Nouvelle photo : on réessaie de l'afficher
    source() {
      this.erreur = false
    }
  }
}
</script>
