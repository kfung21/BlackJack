import { createRouter, createWebHistory } from 'vue-router'
import GameView from '../views/GameView.vue'
import SettingsView from '../views/SettingsView.vue'
import StatsView from '../views/StatsView.vue'
import ProfileView from '../views/ProfileView.vue'

const routes = [
  {
    path: '/',
    name: 'Game',
    component: GameView
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
  },
  {
    path: '/stats',
    name: 'Stats',
    component: StatsView
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router