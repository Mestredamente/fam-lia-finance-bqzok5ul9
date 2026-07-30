import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { useSwUpdate } from '@/hooks/use-sw-update'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallPrompt } from '@/components/InstallPrompt'
import { LoadingScreen } from '@/components/LoadingScreen'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'
import Dashboard from '@/pages/Dashboard'
import Profile from '@/pages/Profile'
import Transactions from '@/pages/Transactions'
import Cards from '@/pages/Cards'
import CardDetail from '@/pages/CardDetail'
import InvoiceReview from '@/pages/InvoiceReview'
import Patrimony from '@/pages/Patrimony'
import Consultora from '@/pages/Consultora'
import FamilyManagement from '@/pages/FamilyManagement'

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

function SmartCatchAll() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <LoadingScreen />

  return <Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasFamily, loading } = useAuth()

  if (loading) return <LoadingScreen />

  if (!isAuthenticated) return <Navigate to="/" replace />

  if (!hasFamily) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}

function AppInner() {
  useSwUpdate()

  return (
    <AuthProvider>
      <BrowserRouter>
        <OfflineBanner />
        <InstallPrompt />
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NavigationGuard />
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transacoes"
                element={
                  <ProtectedRoute>
                    <Transactions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards"
                element={
                  <ProtectedRoute>
                    <Cards />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards/:cardId"
                element={
                  <ProtectedRoute>
                    <CardDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cards/:cardId/invoices/:invoiceId/review"
                element={
                  <ProtectedRoute>
                    <InvoiceReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patrimonio"
                element={
                  <ProtectedRoute>
                    <Patrimony />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultora"
                element={
                  <ProtectedRoute>
                    <Consultora />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/familia"
                element={
                  <ProtectedRoute>
                    <FamilyManagement />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<SmartCatchAll />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </AuthProvider>
  )
}

const App = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
)

export default App
