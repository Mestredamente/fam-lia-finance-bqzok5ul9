export interface ParsedRow {
  [key: string]: string
}

export interface ParseResult {
  columns: string[]
  rows: ParsedRow[]
}

export function parseCSV(text: string): ParseResult {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { columns: [], rows: [] }

  const firstLine = lines[0]
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ','

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  const columns = parseLine(firstLine)
  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: ParsedRow = {}
    columns.forEach((col, idx) => {
      row[col] = values[idx] || ''
    })
    rows.push(row)
  }
  return { columns, rows }
}

export function parseOFX(text: string): ParseResult {
  const rows: ParsedRow[] = []
  const regex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const block = match[1]
    const getTag = (tag: string): string => {
      const m = block.match(new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i'))
      return m ? m[1].trim() : ''
    }
    const trnAmt = getTag('TRNAMT')
    const dtPosted = getTag('DTPOSTED')
    const name = getTag('NAME')
    const memo = getTag('MEMO')
    let date = ''
    if (dtPosted.length >= 8) {
      date =
        dtPosted.substring(0, 4) + '-' + dtPosted.substring(4, 6) + '-' + dtPosted.substring(6, 8)
    }
    rows.push({
      date,
      description: [name, memo].filter(Boolean).join(' - '),
      amount: trnAmt,
      type: parseFloat(trnAmt) < 0 ? 'expense' : 'income',
    })
  }
  return { columns: ['date', 'description', 'amount', 'type'], rows }
}

export function parseBankStatement(text: string, filename: string): ParseResult {
  return filename.toLowerCase().endsWith('.ofx') ? parseOFX(text) : parseCSV(text)
}

export function normalizeAmount(value: string): number {
  const cleaned = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  return Math.abs(parseFloat(cleaned) || 0)
}

export function normalizeDate(value: string): string {
  if (!value) return new Date().toISOString().split('T')[0]
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.substring(0, 10)
  const parts = value.split(/[/.-]/)
  if (parts.length === 3) {
    const [a, b, c] = parts
    if (a.length === 4) return a + '-' + b.padStart(2, '0') + '-' + c.padStart(2, '0')
    return c.padStart(4, '20') + '-' + b.padStart(2, '0') + '-' + a.padStart(2, '0')
  }
  return new Date().toISOString().split('T')[0]
}
