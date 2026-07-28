import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-6xl font-bold text-[#166534] mb-2">404</h1>
        <p className="text-xl font-semibold text-gray-800 mb-2">Página não encontrada</p>
        <p className="text-sm text-gray-500 mb-6">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#166534] text-white font-medium hover:bg-[#15803D] transition-colors"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  )
}
