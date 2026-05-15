import { Outlet } from '@tanstack/react-router'

export function RootLayout() {
  return (
    <div>
      <div>Root Layout</div>
      <Outlet />
    </div>
  )
}