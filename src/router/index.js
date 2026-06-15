import {createRouter, createWebHashHistory } from 'vue-router'
import HeroView from '../views/hero.vue/index.js'
import HeaderView from '../views/header.vue/index.js'
import FooterView from '../views/footer.vue/index.js'


const routes = [
    {
        path: '/',
        name: 'home',
        component: HeroView
    },

    {
        path: '/about',
        name: 'about',
        component: HeaderView
    },

    {
        path: '/contact',
        name: 'contact',
        component: FooterView
    }

]




const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router