import { ClientResponseError } from 'pocketbase'

export function getPortugueseError(error: unknown): string {
  if (!(error instanceof ClientResponseError)) {
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Erro de conexão. Verifique sua internet e tente novamente.'
      }
    }
    return 'Ocorreu um erro inesperado. Tente novamente.'
  }

  if (error.status === 0) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.'
  }
  if (error.status === 400) {
    const msg = error.message.toLowerCase()
    if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('email')) {
      return 'Credenciais inválidas.'
    }
    return 'Dados inválidos. Verifique as informações e tente novamente.'
  }
  if (error.status === 401) {
    return 'Sua sessão expirou. Faça login novamente.'
  }
  if (error.status === 403) {
    return 'Você não tem permissão para esta ação.'
  }
  if (error.status === 404) {
    return 'Recurso não encontrado.'
  }
  if (error.status === 409) {
    return 'Este registro já existe.'
  }
  if (error.status === 408) {
    return 'Tempo esgotado. A operação demorou demais. Tente novamente.'
  }
  if (error.status === 429) {
    return 'Muitas solicitações. Aguarde alguns minutos e tente novamente.'
  }
  if (error.status === 500) {
    return 'Erro interno. Tente novamente — se persistir, contate o suporte.'
  }
  if (error.status === 503) {
    return 'Sistema ocupado. O serviço está momentaneamente sobrecarregado. Tente novamente em alguns instantes.'
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}
