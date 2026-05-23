import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { Home } from './components/Home'
import { RootLayout } from './components/RootLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Editor } from './pages/Editor'
import { Files } from './pages/Files'
import { Knowledge } from './pages/Knowledge'
import { useAuthStore } from './store/authStore'

export const rootRoute = createRootRoute({
  component: RootLayout,
})

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
})

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: Register,
})

export const filesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/files',
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: Files,
})

export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/$docId',
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: Editor,
})

export const knowledgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/knowledge',
  beforeLoad: () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: Knowledge,
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  filesRoute,
  editorRoute,
  knowledgeRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}