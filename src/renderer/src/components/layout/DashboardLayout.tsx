import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { StatusBar } from './StatusBar'

export default function DashboardLayout(): React.JSX.Element {
  return (
    <div className="app-shell flex h-screen overflow-hidden bg-transparent">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.03] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-accent/6 blur-[110px]" />
        <main className="relative min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <StatusBar />
      </div>
    </div>
  )
}
