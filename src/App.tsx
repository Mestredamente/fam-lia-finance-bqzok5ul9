import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
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
import { usePermissions } from '@/hooks/use-permissions'
const ProjectionsLazy = lazy(() => import('@/pages/Projections'))
const MemberSettingsLazy = lazy(() => import('@/pages/MemberSettings'))
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
const Categories = lazy(() => import('@/pages/Categories'))
const Budgets = lazy(() => import('@/pages/Budgets'))
const MonthlyEvolution = lazy(() => import('@/pages/MonthlyEvolution'))
const Challenges = lazy(() => import('@/pages/Challenges'))
const Casa = lazy(() => import('@/pages/Casa'))
const DiagnosticInvoice = lazy(() => import('@/pages/DiagnosticInvoice'))

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

function PageTransitionWrapper() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-transition">
      <Outlet />
    </div>
  )
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

function PermissionRoute({
  children,
  check,
}: {
  children: React.ReactNode
  check: (perms: ReturnType<typeof usePermissions>) => boolean
}) {
  const { loading } = useAuth()
  const perms = usePermissions()
  if (loading) return <LoadingScreen />
  if (!check(perms) && !perms.isGuardian()) {
    return <Navigate to="/dashboard" replace />
  }
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

  useEffect(() => {
    const count = parseInt(localStorage.getItem('ff_visit_count') || '0', 10) + 1
    localStorage.setItem('ff_visit_count', String(count))
  }, [])

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
                    <Route element={<PageTransitionWrapper />}>
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
                        element={
                          <ProtectedRoute>
                            <PermissionRoute check={(p) => p.canViewPatrimony()}>
                              {withSuspense(Patrimony)}
                            </PermissionRoute>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/membros"
                        element={
                          <ProtectedRoute>
                            <PermissionRoute check={(p) => p.canManageMembers()}>
                              {withSuspense(MemberSettingsLazy)}
                            </PermissionRoute>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/projections"
                        element={<ProtectedRoute>{withSuspense(ProjectionsLazy)}</ProtectedRoute>}
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
                        element={
                          <ProtectedRoute>{withSuspense(CategorizationRules)}</ProtectedRoute>
                        }
                      />
                      <Route
                        path="/categorias"
                        element={<ProtectedRoute>{withSuspense(Categories)}</ProtectedRoute>}
                      />
                      <Route
                        path="/orcamentos"
                        element={
                          <ProtectedRoute>
                            <PermissionRoute check={(p) => p.canViewBudgets()}>
                              {withSuspense(Budgets)}
                            </PermissionRoute>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/evolucao"
                        element={<ProtectedRoute>{withSuspense(MonthlyEvolution)}</ProtectedRoute>}
                      />
                      <Route
                        path="/challenges"
                        element={<ProtectedRoute>{withSuspense(Challenges)}</ProtectedRoute>}
                      />
                      <Route
                        path="/diagnostic-invoice"
                        element={<ProtectedRoute>{withSuspense(DiagnosticInvoice)}</ProtectedRoute>}
                      />
                    </Route>
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
