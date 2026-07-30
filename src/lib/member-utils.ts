import type { MemberRole } from '@/types/finance'

export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate + 'T00:00:00')
  if (isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--
  }
  return age
}

export function formatAge(birthDate: string | null | undefined): string {
  const age = calculateAge(birthDate)
  if (age === null) return ''
  return `${age} anos`
}

export interface RoleOption {
  value: MemberRole
  label: string
}

export interface RoleGroup {
  label: string
  options: RoleOption[]
}

export const roleGroups: RoleGroup[] = [
  {
    label: 'Núcleo',
    options: [
      { value: 'husband', label: 'Esposo' },
      { value: 'wife', label: 'Esposa' },
      { value: 'partner', label: 'Parceiro(a)' },
    ],
  },
  {
    label: 'Filhos',
    options: [
      { value: 'son', label: 'Filho' },
      { value: 'daughter', label: 'Filha' },
      { value: 'stepson', label: 'Enteado' },
      { value: 'stepdaughter', label: 'Enteada' },
    ],
  },
  {
    label: 'Avós',
    options: [
      { value: 'grandfather', label: 'Avô' },
      { value: 'grandmother', label: 'Avó' },
    ],
  },
  {
    label: 'Pais/Sogros',
    options: [
      { value: 'father', label: 'Pai' },
      { value: 'mother', label: 'Mãe' },
      { value: 'father_in_law', label: 'Sogro' },
      { value: 'mother_in_law', label: 'Sogra' },
    ],
  },
  {
    label: 'Irmãos',
    options: [
      { value: 'brother', label: 'Irmão' },
      { value: 'sister', label: 'Irmã' },
      { value: 'uncle', label: 'Tio' },
      { value: 'aunt', label: 'Tia' },
      { value: 'nephew', label: 'Sobrinho' },
      { value: 'niece', label: 'Sobrinha' },
    ],
  },
  {
    label: 'Outros',
    options: [
      { value: 'cousin', label: 'Primo(a)' },
      { value: 'other', label: 'Outro' },
    ],
  },
]
