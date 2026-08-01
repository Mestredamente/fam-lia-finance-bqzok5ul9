import type { CategorizationRuleRecord } from '@/types/categorization-rules'

export function findMatchingCategory(
  description: string,
  rules: CategorizationRuleRecord[],
): string | null {
  if (!description.trim() || rules.length === 0) return null
  const lowerDesc = description.toLowerCase()
  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase()
    if (rule.match_type === 'contains' && lowerDesc.includes(keyword)) {
      return rule.category_id
    }
    if (rule.match_type === 'starts_with' && lowerDesc.startsWith(keyword)) {
      return rule.category_id
    }
  }
  return null
}

export function findMatchingCategories(
  description: string,
  rules: CategorizationRuleRecord[],
  limit: number = 3,
): string[] {
  if (!description.trim() || rules.length === 0) return []
  const lowerDesc = description.toLowerCase()
  const matches: string[] = []
  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase()
    const isMatch =
      rule.match_type === 'contains' ? lowerDesc.includes(keyword) : lowerDesc.startsWith(keyword)
    if (isMatch && !matches.includes(rule.category_id)) {
      matches.push(rule.category_id)
      if (matches.length >= limit) break
    }
  }
  return matches
}
