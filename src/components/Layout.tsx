import { useState, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useExpenseNotifications } from '@/hooks/use-expense-notifications'
import { useBillNotifications } from '@/hooks/use-bill-notifications'
import { Header, BottomNav } from '@/components/Navigation'
import { Sidebar } from '@/components/Sidebar'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OnboardingTour } from '@/components/OnboardingTour'
import { PullToRefresh } from '@/components/PullToRefresh'

/**
 * The mobile central FAB (in BottomNav) opens the same expanding FAB menu the
 * Dashboard renders. Rather than coupling BottomNav to Dashboard internals,
 * we broadcast a window event that the Dashboard listens for — so the FAB in
 * the bottom nav and the (desktop-only) standalone FAB share one menu.
 */
const FAB_OPEN_EVENT = 'ff-open-fab-menu'

export default function Layout() {
  const { isAuthenticated, loading } = useAuth()
  useExpenseNotifications(isAuthenticated)
  useBillNotifications(isAuthenticated)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleFabClick = useCallback(() => {
    if (location.pathname.startsWith('/dashboard')) {
      window.dispatchEvent(new CustomEvent(FAB_OPEN_EVENT))
    } else {
      // On non-dashboard pages the central FAB takes the user to the dashboard
      // and opens the transaction form there.
      navigate('/dashboard')
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ff-open-transaction-form'))
      }, 300)
    }
  }, [location.pathname, navigate])

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
      <BottomNav onFabClick={handleFabClick} />
      <OnboardingTour />
    </div>
  )
}
