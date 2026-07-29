import {
  Home,
  Utensils,
  Car,
  Heart,
  Gamepad2,
  Book,
  CreditCard,
  RefreshCw,
  ShoppingCart,
  Coffee,
  Banknote,
  PlusCircle,
  Plane,
  Gift,
  Dumbbell,
  Smartphone,
  Receipt,
  type LucideIcon,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  utensils: Utensils,
  car: Car,
  heart: Heart,
  gamepad: Gamepad2,
  'gamepad-2': Gamepad2,
  book: Book,
  'credit-card': CreditCard,
  'refresh-cw': RefreshCw,
  'shopping-cart': ShoppingCart,
  coffee: Coffee,
  banknote: Banknote,
  'plus-circle': PlusCircle,
  plane: Plane,
  gift: Gift,
  dumbbell: Dumbbell,
  smartphone: Smartphone,
  receipt: Receipt,
}

export const PREDEFINED_ICONS = [
  'home',
  'utensils',
  'car',
  'heart',
  'gamepad-2',
  'book',
  'credit-card',
  'shopping-cart',
]

export const PREDEFINED_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#3B82F6',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
  '#22C55E',
  '#F97316',
]

export function getCategoryIcon(name: string): LucideIcon {
  return iconMap[name] || PlusCircle
}
