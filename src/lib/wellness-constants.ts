import type { EmotionType, ChallengeType, BadgeType } from '@/types/finance'

export interface EmotionMeta {
  emoji: string
  label: string
  color: string
  isNegative: boolean
}

export const EMOTION_MAP: Record<EmotionType, EmotionMeta> = {
  anxiety: {
    emoji: '😰',
    label: 'Ansiedade',
    color: 'bg-orange-100 text-orange-700',
    isNegative: true,
  },
  happiness: {
    emoji: '😄',
    label: 'Felicidade',
    color: 'bg-yellow-100 text-yellow-700',
    isNegative: false,
  },
  guilt: { emoji: '😔', label: 'Culpa', color: 'bg-red-100 text-red-700', isNegative: true },
  relief: { emoji: '😮‍💨', label: 'Alívio', color: 'bg-green-100 text-green-700', isNegative: false },
  frustration: {
    emoji: '😤',
    label: 'Frustração',
    color: 'bg-red-100 text-red-700',
    isNegative: true,
  },
  pride: {
    emoji: '🥳',
    label: 'Orgulho',
    color: 'bg-purple-100 text-purple-700',
    isNegative: false,
  },
  fear: { emoji: '😨', label: 'Medo', color: 'bg-gray-100 text-gray-700', isNegative: true },
  impulse: { emoji: '🛒', label: 'Impulso', color: 'bg-blue-100 text-blue-700', isNegative: true },
  gratitude: {
    emoji: '🙏',
    label: 'Gratidão',
    color: 'bg-emerald-100 text-emerald-700',
    isNegative: false,
  },
  stress: { emoji: '😣', label: 'Estresse', color: 'bg-red-100 text-red-700', isNegative: true },
}

export const EMOTION_LIST = Object.entries(EMOTION_MAP).map(([key, meta]) => ({
  value: key as EmotionType,
  ...meta,
}))

export const TRIGGER_SUGGESTIONS = [
  'Dia de pagamento',
  'Briga com cônjuge',
  'Promoção',
  'Tédio',
  'Recompensa',
  'Ansiedade com contas',
  'Pressão social',
  'Dia ruim no trabalho',
  'Comemoração',
  'Impulso do momento',
  'Outro',
]

export interface BadgeTier {
  name: BadgeType
  label: string
  minPoints: number
  emoji: string
  color: string
}

export const BADGE_TIERS: BadgeTier[] = [
  { name: 'none', label: 'Nenhum', minPoints: 0, emoji: '🎯', color: 'text-gray-500' },
  { name: 'bronze', label: 'Bronze', minPoints: 50, emoji: '🥉', color: 'text-orange-600' },
  { name: 'silver', label: 'Prata', minPoints: 100, emoji: '🥈', color: 'text-gray-400' },
  { name: 'gold', label: 'Ouro', minPoints: 200, emoji: '🥇', color: 'text-yellow-500' },
  { name: 'platinum', label: 'Platina', minPoints: 400, emoji: '💎', color: 'text-cyan-500' },
]

export function getBadgeFromPoints(points: number): BadgeTier {
  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    if (points >= BADGE_TIERS[i].minPoints) return BADGE_TIERS[i]
  }
  return BADGE_TIERS[0]
}

export function getEmotionMeta(emotion: string): EmotionMeta {
  return EMOTION_MAP[emotion as EmotionType] || EMOTION_MAP.anxiety
}

export interface PredefinedChallenge {
  title: string
  description: string
  durationDays: number
  points: number
  badgeType: BadgeType
  type: ChallengeType
  targetValue: number | null
}

export const PREDEFINED_CHALLENGES: PredefinedChallenge[] = [
  {
    title: 'Sem gastar por impulso',
    description: 'Não faça compras por impulso durante 7 dias',
    durationDays: 7,
    points: 50,
    badgeType: 'bronze',
    type: 'no_impulse',
    targetValue: 7,
  },
  {
    title: 'Economizar R$ 500',
    description: 'Economize R$ 500 em 30 dias',
    durationDays: 30,
    points: 100,
    badgeType: 'silver',
    type: 'savings_goal',
    targetValue: 500,
  },
  {
    title: 'Cortar restaurantes',
    description: 'Não coma fora por 14 dias',
    durationDays: 14,
    points: 75,
    badgeType: 'bronze',
    type: 'category_cut',
    targetValue: 14,
  },
  {
    title: 'Registrar todo gasto',
    description: 'Anote todos os gastos por 30 dias',
    durationDays: 30,
    points: 100,
    badgeType: 'silver',
    type: 'emotional_awareness',
    targetValue: 30,
  },
  {
    title: 'Diário emocional 7 dias',
    description: 'Registre suas emoções por 7 dias seguidos',
    durationDays: 7,
    points: 50,
    badgeType: 'bronze',
    type: 'emotional_awareness',
    targetValue: 7,
  },
  {
    title: 'Freeze de assinaturas',
    description: 'Cancele pelo menos 1 assinatura',
    durationDays: 14,
    points: 75,
    badgeType: 'bronze',
    type: 'spending_freeze',
    targetValue: 1,
  },
  {
    title: 'Reserva de emergência',
    description: 'Economize 1 mês de despesas',
    durationDays: 90,
    points: 200,
    badgeType: 'gold',
    type: 'savings_goal',
    targetValue: null,
  },
  {
    title: 'Mês sem dívida nova',
    description: 'Não faça novas dívidas por 30 dias',
    durationDays: 30,
    points: 150,
    badgeType: 'silver',
    type: 'spending_freeze',
    targetValue: 30,
  },
]

export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  spending_freeze: 'Freeze de Gastos',
  savings_goal: 'Meta de Economia',
  no_impulse: 'Sem Impulso',
  category_cut: 'Cortar Categoria',
  emotional_awareness: 'Consciência Emocional',
  custom: 'Personalizado',
}

export function isChallengeExpired(endDate: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return endDate < today
}

export function daysRemaining(endDate: string): number {
  const end = new Date(endDate + 'T23:59:59')
  const now = new Date()
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export const THERAPY_SUGGESTIONS = [
  'Por que eu sempre gasto quando estou estressado?',
  'Como controlar ansiedade com dinheiro?',
  'Me sinto culpado com meus gastos, o que fazer?',
  'Como falar de dinheiro com meu cônjuge sem brigar?',
]

export const THERAPY_WELCOME =
  'Estou aqui para te ouvir. Dinheiro e emoção andam juntos. Como você está se sentindo com suas finanças hoje?'

export const THERAPY_DISCLAIMER = 'Este chat não substitui acompanhamento psicológico profissional'
