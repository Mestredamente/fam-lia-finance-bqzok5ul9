import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Header, Sidebar, BottomNav } from '@/components/Navigation'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OnboardingTour } from '@/components/OnboardingTour'
import { PullToRefresh } from '@/components/PullToRefresh'

export default function Layout() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

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
        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className="flex-1 p-4 md:p-6 lg:p-8 pb-20 lg:pb-8 max-w-[1200px] w-full mx-auto animate-fade-in outline-none theme-transition"
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
