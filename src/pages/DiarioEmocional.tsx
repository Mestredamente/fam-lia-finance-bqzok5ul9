import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Plus, BarChart3, BookOpen, Trash2, Edit } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useEmotionalJournal } from '@/hooks/use-emotional-journal'
import { EmotionalDiaryFormSheet } from '@/components/EmotionalDiaryFormSheet'
import { EmotionalAnalysisView } from '@/components/EmotionalAnalysisView'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { deleteJournalEntry } from '@/services/emotional-journal'
import { toast } from '@/hooks/use-toast'
import { getEmotionMeta } from '@/lib/wellness-constants'
import { formatBRL, formatDatePtBR } from '@/lib/utils'
import type { EmotionalJournalRecord } from '@/types/finance'

export default function DiarioEmocional() {
  const navigate = useNavigate()
  const { family, member } = useAuth()
  const now = new Date()
  const { entries, summary, loading, refetch } = useEmotionalJournal(
    member?.id,
    now.getMonth(),
    now.getFullYear(),
  )
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<EmotionalJournalRecord | null>(null)
  const [detailEntry, setDetailEntry] = useState<EmotionalJournalRecord | null>(null)
  const [view, setView] = useState<'diary' | 'analysis'>('diary')

  const grouped = useMemo(() => {
    const groups: Record<string, EmotionalJournalRecord[]> = {}
    for (const e of entries) {
      const day = e.created.substring(0, 10)
      if (!groups[day]) groups[day] = []
      groups[day].push(e)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  const topEmotion = summary.topEmotion ? getEmotionMeta(summary.topEmotion) : null
  const showMonthlyCard = summary.entryCount >= 3

  const handleDelete = async () => {
    if (!detailEntry) return
    try {
      await deleteJournalEntry(detailEntry.id)
      toast({ title: 'Entrada excluída' })
      setDetailEntry(null)
      refetch()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/consultora')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">Diário Emocional</h2>
          <p className="text-xs text-gray-500">Entenda seus gatilhos financeiros</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView(view === 'diary' ? 'analysis' : 'diary')}
        >
          <BarChart3 className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          className="bg-[#166534] hover:bg-[#15803D]"
          onClick={() => {
            setEditingEntry(null)
            setShowForm(true)
          }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {view === 'analysis' && family && member ? (
        <EmotionalAnalysisView memberId={member.id} familyId={family.id} />
      ) : (
        <>
          {showMonthlyCard && topEmotion && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{topEmotion.emoji}</span>
                <div className="flex-1">
                  <span className="text-sm font-bold text-gray-900">{topEmotion.label}</span>
                  <p className="text-xs text-gray-500">{summary.entryCount} entradas este mês</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-red-600">
                    {formatBRL(summary.totalSpent)}
                  </span>
                  <p className="text-[10px] text-gray-400">gasto emocional</p>
                </div>
              </div>
              <Badge
                className={`mt-2 ${topEmotion.isNegative ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
              >
                {topEmotion.isNegative
                  ? 'Atenção aos seus padrões emocionais'
                  : 'Padrão emocional positivo'}
              </Badge>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-700">Seu diário está vazio</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs">
                Registre como você se sente ao gastar. Com o tempo, padrões vão aparecer.
              </p>
              <Button
                className="mt-4 bg-[#166534] hover:bg-[#15803D]"
                onClick={() => {
                  setEditingEntry(null)
                  setShowForm(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1.5" /> Primeira entrada
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([day, dayEntries]) => (
                <div key={day}>
                  <p className="text-xs font-semibold text-gray-400 mb-2">{formatDatePtBR(day)}</p>
                  <div className="space-y-2">
                    {dayEntries.map((entry) => {
                      const meta = getEmotionMeta(entry.emotion)
                      return (
                        <div
                          key={entry.id}
                          className="p-3 bg-white border border-gray-100 rounded-xl shadow-subtle cursor-pointer"
                          onClick={() => setDetailEntry(entry)}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xl">{meta.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <Badge className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                              <p className="text-xs text-gray-700 mt-1">Gatilho: {entry.trigger}</p>
                              {entry.note && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {entry.note}
                                </p>
                              )}
                              {entry.spending_amount && entry.spending_amount > 0 && (
                                <p className="text-xs font-semibold text-red-600 mt-0.5">
                                  −{formatBRL(entry.spending_amount)}
                                </p>
                              )}
                              {entry.transaction_id && (
                                <Badge variant="outline" className="text-[9px] mt-1">
                                  Ver transação
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <EmotionalDiaryFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        familyId={family?.id || ''}
        memberId={member?.id || ''}
        editingEntry={editingEntry}
        onSaved={refetch}
      />

      <Sheet open={!!detailEntry} onOpenChange={(v) => !v && setDetailEntry(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Detalhes da entrada</SheetTitle>
          </SheetHeader>
          {detailEntry && (
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getEmotionMeta(detailEntry.emotion).emoji}</span>
                <Badge className={getEmotionMeta(detailEntry.emotion).color}>
                  {getEmotionMeta(detailEntry.emotion).label}
                </Badge>
              </div>
              <p className="text-sm text-gray-700">
                <strong>Gatilho:</strong> {detailEntry.trigger}
              </p>
              {detailEntry.note && <p className="text-sm text-gray-600">{detailEntry.note}</p>}
              {detailEntry.spending_amount && detailEntry.spending_amount > 0 && (
                <p className="text-sm font-semibold text-red-600">
                  −{formatBRL(detailEntry.spending_amount)}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingEntry(detailEntry)
                    setDetailEntry(null)
                    setShowForm(true)
                  }}
                >
                  <Edit className="h-4 w-4 mr-1.5" /> Editar
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Excluir
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
