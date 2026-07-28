import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface TermsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Termos de Uso e LGPD
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Última atualização: Julho de 2026
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-gray-700 py-2">
          <p>
            <strong>1. Proteção de Dados (LGPD)</strong>
            <br />
            O Família Finance respeita integralmente a Lei Geral de Proteção de Dados (Lei nº
            13.709/2018). Seus dados financeiros são armazenados de forma segura e criptografada.
          </p>
          <p>
            <strong>2. Compartilhamento Familiar</strong>
            <br />
            Ao criar ou se juntar a uma família, você consente em compartilhar a visualização das
            suas transações e dados de renda com os membros autorizados da sua família.
          </p>
          <p>
            <strong>3. Direitos do Titular (Art. 18)</strong>
            <br />
            Você pode solicitar a qualquer momento a exportação de seus dados ou a exclusão
            definitiva de sua conta no painel do seu perfil.
          </p>
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#166534] hover:bg-[#15803D] w-full"
          >
            Entendido e De Acordo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
