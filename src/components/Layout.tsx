import { Outlet } from 'react-router-dom'
import { useMockAuth } from '@/hooks/use-mock-auth'
import { Header, Sidebar, BottomNav } from '@/components/Navigation'

export default function Layout() {
  const { isAuthenticated } = useMockAuth()

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[480px]">
          <Outlet />
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 lg:pb-8 max-w-[1200px] w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
