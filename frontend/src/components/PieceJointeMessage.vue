<!-- ============================================================
  Composant PieceJointeMessage : la photo ou le message vocal
  d'un message (RG09.6, RG09.7).
  Le fichier est protégé : seuls les deux participants de la
  conversation peuvent le lire (RG09.4). Il est donc chargé avec
  le jeton de connexion (lireFichier), puis affiché à partir d'une
  adresse locale « blob: » créée par le navigateur.
  Utilisation : <PieceJointeMessage :message="m" @agrandir="…" />
============================================================ -->
<template>
  <!-- Pendant le chargement -->
  <div v-if="!url && !erreur" :class="message.type === 'image' ? 'chat-photo-attente' : 'chat-vocal'">
    <span class="spinner-border spinner-border-sm" role="status">
      <span class="visually-hidden">Chargement…</span>
    </span>
  </div>

  <div v-else-if="erreur" class="small px-2 py-1">
    <i class="bi bi-exclamation-triangle me-1"></i>{{ erreur }}
  </div>

  <!-- Photo : un clic l'agrandit -->
  <button v-else-if="message.type === 'image'" type="button" class="chat-photo border-0 bg-transparent"
    aria-label="Agrandir la photo" @click="$emit('agrandir', url)">
    <img :src="url" alt="Photo envoyée dans la conversation" class="chat-photo" />
  </button>

  <!-- Message vocal : lecture / pause, avancement et durée -->
  <div v-else class="chat-vocal">
    <button type="button" class="chat-vocal-lecture" :aria-label="enLecture ? 'Mettre en pause' : 'Écouter le message vocal'"
      @click="basculerLecture">
      <i class="bi" :class="enLecture ? 'bi-pause-fill' : 'bi-play-fill'"></i>
    </button>
    <div class="chat-vocal-piste" aria-hidden="true">
      <div class="chat-vocal-avance" :style="{ width: avancement + '%' }"></div>
    </div>
    <span class="chat-vocal-duree">{{ dureeAffichee }}</span>
    <audio ref="audio" :src="url" preload="metadata" @timeupdate="suivre" @ended="finLecture"></audio>
  </div>
</template>

<script>
import { lireFichier } from '../services/api'
import { messageErreur } from '../utils/format'

// 75 -> « 1:15 »
function minutesSecondes(secondes) {
  const s = Math.max(0, Math.round(secondes))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}

export default {
  name: 'PieceJointeMessage',

  props: {
    // Le message : { type: 'image' | 'vocal', fichier, dureeSecondes }
    message: { type: Object, required: true }
  },

  emits: ['agrandir'],

  data() {
    return {
      url: null,
      erreur: '',
      enLecture: false,
      tempsLu: 0
    }
  },

  computed: {
    duree() {
      return this.message.dureeSecondes || 0
    },
    avancement() {
      return this.duree ? Math.min(100, (this.tempsLu / this.duree) * 100) : 0
    },
    // Pendant la lecture : le temps écoulé ; sinon : la durée totale
    dureeAffichee() {
      return minutesSecondes(this.enLecture || this.tempsLu > 0 ? this.tempsLu : this.duree)
    }
  },

  async mounted() {
    try {
      const { fichier } = await lireFichier(this.message.fichier)
      this.url = URL.createObjectURL(fichier)
    } catch (erreur) {
      this.erreur = messageErreur(erreur)
    }
  },

  beforeUnmount() {
    if (this.url) URL.revokeObjectURL(this.url)
  },

  methods: {
    basculerLecture() {
      const audio = this.$refs.audio
      if (!audio) return
      if (audio.paused) {
        audio.play().then(() => { this.enLecture = true }).catch(() => {
          this.erreur = 'Lecture impossible sur ce navigateur.'
        })
      } else {
        audio.pause()
        this.enLecture = false
      }
    },
    suivre() {
      this.tempsLu = this.$refs.audio ? this.$refs.audio.currentTime : 0
    },
    finLecture() {
      this.enLecture = false
      this.tempsLu = 0
    }
  }
}
</script>
