'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Check, ArrowRight, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function SuccessPage() {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={`min-h-screen bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center p-4 transition-opacity duration-500 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <Card className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Pagamento Confirmado!</h1>
          <p className="text-emerald-100">Sua assinatura VIP foi ativada</p>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-6">
          {/* Profile */}
          <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
            <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src="/images/lana-white-top.jpg"
                alt="Lana Alvarenga"
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-foreground">Lana Alvarenga</p>
              <p className="text-sm text-muted-foreground">@lana.alvarenga</p>
            </div>
            <div className="ml-auto">
              <PartyPopper className="w-6 h-6 text-primary" />
            </div>
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-foreground text-lg">Próximo passo:</h2>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Acesse o conteúdo VIP</p>
                <p className="text-sm text-muted-foreground">
                  Clique no botão abaixo para acessar todos os conteúdos exclusivos imediatamente.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 rounded-xl"
              onClick={() => window.open('https://drive.google.com/drive/folders/16w6ysCLaJwEUWouom85VmWcv86vK8OjU', '_blank')}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Acessar os conteúdos!
            </Button>
          </div>

          {/* Support */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Problemas com o acesso? Entre em contato pelo WhatsApp{' '}
              <a 
                href="https://wa.me/5511960233821" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary font-semibold hover:underline"
              >
                +55 (11) 96023-3821
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
