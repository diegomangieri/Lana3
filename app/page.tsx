'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, ChevronDown, Lock, Check, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PixPaymentModal } from "@/components/pix-payment-modal"


export default function VIPSubscriptionPage() {
  const router = useRouter()
  const [showVIP, setShowVIP] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [pageReady, setPageReady] = useState(false)
  const [vipContentVisible, setVipContentVisible] = useState(false)
  const [showPixModal, setShowPixModal] = useState(false)

  // Fade in everything on mount
  useEffect(() => {
    const timer = setTimeout(() => setPageReady(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // VIP content fade in
  useEffect(() => {
    if (showVIP) {
      const timer = setTimeout(() => setVipContentVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [showVIP])

  const faqItems = [
    {
      question: "É sigiloso? Vai aparecer na minha fatura?",
      answer: "Sim, é 100% sigiloso. Na sua fatura aparecerá apenas um nome genérico, sem referência ao conteúdo."
    },
    {
      question: "Tenho acesso imediato aos conteúdos?",
      answer: "O acesso é imediato! Assim que o pagamento for confirmado, você já pode acessar todos os meus conteúdos exclusivos."
    },
    {
      question: "Posso cancelar quando eu quiser?",
      answer: "Sim, você pode cancelar a qualquer momento. A assinatura não renova automaticamente, você tem total controle."
    },
    {
      question: "Possui reembolso ou garantia?",
      answer: "Temos garantia de 7 dias. Se não ficar satisfeito, devolvemos 100% do seu dinheiro."
    },
    {
      question: "Como vou acessar os conteúdos?",
      answer: "Após assinar, você receberá o convite exclusivo via E-mail para o Grupo VIP com conteúdos extras, interação direta e atualizações diárias."
    }
  ]

  const handlePaymentSuccess = () => {
    setShowPixModal(false)
    router.push('/sucesso')
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const promoDate = tomorrow.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  })

  const handleAccessContent = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setShowVIP(true)
      setIsTransitioning(false)
    }, 1500)
  }

  return (
    <>
      {/* Preload WhatsApp logo for order bump */}
      <link rel="preload" href="/images/whatsapp-logo.jpg" as="image" />

      {/* Pix Payment Modal */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        onSuccess={handlePaymentSuccess}
        amount={19.90}
      />

      {/* Transition Overlay */}
      <div 
        className={`fixed inset-0 bg-white z-50 flex items-center justify-center transition-opacity duration-500 ${isTransitioning ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-foreground font-semibold">Carregando conteúdos...</p>
        </div>
      </div>

      {/* Landing Page - Always rendered, hidden when VIP is shown */}
      <div 
        className={`min-h-screen bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center p-4 transition-opacity duration-700 ease-out ${pageReady && !showVIP ? 'opacity-100' : 'opacity-0'} ${showVIP ? 'hidden' : ''}`}
      >
        <div className="w-full max-w-md">
          {/* Profile Section */}
          <div className="text-center mb-8">
            <div className="w-32 h-32 rounded-full bg-white p-1 mx-auto mb-4 shadow-xl">
              <div className="w-full h-full rounded-full overflow-hidden bg-white/10">
                <Image
                  src="/images/lana-black-top.jpg"
                  alt="Lana Alvarenga"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Lana Alvarenga
            </h1>
            <p className="text-white/90 text-lg">
              @lana.alvarenga
            </p>
          </div>

          {/* Buttons */}
          <div>
            <button
              onClick={handleAccessContent}
              className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
            >
              Conteúdinhos aqui 😈🙈
            </button>
          </div>
        </div>
      </div>

      {/* VIP Content Page - Always rendered but hidden initially */}
      <div 
        className={`min-h-screen bg-background transition-opacity duration-700 ease-out ${showVIP && vipContentVisible ? 'opacity-100' : 'opacity-0'} ${!showVIP ? 'hidden' : ''}`}
      >
        {/* Promotional Banner */}
        <div className="bg-primary text-white text-center py-3 px-4 font-semibold text-sm">
          ESSA PROMOÇÃO É VÁLIDA ATÉ {promoDate}
        </div>

        {/* Logo Section */}
        <div className="bg-background py-2 px-4 flex justify-center border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <h1 className="text-xl font-bold text-foreground">Conteúdos VIP</h1>
          </div>
        </div>

        {/* Profile Header Section */}
        <div className="px-4 py-4 bg-white">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-400 flex-shrink-0 overflow-hidden">
              <Image
                src="/images/lana-white-top.jpg"
                alt="Lana Alvarenga"
                width={64}
                height={64}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-foreground">Lana Alvarenga</h2>
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">@lana.alvarenga</p>
              
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <span className="font-bold text-foreground">98</span>
                  <span className="text-muted-foreground ml-1">Fotos</span>
                </div>
                <div className="text-center">
                  <span className="font-bold text-foreground">28</span>
                  <span className="text-muted-foreground ml-1">Vídeos</span>
                </div>
                <div className="text-center">
                  <span className="font-bold text-foreground">5.4K</span>
                  <span className="text-muted-foreground ml-1">Likes</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-foreground leading-relaxed">
            Quer ver minha 🌸 com vitiligo...? 🙈
            <br />
            Minha pele faz meu corpo ser único — e aqui vou te mostrar tudinho sem censuras. 😈
          </p>
        </div>

        {/* Divider line */}
        <div className="h-px bg-zinc-200" />

        {/* Hero Image Section - Blurred Preview */}
        <div className="relative">
          <div className="w-full h-[400px] bg-zinc-800 relative overflow-hidden flex items-center justify-center">
            <Image
              src="/images/preview-1.jpeg"
              alt="Conteúdo Exclusivo"
              fill
              className="object-cover object-center blur-xl scale-110"
              priority
              sizes="100vw"
            />
            
            {/* Lock Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center bg-zinc-100 rounded-2xl px-8 py-6 shadow-lg">
                <div className="w-14 h-14 rounded-full bg-zinc-200 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-zinc-600" />
                </div>
                <p className="text-foreground font-semibold mb-1">Conteúdo Exclusivo</p>
                <p className="text-muted-foreground text-sm">Assine para desbloquear</p>
              </div>
            </div>
            
            {/* Engagement Stats Overlay */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-4">
              <div className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5" />
                <span className="font-semibold text-sm">1.7K</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold text-sm">312</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="px-4 py-6 bg-zinc-50">
          <h3 className="text-2xl font-bold text-foreground mb-4">Assinatura <span className="text-base font-medium text-muted-foreground">(mensal)</span></h3>
          
          <div className="flex gap-2 mb-4">
            <Badge variant="secondary" className="bg-orange-100 text-primary border-0 font-semibold">
              VEJA TUDO AGORA
            </Badge>
            <Badge variant="secondary" className="bg-emerald-500 text-white border-0 font-semibold">
              Promoção
            </Badge>
          </div>

          {/* Featured Plan */}
          <Card className="bg-gradient-to-br from-primary to-orange-500 text-white p-6 mb-4 border-0 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-semibold mb-1">Acesso completo</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/70 line-through">R$ 99,90</p>
                <p className="text-3xl font-bold">R$ 19,90</p>
              </div>
            </div>
            <Button 
              size="lg" 
              className="w-full bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-base h-12 active:scale-95 transition-transform duration-150 shadow-lg hover:shadow-xl"
              onClick={() => setShowPixModal(true)}
            >
              Assinar agora!
            </Button>
          </Card>

          <div className="bg-orange-50 border-2 border-primary rounded-lg p-3 mb-4">
            <p className="text-sm font-bold text-primary text-center">
              Acesso imediato via E-mail!
            </p>
          </div>

          {/* Security Badges */}
          <div className="flex items-center justify-center gap-4 text-sm mb-6">
            <div className="flex items-center gap-1 text-emerald-600">
              <Lock className="w-4 h-4" />
              <span className="font-medium">Pagamento 100% seguro</span>
            </div>
            <div className="text-muted-foreground">|</div>
            <div className="flex items-center gap-1 text-primary">
              <Check className="w-4 h-4" />
              <span className="font-medium">Acesso imediato</span>
            </div>
          </div>

          {/* Locked Content Preview - Portrait */}
          <div className="relative aspect-[3/4] bg-zinc-800 rounded-2xl overflow-hidden -mb-6">
            <Image
              src="/images/preview-2.jpeg"
              alt="Conteúdo Exclusivo"
              fill
              className="object-cover object-center blur-xl scale-110"
              sizes="100vw"
            />
            
            {/* Lock Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center bg-zinc-100 rounded-2xl px-8 py-6 shadow-lg">
                <div className="w-14 h-14 rounded-full bg-zinc-200 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-zinc-600" />
                </div>
                <p className="text-foreground font-semibold mb-1">Conteúdo Exclusivo</p>
                <p className="text-muted-foreground text-sm">Assine para desbloquear</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section - Custom Built */}
        <div className="px-4 py-6 bg-zinc-50">
          <h3 className="text-2xl font-bold text-primary mb-4">Perguntas Frequentes</h3>
          
          <div className="flex flex-col gap-3">
            {faqItems.map((item, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl border-2 border-zinc-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-4 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-semibold text-foreground text-sm pr-4">{item.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} 
                  />
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4">
                    <p className="text-muted-foreground text-xs leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <div className="py-6 bg-white border-t">
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <button className="hover:text-primary">Termos de Uso</button>
            <span>|</span>
            <button className="hover:text-primary">Política de Privacidade</button>
          </div>
        </div>
      </div>
    </>
  )
}
