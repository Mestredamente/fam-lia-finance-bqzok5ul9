import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { ThemeProvider } from '@/hooks/use-theme'
import { AnnouncerProvider } from '@/hooks/use-announcer'
import { OfflineQueueProvider } from '@/hooks/use-offline-queue'
import { useSwUpdate } from '@/hooks/use-sw-update'
import { useNotifications } from '@/hooks/use-notifications'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallPrompt } from '@/components/InstallPrompt'
import { LoadingScreen } from '@/components/LoadingScreen'
import { SkipLink } from '@/components/SkipLink'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import Layout from '@/components/Layout'

const Login = lazy(() => import('@/pages/Login'))
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Profile = lazy(() => import('@/pages/Profile'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const Cards = lazy(() => import('@/pages/Cards'))
const CardDetail = lazy(() => import('@/pages/CardDetail'))
const InvoiceReview = lazy(() => import('@/pages/InvoiceReview'))
const Patrimony = lazy(() => import('@/pages/Patrimony'))
const Consultora = lazy(() => import('@/pages/Consultora'))
const FamilyManagement = lazy(() => import('@/pages/FamilyManagement'))
const CategorizationRules = lazy(() => import('@/pages/CategorizationRules'))
const Budgets = lazy(() => import('@/pages/Budgets'))
const MonthlyEvolution = lazy(() => import('@/pages/MonthlyEvolution'))
const Challenges = lazy(() => import('@/pages/Challenges'))
const Casa = lazy(() => import('@/pages/Casa'))

function NavigationGuard() {
  const location = useLocation()
  const { loading } = useAuth()
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (loading) return
    if (prevPath.current !== location.pathname) {
      prevPath.current = location.pathname
      if (pb.authStore.record && !pb.authStore.isValid) {
        pb.authStore.clear()
        toast({
          title: 'Sessão expirada',
          description: 'Sua sessão expirou. Faça login novamente.',
          variant: 'destructive',
        })
      }
    }
  }, [location.pathname, loading])

  return null
}

function HomeRedirect() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return withSuspense(Login)
}

function SmartCatchAll() {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />
}

function NotificationChecker() {
  useNotifications()
  return null
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasFamily, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (!hasFamily) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#10B981] rounded-full animate-spin" />
      <span className="sr-only">Carregando...</span>
    </div>
  )
}

const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
)

function AppInner() {
  useSwUpdate()
  return (
    <ThemeProvider>
      <AnnouncerProvider>
        <OfflineQueueProvider>
          <AuthProvider>
            <NotificationChecker />
            <BrowserRouter>
              <SkipLink />
              <OfflineBanner />
              <InstallPrompt />
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <NavigationGuard />
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<HomeRedirect />} />
                    <Route path="/onboarding" element={withSuspense(Onboarding)} />
                    <Route
                      path="/dashboard"
                      element={<ProtectedRoute>{withSuspense(Dashboard)}</ProtectedRoute>}
                    />
                    <Route
                      path="/profile"
                      element={<ProtectedRoute>{withSuspense(Profile)}</ProtectedRoute>}
                    />
                    <Route
                      path="/transacoes"
                      element={<ProtectedRoute>{withSuspense(Transactions)}</ProtectedRoute>}
                    />
                    <Route
                      path="/cards"
                      element={<ProtectedRoute>{withSuspense(Cards)}</ProtectedRoute>}
                    />
                    <Route
                      path="/cards/:cardId"
                      element={<ProtectedRoute>{withSuspense(CardDetail)}</ProtectedRoute>}
                    />
                    <Route
                      path="/cards/:cardId/invoices/:invoiceId/review"
                      element={<ProtectedRoute>{withSuspense(InvoiceReview)}</ProtectedRoute>}
                    />
                    <Route
                      path="/casa"
                      element={<ProtectedRoute>{withSuspense(Casa)}</ProtectedRoute>}
                    />
                    <Route
                      path="/patrimonio"
                      element={<ProtectedRoute>{withSuspense(Patrimony)}</ProtectedRoute>}
                    />
                    <Route
                      path="/consultora"
                      element={<ProtectedRoute>{withSuspense(Consultora)}</ProtectedRoute>}
                    />
                    <Route
                      path="/familia"
                      element={<ProtectedRoute>{withSuspense(FamilyManagement)}</ProtectedRoute>}
                    />
                    <Route
                      path="/regras-categorizacao"
                      element={<ProtectedRoute>{withSuspense(CategorizationRules)}</ProtectedRoute>}
                    />
                    <Route
                      path="/orcamentos"
                      element={<ProtectedRoute>{withSuspense(Budgets)}</ProtectedRoute>}
                    />
                    <Route
                      path="/evolucao"
                      element={<ProtectedRoute>{withSuspense(MonthlyEvolution)}</ProtectedRoute>}
                    />
                    <Route
                      path="/challenges"
                      element={<ProtectedRoute>{withSuspense(Challenges)}</ProtectedRoute>}
                    />
                  </Route>
                  <Route path="*" element={<SmartCatchAll />} />
                </Routes>
              </TooltipProvider>
            </BrowserRouter>
          </AuthProvider>
        </OfflineQueueProvider>
      </AnnouncerProvider>
    </ThemeProvider>
  )
}

const App = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
)

export default App
