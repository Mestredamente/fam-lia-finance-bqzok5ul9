import type { CategorizationRuleRecord } from '@/types/categorization-rules'

export function findMatchingCategory(
  description: string,
  rules: CategorizationRuleRecord[],
): string | null {
  if (!description.trim() || rules.length === 0) return null
  const lowerDesc = description.toLowerCase()
  let bestMatch: string | null = null
  let bestKeywordLen = 0
  for (const rule of rules) {
    const keyword = rule.keyword.toLowerCase()
    const isMatch =
      rule.match_type === 'contains' ? lowerDesc.includes(keyword) : lowerDesc.startsWith(keyword)
    if (isMatch && keyword.length > bestKeywordLen) {
      bestMatch = rule.category_id
      bestKeywordLen = keyword.length
    }
  }
  return bestMatch
}

export function findMatchingCategories(
  description: string,
  rules: CategorizationRuleRecord[],
  limit: number = 3,
): string[] {
  if (!description.trim() || rules.length === 0) return []
  const lowerDesc = description.toLowerCase()
  const matches = rules
    .filter((rule) => {
      const keyword = rule.keyword.toLowerCase()
      return rule.match_type === 'contains'
        ? lowerDesc.includes(keyword)
        : lowerDesc.startsWith(keyword)
    })
    .sort((a, b) => b.keyword.length - a.keyword.length)
    .map((r) => r.category_id)
  const unique: string[] = []
  for (const id of matches) {
    if (!unique.includes(id)) {
      unique.push(id)
      if (unique.length >= limit) break
    }
  }
  return unique
}
