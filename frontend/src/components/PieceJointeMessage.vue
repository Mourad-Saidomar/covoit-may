<!-- ============================================================
  Composant PieceJointeMessage : la photo ou le message vocal
  d'un message (RG09.6, RG09.7).
  Le fichier est protégé : seuls les deux participants de la
  conversation peuvent le lire (RG09.4). Il est donc chargé avec
  le jeton de connexion (lireFichier), puis affiché à partir d'une
  adresse locale « blob: » créée par le navigateur.
  Le lecteur de vocal ressemble à celui de WhatsApp :
  - lecture / pause, forme d'onde qui se colore pendant l'écoute ;
  - on se déplace dans le vocal en cliquant ou en glissant sur l'onde
    (ou au clavier : flèches) ;
  - vitesse 1×, 1,5× ou 2× ;
  - lancer un vocal met en pause celui qui jouait.
  Utilisation : <PieceJointeMessage :message="m" @agrandir="…" @charge="…" />
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
    <img :src="url" alt="Photo envoyée dans la conversation" class="chat-photo" @load="$emit('charge')" />
  </button>

  <!-- Message vocal -->
  <div v-else class="chat-vocal">
    <button type="button" class="chat-vocal-lecture" :aria-label="enLecture ? 'Mettre en pause' : 'Écouter le message vocal'"
      @click="basculerLecture">
      <i class="bi" :class="enLecture ? 'bi-pause-fill' : 'bi-play-fill'"></i>
    </button>
    <div class="chat-vocal-corps">
      <!-- La forme d'onde ; le curseur invisible par-dessus permet de se déplacer -->
      <div class="chat-vocal-onde">
        <span v-for="(hauteur, i) in barres" :key="i" class="chat-vocal-barre"
          :class="{ jouee: (i + 0.5) / barres.length <= avancement }" :style="{ height: hauteur + '%' }"></span>
        <input type="range" class="chat-vocal-curseur" min="0" :max="duree" step="0.1" :value="tempsLu"
          aria-label="Position dans le message vocal" :aria-valuetext="minutesSecondes(tempsLu) + ' sur ' + minutesSecondes(duree)"
          @input="chercher" />
      </div>
      <div class="chat-vocal-infos">
        <span class="chat-vocal-duree">{{ dureeAffichee }}</span>
        <button type="button" class="chat-vocal-vitesse" :aria-label="'Vitesse de lecture : ' + vitesseAffichee + '. Changer'"
          @click="changerVitesse">{{ vitesseAffichee }}</button>
      </div>
    </div>
    <audio ref="audio" :src="url" preload="auto" @timeupdate="suivre" @ended="finLecture" @pause="enLecture = false"
      @play="enLecture = true"></audio>
  </div>
</template>

<script>
import { lireFichier } from '../services/api'
import { messageErreur } from '../utils/format'

const VITESSES = [1, 1.5, 2]
const NB_BARRES = 30

// Un seul vocal joue à la fois, comme sur WhatsApp
let audioEnCours = null

// Hauteurs « au hasard », mais toujours les mêmes pour un même message
function formeOnde(graine) {
  let x = graine * 9301 + 49297
  return Array.from({ length: NB_BARRES }, (_, i) => {
    x = (x * 9301 + 49297) % 233280
    const enveloppe = 0.55 + 0.45 * Math.sin((Math.PI * (i + 1)) / (NB_BARRES + 1))
    return Math.round(18 + 82 * enveloppe * (0.35 + 0.65 * (x / 233280)))
  })
}

export default {
  name: 'PieceJointeMessage',

  props: {
    // Le message : { id, type: 'image' | 'vocal', fichier, dureeSecondes }
    message: { type: Object, required: true }
  },

  emits: ['agrandir', 'charge'],

  data() {
    return {
      url: null,
      erreur: '',
      enLecture: false,
      tempsLu: 0,
      indexVitesse: 0
    }
  },

  computed: {
    duree() {
      return this.message.dureeSecondes || 0
    },
    avancement() {
      return this.duree ? Math.min(1, this.tempsLu / this.duree) : 0
    },
    barres() {
      return formeOnde(this.message.id || 1)
    },
    // Pendant la lecture (ou en pause au milieu) : le temps écoulé ; sinon la durée
    dureeAffichee() {
      return this.minutesSecondes(this.enLecture || this.tempsLu > 0 ? this.tempsLu : this.duree)
    },
    vitesseAffichee() {
      return String(VITESSES[this.indexVitesse]).replace('.', ',') + '×'
    }
  },

  async mounted() {
    try {
      const { fichier } = await lireFichier(this.message.fichier)
      this.url = URL.createObjectURL(fichier)
      if (this.message.type === 'vocal') this.$nextTick(() => this.$emit('charge'))
    } catch (erreur) {
      this.erreur = messageErreur(erreur)
    }
  },

  beforeUnmount() {
    const audio = this.$refs.audio
    if (audio && audioEnCours === audio) audioEnCours = null
    if (this.url) URL.revokeObjectURL(this.url)
  },

  methods: {
    // 75 -> « 1:15 »
    minutesSecondes(secondes) {
      const s = Math.max(0, Math.round(secondes))
      return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
    },

    basculerLecture() {
      const audio = this.$refs.audio
      if (!audio) return
      if (audio.paused) {
        if (audioEnCours && audioEnCours !== audio) audioEnCours.pause()
        audioEnCours = audio
        audio.playbackRate = VITESSES[this.indexVitesse]
        // Fin atteinte : on repart du début
        if (this.tempsLu >= this.duree - 0.2) audio.currentTime = 0
        audio.play().catch(() => {
          this.erreur = 'Lecture impossible sur ce navigateur.'
        })
      } else {
        audio.pause()
      }
    },

    // Glisser ou cliquer sur l'onde : on se place à cet endroit
    chercher(evenement) {
      const position = Number(evenement.target.value)
      this.tempsLu = position
      const audio = this.$refs.audio
      if (audio) audio.currentTime = position
    },

    changerVitesse() {
      this.indexVitesse = (this.indexVitesse + 1) % VITESSES.length
      if (this.$refs.audio) this.$refs.audio.playbackRate = VITESSES[this.indexVitesse]
    },

    suivre() {
      const audio = this.$refs.audio
      if (audio) this.tempsLu = Math.min(audio.currentTime, this.duree || audio.currentTime)
    },

    finLecture() {
      this.enLecture = false
      this.tempsLu = 0
      if (this.$refs.audio) this.$refs.audio.currentTime = 0
    }
  }
}
</script>
