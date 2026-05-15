import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import { Home } from './components/Home'
import { RootLayout } from './components/RootLayout'

export const rootRoute = createRootRoute({
  component: RootLayout,
})

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

export const routeTree = rootRoute.addChildren([indexRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}