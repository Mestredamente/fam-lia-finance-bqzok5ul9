import { Bot, User as UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  userName?: string
  userAvatar?: string
  userId?: string
}

function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>
  })
}

function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let key = 0

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const items = currentList.map((item, i) => (
        <li key={`li-${key++}`}>{renderInline(item, `li-${key}`)}</li>
      ))
      elements.push(
        listType === 'ul' ? (
          <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1 my-1">
            {items}
          </ul>
        ) : (
          <ol key={`ol-${key++}`} className="list-decimal pl-5 space-y-1 my-1">
            {items}
          </ol>
        ),
      )
      currentList = []
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (listType !== 'ul') flushList()
      listType = 'ul'
      currentList.push(trimmed.substring(2))
      continue
    }

    const numMatch = trimmed.match(/^\d+\.\s+(.*)/)
    if (numMatch) {
      if (listType !== 'ol') flushList()
      listType = 'ol'
      currentList.push(numMatch[1])
      continue
    }

    flushList()

    if (trimmed) {
      elements.push(
        <p key={`p-${key++}`} className="leading-relaxed">
          {renderInline(trimmed, `p-${key}`)}
        </p>,
      )
    } else if (elements.length > 0) {
      elements.push(<div key={`br-${key++}`} className="h-2" />)
    }
  }

  flushList()
  return elements
}

export function ChatMessage({ role, content, userName, userAvatar, userId }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-2.5 animate-fade-in', isUser && 'flex-row-reverse')}>
      {isUser ? (
        <Avatar className="h-8 w-8 shrink-0 border border-gray-200 mt-0.5">
          {userAvatar && userId && (
            <AvatarImage
              src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/users/${userId}/${userAvatar}`}
              alt={userName}
            />
          )}
          <AvatarFallback className="bg-emerald-100 text-[#166534] text-xs font-bold">
            {userName?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-8 w-8 shrink-0 rounded-full bg-[#166534] flex items-center justify-center text-white mt-0.5">
          <Bot className="h-5 w-5" />
        </div>
      )}
      <div
        className={cn(
          'rounded-2xl px-4 py-2.5 text-sm max-w-[80%] space-y-1',
          isUser
            ? 'bg-[#166534] text-white rounded-tr-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm',
        )}
      >
        {renderContent(content)}
      </div>
    </div>
  )
}
