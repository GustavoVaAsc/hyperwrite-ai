# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Tanstack Router

This project uses [Tanstack Router](https://tanstack.com/router/latest) for routing.

### Overview

Routing is configured in `src/routes.ts` with components in `src/components/`.

### File Structure

```
src/
├── routes.ts           # Route tree definition
├── components/         # Page components
│   ├── RootLayout.tsx  # Layout with <Outlet /> for child routes
│   └── Home.tsx        # Home page component
└── main.tsx           # App entry with RouterProvider
```

### Adding Routes

1. **Create a component** in `src/components/`:
   ```tsx
   export function MyPage() {
     return <div>My Page</div>
   }
   ```

2. **Add the route** in `src/routes.ts`:
   ```typescript
   import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
   import { RootLayout } from './components/RootLayout'
   import { Home } from './components/Home'
   import { MyPage } from './components/MyPage'

   export const rootRoute = createRootRoute({
     component: RootLayout,
   })

   // Add child routes
   export const indexRoute = createRoute({
     getParentRoute: () => rootRoute,
     path: '/',
     component: Home,
   })

   export const myPageRoute = createRoute({
     getParentRoute: () => rootRoute,
     path: '/my-page',
     component: MyPage,
   })

   export const routeTree = rootRoute.addChildren([
     indexRoute,
     myPageRoute,
   ])

   export const router = createRouter({ routeTree })

   declare module '@tanstack/react-router' {
     interface Register {
       router: typeof router
     }
   }
   ```

3. **Navigate** using the `link` component or `navigate`:
   ```tsx
   import { Link, useNavigate } from '@tanstack/react-router'

   // Declarative navigation
   <Link to="/">Home</Link>

   // Programmatic navigation
   const navigate = useNavigate()
   navigate({ to: '/my-page' })
   ```

### Route Types

Tanstack Router provides full type safety. When calling `router.navigate({ to: '/my-page' })`, TypeScript will error if the route doesn't exist.

---

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
