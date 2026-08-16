import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useExpenseNotifications } from '@/hooks/use-expense-notifications'
import { Header, BottomNav } from '@/components/Navigation'
import { Sidebar } from '@/components/Sidebar'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OnboardingTour } from '@/components/OnboardingTour'
import { PullToRefresh } from '@/components/PullToRefresh'

export default function Layout() {
  const { isAuthenticated, loading } = useAuth()
  useExpenseNotifications(isAuthenticated)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen max-w-full overflow-x-hidden bg-[#F9FAFB] dark:bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[480px] max-w-full">
          <Outlet />
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#F9FAFB] dark:bg-background flex flex-col lg:flex-row">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className="flex-1 p-3 md:p-6 lg:p-8 pb-24 lg:pb-8 max-w-[1200px] w-full max-w-full overflow-x-hidden mx-auto animate-fade-in outline-none theme-transition"
        >
          <PullToRefresh
            onRefresh={async () => {
              window.dispatchEvent(new CustomEvent('ff-refresh'))
              await new Promise((r) => setTimeout(r, 800))
            }}
          >
            <Outlet />
          </PullToRefresh>
        </main>
      </div>
      <BottomNav />
      <OnboardingTour />
    </div>
  )
}
