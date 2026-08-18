import { ClientResponseError } from 'pocketbase'

export type InvoiceErrorCode =
  | 'overload'
  | 'rate_limit'
  | 'timeout'
  | 'invalid_file'
  | 'auth_error'
  | 'not_found'
  | 'internal_error'
  | 'network_error'
  | 'unknown'

export interface InvoiceErrorConfig {
  title: string
  body: string
  icon: 'clock' | 'alert' | 'file' | 'wifi' | 'unknown'
  primaryAction: { label: string; type: 'retry' | 'choose_file' | 'ok' }
  secondaryAction?: { label: string; type: 'manual_entry' }
}

/**
 * Detects the kind of invoice-parse error from the thrown value.
 *
 * Priority:
 * 1. PocketBase ClientResponseError carrying an `error_code` in the response body.
 * 2. Error whose message is literally `TIMEOUT` (front-end race guard).
 * 3. Network/fetch errors (TypeError) → `network_error`.
 * 4. HTTP status mapping (503, 429, 408, 422, 400, 401/403, 404, 500).
 * 5. Fallback → `unknown`.
 */
export function detectErrorCode(err: unknown): InvoiceErrorCode {
  // 1. PocketBase ClientResponseError with backend-provided error_code.
  if (err instanceof ClientResponseError) {
    const resp = err.response as Record<string, unknown> | undefined
    const code = resp?.error_code
    if (typeof code === 'string' && isInvoiceErrorCode(code)) {
      return code
    }
    const status = err.status ?? (err.originalError as { status?: number })?.status ?? 0
    const mapped = statusToCode(status)
    if (mapped) return mapped
    // Fall through to message-based detection.
  }

  // 3. TIMEOUT marker (set by the front-end parseInvoice race).
  if (err instanceof Error && err.message === 'TIMEOUT') {
    return 'timeout'
  }

  // 4. Network/fetch errors surface as TypeError.
  if (err instanceof TypeError) {
    return 'network_error'
  }

  // 5. Message-based heuristics for raw errors / strings.
  if (err instanceof Error) {
    const msg = err.message || ''
    if (/timeout|tempo limite|tempo esgotado/i.test(msg)) return 'timeout'
    if (/network|offline|sem conexão|failed to fetch|networkerror/i.test(msg)) {
      return 'network_error'
    }
    const statusMatch = msg.match(/\b(503|429|408|422|400|401|403|404|500)\b/)
    if (statusMatch) {
      const mapped = statusToCode(Number(statusMatch[1]))
      if (mapped) return mapped
    }
  }

  // 6. String payload.
  if (typeof err === 'string') {
    const code = err as InvoiceErrorCode
    if (isInvoiceErrorCode(code)) return code
    if (/timeout|tempo limite/i.test(err)) return 'timeout'
    if (/offline|sem conexão/i.test(err)) return 'network_error'
  }

  return 'unknown'
}

function statusToCode(status: number): InvoiceErrorCode | null {
  switch (status) {
    case 503:
      return 'overload'
    case 429:
      return 'rate_limit'
    case 408:
      return 'timeout'
    case 400:
    case 422:
      return 'invalid_file'
    case 401:
    case 403:
      return 'auth_error'
    case 404:
      return 'not_found'
    case 500:
      return 'internal_error'
    default:
      return null
  }
}

function isInvoiceErrorCode(value: string): value is InvoiceErrorCode {
  return (
    value === 'overload' ||
    value === 'rate_limit' ||
    value === 'timeout' ||
    value === 'invalid_file' ||
    value === 'auth_error' ||
    value === 'not_found' ||
    value === 'internal_error' ||
    value === 'network_error' ||
    value === 'unknown'
  )
}

export function getErrorConfig(code: InvoiceErrorCode): InvoiceErrorConfig {
  const configs: Record<InvoiceErrorCode, InvoiceErrorConfig> = {
    overload: {
      title: 'Sistema ocupado',
      body: 'Recebemos sua fatura, mas o processamento está demorando mais que o normal devido à alta demanda. Tente novamente em alguns minutos.',
      icon: 'clock',
      primaryAction: { label: 'Tentar novamente', type: 'retry' },
      secondaryAction: { label: 'Cadastrar manualmente', type: 'manual_entry' },
    },
    rate_limit: {
      title: 'Muitas solicitações',
      body: 'Você atingiu o limite de processamento. Aguarde alguns minutos e tente novamente.',
      icon: 'clock',
      primaryAction: { label: 'Tentar novamente', type: 'retry' },
      secondaryAction: { label: 'Cadastrar manualmente', type: 'manual_entry' },
    },
    timeout: {
      title: 'Tempo esgotado',
      body: 'A fatura pode ser muito grande ou complexa. Tente novamente — se o problema persistir, cadastre as transações manualmente.',
      icon: 'clock',
      primaryAction: { label: 'Tentar novamente', type: 'retry' },
      secondaryAction: { label: 'Cadastrar manualmente', type: 'manual_entry' },
    },
    invalid_file: {
      title: 'Arquivo não reconhecido',
      body: 'Não conseguimos ler os lançamentos deste arquivo. Verifique se é um PDF ou imagem legível da fatura do cartão.',
      icon: 'file',
      primaryAction: { label: 'Escolher outro arquivo', type: 'choose_file' },
      secondaryAction: { label: 'Cadastrar manualmente', type: 'manual_entry' },
    },
    auth_error: {
      title: 'Erro de configuração',
      body: 'Houve um problema interno de autenticação. Contate o suporte.',
      icon: 'alert',
      primaryAction: { label: 'OK', type: 'ok' },
    },
    not_found: {
      title: 'Serviço indisponível',
      body: 'O serviço de processamento está temporariamente fora do ar. Tente novamente mais tarde.',
      icon: 'alert',
      primaryAction: { label: 'Tentar novamente', type: 'retry' },
    },
    internal_error: {
      title: 'Algo deu errado',
      body: 'Tivemos um problema ao processar sua fatura. Tente novamente — se persistir, cadastre as transações manualmente.',
      icon: 'alert',
      primaryAction: { label: 'Tentar novamente', type: 'retry' },
      secondaryAction: { label: 'Cadastrar manualmente', type: 'manual_entry' },
    },
    network_error: {
      title: 'Sem conexão',
      body: 'Você está offline. Sua fatura será processada quando a conexão voltar.',
      icon: 'wifi',
      primaryAction: { label: 'OK', type: 'ok' },
    },
    unknown: {
      title: 'Não foi possível processar',
      body: 'Algo impediu a leitura da sua fatura. Tente novamente ou cadastre as transações manualmente.',
      icon: 'alert',
      primaryAction: { label: 'Tentar novamente', type: 'retry' },
      secondaryAction: { label: 'Cadastrar manualmente', type: 'manual_entry' },
    },
  }
  return configs[code]
}
