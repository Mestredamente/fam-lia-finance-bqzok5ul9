import { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] p-4">
          <div className="max-w-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-gray-900">Algo deu errado</h1>
              <p className="text-sm text-gray-500">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '/'
                }}
                className="bg-[#166534] hover:bg-[#15803D]"
              >
                Voltar ao início
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
