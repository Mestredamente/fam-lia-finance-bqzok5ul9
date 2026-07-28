import { useState } from 'react'
import { Copy, Check, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

interface InviteCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  code: string
}

export function InviteCodeDialog({ open, onOpenChange, code }: InviteCodeDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast({
      title: 'Código copiado!',
      description: 'Envie o código para seu cônjuge para que ele possa se juntar à família.',
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl text-center">
        <DialogHeader className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
            <Users className="h-6 w-6 text-[#166534]" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">Código de Convite</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Compartilhe este código com seu cônjuge para sincronizar suas finanças familiares.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-4 bg-emerald-50 border-2 border-dashed border-[#22C55E] rounded-xl flex items-center justify-between">
          <span className="text-2xl font-mono font-bold text-[#166534] tracking-wider">{code}</span>
          <Button
            size="sm"
            onClick={handleCopy}
            className="bg-[#166534] hover:bg-[#15803D] text-white flex items-center gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  )
}
