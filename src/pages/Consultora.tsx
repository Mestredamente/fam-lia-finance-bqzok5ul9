import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Send, RotateCcw } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useMonthlySummary } from '@/hooks/use-monthly-summary'
import { ChatMessage } from '@/components/ChatMessage'
import { TypingIndicator } from '@/components/TypingIndicator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getConversations, createConversation } from '@/services/ai-conversations'
import { chat as chatApi } from '@/services/ai-advisor'
import { formatBRL } from '@/lib/utils'
import type { AIConversationRecord } from '@/types/finance'

const SUGGESTIONS = [
  'Como estão meus gastos este mês?',
  'Onde posso economizar?',
  'Como sair das minhas dívidas mais rápido?',
  'Minha reserva de emergência está boa?',
]

export default function Consultora() {
  const { family, member, user } = useAuth()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<AIConversationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState(false)
  const [showChips, setShowChips] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const year = new Date().getFullYear()
  const month = new Date().getMonth()
  const { summary } = useMonthlySummary(family?.id, year, month)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  useEffect(() => {
    if (!member) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await getConversations(member.id)
        if (cancelled) return
        setMessages(data)
        setShowChips(data.length === 0)
      } catch {
        if (!cancelled) setMessages([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [member])

  useEffect(() => {
    if (!loading && messages.length === 0 && !welcomeMessage) {
      const hasData = summary.totalReceitas > 0 || summary.totalDespesas > 0
      if (hasData) {
        setWelcomeMessage(
          `Olá! Analisei suas finanças deste mês. Você tem ${formatBRL(summary.totalReceitas)} de receitas e ${formatBRL(summary.totalDespesas)} de despesas. Seu saldo é ${formatBRL(summary.saldo)}. ${summary.saldo >= 0 ? 'Parabéns pelo saldo positivo!' : 'Atenção: seu saldo está negativo.'} Como posso ajudar?`,
        )
      } else {
        setWelcomeMessage(
          'Olá! Sou sua consultora financeira. Para começar a analisar suas finanças, adicione transações, investimentos e dívidas no app. Assim poderei dar dicas personalizadas!',
        )
      }
    }
  }, [loading, messages.length, welcomeMessage, summary])

  const sendMessage = async (text: string) => {
    if (!text.trim() || !family || !member || isTyping) return

    setInput('')
    setError(false)
    setShowChips(false)

    const userMsg: AIConversationRecord = {
      id: 'temp-user-' + Date.now(),
      family_id: family.id,
      user_id: member.id,
      role: 'user',
      content: text,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsTyping(true)

    try {
      const contextMessages = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const result = await chatApi(family.id, member.id, text, contextMessages)

      if ('error' in result) {
        throw new Error(result.error)
      }

      const assistantContent = result.response || 'Desculpe, não consegui gerar uma resposta.'

      try {
        const savedAssistant = await createConversation({
          family_id: family.id,
          user_id: member.id,
          role: 'assistant',
          content: assistantContent,
        })
        setMessages((prev) => [...prev, savedAssistant])
      } catch {
        const tempAssistant: AIConversationRecord = {
          id: 'temp-assistant-' + Date.now(),
          family_id: family.id,
          user_id: member.id,
          role: 'assistant',
          content: assistantContent,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, tempAssistant])
      }
    } catch {
      setError(true)
    } finally {
      setIsTyping(false)
    }
  }

  const handleSend = () => {
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion)
  }

  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      setMessages((prev) => prev.slice(0, -1))
      sendMessage(lastUserMsg.content)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
          <Skeleton className="h-12 w-1/2 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] lg:h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
        <div className="w-10 h-10 rounded-full bg-[#166534] flex items-center justify-center text-white shrink-0">
          <Bot className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900">Consultora Financeira</h2>
            <Badge className="bg-[#166534] text-white hover:bg-[#166534] text-[9px] h-4 px-1.5">
              IA
            </Badge>
          </div>
          <p className="text-xs text-gray-500">Análise inteligente das suas finanças</p>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && welcomeMessage && (
          <ChatMessage
            role="assistant"
            content={welcomeMessage}
            userName={user?.name}
            userAvatar={user?.avatar}
            userId={user?.id}
          />
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            userName={user?.name}
            userAvatar={user?.avatar}
            userId={user?.id}
          />
        ))}

        {showChips && messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2 animate-fade-in">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                className="px-3 py-2 text-xs font-medium text-[#166534] bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {isTyping && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="w-8 h-8 shrink-0 rounded-full bg-[#166534] flex items-center justify-center text-white">
              <Bot className="h-5 w-5" />
            </div>
            <TypingIndicator />
          </div>
        )}

        {error && (
          <div className="space-y-2 animate-fade-in">
            <ChatMessage
              role="assistant"
              content="Desculpe, tive um problema ao processar sua pergunta. Pode tentar novamente?"
              userName={user?.name}
              userAvatar={user?.avatar}
              userId={user?.id}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-10 border-gray-300 text-gray-600"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Tentar novamente
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre suas finanças..."
            disabled={isTyping}
            className="flex-1 px-4 py-2.5 text-sm bg-gray-100 border border-transparent rounded-full focus:outline-none focus:border-[#166534] focus:bg-white transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full bg-[#166534] hover:bg-[#15803D] text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
