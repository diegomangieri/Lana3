'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Copy, Check, Loader2, QrCode, AlertCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import QRCodeLib from 'qrcode'

interface PixPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  amount?: number
}

type Step = 'form' | 'qrcode' | 'checking' | 'success'

interface FormData {
  name: string
  email: string
}

const BASE_AMOUNT = 29.90
const ORDER_BUMP_AMOUNT = 9.90
const SESSION_KEY = 'lana_pix_transaction'

interface SavedTransaction {
  step: Step
  qrCodeText: string
  transactionId: string
  finalAmount: number
  orderBumpSelected: boolean
  formData: FormData
  timestamp: number
}

function saveTransaction(data: SavedTransaction) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch {}
}

function loadTransaction(): SavedTransaction | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data: SavedTransaction = JSON.parse(raw)
    if (Date.now() - data.timestamp > 30 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return data
  } catch { return null }
}

function clearTransaction() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}

export function PixPaymentModal({ isOpen, onClose, onSuccess, amount = BASE_AMOUNT }: PixPaymentModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState<FormData>({ name: '', email: '' })
  const [orderBumpSelected, setOrderBumpSelected] = useState(false)
  const [qrCodeText, setQrCodeText] = useState<string>('')
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const [transactionId, setTransactionId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [checkingPayment, setCheckingPayment] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [finalAmount, setFinalAmount] = useState(amount)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [restoredFromSession, setRestoredFromSession] = useState(false)

  const totalAmount = orderBumpSelected ? amount + ORDER_BUMP_AMOUNT : amount

  // Restaurar transacao salva ao carregar a pagina
  useEffect(() => {
    const saved = loadTransaction()
    if (saved && (saved.step === 'qrcode' || saved.step === 'checking')) {
      setStep(saved.step)
      setQrCodeText(saved.qrCodeText)
      setTransactionId(saved.transactionId)
      setFinalAmount(saved.finalAmount)
      setOrderBumpSelected(saved.orderBumpSelected)
      setFormData(saved.formData)
      setRestoredFromSession(true)
    }
  }, [])

  // Trigger entrance animation
  useEffect(() => {
    if (isOpen || restoredFromSession) {
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
    }
  }, [isOpen, restoredFromSession])

  // Wake Lock -- manter tela ativa enquanto QR code esta exibido
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator && step === 'qrcode') {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        }
      } catch {}
    }
    requestWakeLock()
    return () => {
      wakeLockRef.current?.release()
      wakeLockRef.current = null
    }
  }, [step])

  // Aviso ao tentar fechar/recarregar durante pagamento
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (step === 'qrcode' || step === 'checking') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [step])

  // Criar cobranca Pix
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const chargeAmount = orderBumpSelected ? amount + ORDER_BUMP_AMOUNT : amount
    setFinalAmount(chargeAmount)

    try {
      const response = await fetch('/api/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          amount: chargeAmount,
        }),
      })

      const data = await response.json()
      console.log('[v0] CLIENT - create response:', JSON.stringify(data).substring(0, 500))
      console.log('[v0] CLIENT - qrCode:', data.qrCode ? data.qrCode.substring(0, 50) : 'EMPTY')
      console.log('[v0] CLIENT - qrCodeText:', data.qrCodeText ? data.qrCodeText.substring(0, 50) : 'EMPTY')
      console.log('[v0] CLIENT - transactionId:', data.transactionId)

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar cobranca')
      }

      if (!data.qrCodeText || data.qrCodeText.length === 0) {
        throw new Error('QR Code nao foi gerado. Tente novamente.')
      }

      setQrCodeText(data.qrCodeText)
      setTransactionId(data.transactionId)
      setStep('qrcode')

      // Salvar no sessionStorage para sobreviver a recarregamentos
      saveTransaction({
        step: 'qrcode',
        qrCodeText: data.qrCodeText,
        transactionId: data.transactionId,
        finalAmount: chargeAmount,
        orderBumpSelected,
        formData,
        timestamp: Date.now(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento')
    } finally {
      setLoading(false)
    }
  }

  // Copiar codigo Pix
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Erro ao copiar codigo')
    }
  }

  // Verificar status do pagamento
  const checkPaymentStatus = useCallback(async () => {
    if (!transactionId || checkingPayment) return

    try {
      console.log('[v0] CLIENT - polling status for:', transactionId)
      const response = await fetch(`/api/pix/status?transactionId=${transactionId}`)
      const data = await response.json()
      console.log('[v0] CLIENT - status response:', JSON.stringify(data))

      if (data.isPaid) {
        setStep('checking')
        setCheckingPayment(true)
        clearTransaction()

        // Salvar assinante no banco de dados
        try {
          await fetch('/api/subscriber', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email,
              name: formData.name,
              transactionId,
              amount: finalAmount,
            }),
          })
        } catch {}

        setTimeout(() => {
          setStep('success')
          onSuccess()
        }, 1500)
      }
    } catch {
      // Silently fail and retry on next poll
    }
  }, [transactionId, checkingPayment, onSuccess])

  // Re-adquirir Wake Lock e verificar pagamento quando volta ao site
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && step === 'qrcode') {
        navigator.wakeLock?.request('screen').then(lock => {
          wakeLockRef.current = lock
        }).catch(() => {})
        checkPaymentStatus()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [step, checkPaymentStatus])

  // Gerar QR Code quando tiver o texto
  useEffect(() => {
    if (step === 'qrcode' && qrCodeText && qrCanvasRef.current) {
      QRCodeLib.toCanvas(qrCanvasRef.current, qrCodeText, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
    }
  }, [step, qrCodeText])

  // Polling para verificar pagamento a cada 5s
  useEffect(() => {
    if (step !== 'qrcode' || !transactionId) return

    const interval = setInterval(checkPaymentStatus, 5000)
    return () => clearInterval(interval)
  }, [step, transactionId, checkPaymentStatus])

  // Bloquear scroll quando modal esta aberto
  useEffect(() => {
    if (isOpen || restoredFromSession) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, restoredFromSession])

  // Reset ao fechar (mas nao se foi restaurado do session)
  useEffect(() => {
    if (!isOpen && !restoredFromSession) {
      setStep('form')
      setFormData({ name: '', email: '' })
      setQrCodeText('')
      setTransactionId('')
      setError('')
      setCheckingPayment(false)
      setOrderBumpSelected(false)
      setFinalAmount(amount)
      clearTransaction()
    }
  }, [isOpen, amount, restoredFromSession])

  if (!isOpen && !restoredFromSession) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with fade */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={step === 'qrcode' ? undefined : onClose}
      />

      {/* Modal */}
      <Card className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto transition-all duration-300 ease-out !border-0 ${
        isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-orange-500 p-4 flex items-center justify-between -mt-px">
          <div className="flex items-center gap-2 text-white">
            <QrCode className="w-5 h-5" />
            <span className="font-semibold">Assinatura via Pix</span>
          </div>
          <button 
            onClick={() => {
              if (step === 'qrcode') {
                // Na tela do QR, nao fechar -- so minimizar? Ou avisar?
                if (confirm('Tem certeza? Se fechar, o pagamento pode nao ser confirmado.')) {
                  clearTransaction()
                  setRestoredFromSession(false)
                  onClose()
                }
              } else {
                onClose()
              }
            }}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-5">
          {/* Etapa 1: Formulario */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className={`text-center mb-1 transition-all duration-500 delay-100 ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totalAmount.toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {'Conte\u00fados VIP (Lana Alvarenga)'}
                  {orderBumpSelected && ' + Grupo WhatsApp'}
                </p>
              </div>

              <div className={`flex flex-col gap-1 transition-all duration-500 delay-150 ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Seu nome completo"
                />
              </div>

              <div className={`flex flex-col gap-1 transition-all duration-500 delay-200 ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              {/* Order Bump */}
              <div className={`transition-all duration-500 delay-300 ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <div className={`border-2 border-dashed rounded-xl overflow-hidden transition-all duration-300 ${
                  orderBumpSelected 
                    ? 'border-emerald-400 bg-emerald-50/50 shadow-md shadow-emerald-100' 
                    : 'border-amber-400 bg-amber-50/30'
                }`}>
                  <div className="p-4 pb-3">
                    <p className="font-bold text-foreground text-sm mb-3">
                      Grupo Exclusivo de WhatsApp
                    </p>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src="/images/whatsapp-logo.jpg"
                          alt="WhatsApp"
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                          priority
                        />
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">
                        {'Exclusividade total que n\u00e3o faz parte do conte\u00fado padr\u00e3o. Mais proximidade, sorteios e contato direto comigo! \ud83d\ude0c'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-base font-bold text-emerald-500">R$ 9,90</span>
                      <span className="text-xs text-zinc-400 line-through">R$ 49,90</span>
                      <span className="text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full ml-auto">
                        80%
                      </span>
                    </div>
                  </div>

                  <div className={`border-t border-dashed px-4 py-3 transition-colors duration-300 ${
                    orderBumpSelected ? 'border-emerald-400' : 'border-amber-300/60'
                  }`}>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={orderBumpSelected}
                          onChange={(e) => setOrderBumpSelected(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          orderBumpSelected 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : 'border-zinc-300 bg-white'
                        }`}>
                          {orderBumpSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        Quero comprar junto!
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || !formData.name || !formData.email.includes('@')}
                className={`w-full text-white font-semibold py-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 delay-[350ms] bg-emerald-500 hover:bg-emerald-600 ${
                  isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando Pix...
                  </>
                ) : (
                  <>
                    Gerar Pix (R$ {totalAmount.toFixed(2).replace('.', ',')})
                  </>
                )}
              </Button>

              <div className={`text-xs text-center text-muted-foreground flex flex-col items-center gap-0.5 transition-all duration-500 delay-[400ms] ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Pagamento 100% seguro
                </span>
                <span>{'Seus dados est\u00e3o protegidos.'}</span>
              </div>
            </form>
          )}

          {/* Etapa 2: QR Code */}
          {step === 'qrcode' && (
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{'Quase l\u00e1, amor! \ud83e\udd70'}</p>
                <p className="text-sm text-muted-foreground">{'Escaneie ou copie o c\u00f3digo abaixo.'}</p>
              </div>

              <div className="bg-white p-4 rounded-xl border-2 border-zinc-200">
                <canvas 
                  ref={qrCanvasRef}
                  className="w-48 h-48"
                />
              </div>

              <div className="w-full">
                <p className="text-xs text-muted-foreground mb-2 text-center">Pix Copia e Cola:</p>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={qrCodeText}
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-mono truncate"
                  />
                  <button
                    onClick={handleCopy}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-zinc-200 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                onClick={handleCopy}
                variant="outline"
                className="w-full font-semibold py-5"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-emerald-500" />
                    {'Copiado!'}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {'Copiar c\u00f3digo Pix'}
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aguardando pagamento...</span>
              </div>

              <p className="text-xs text-center text-muted-foreground -mt-1">
                {'Ap\u00f3s pagar, volte para o site. O seu acesso ser\u00e1 liberado automaticamente.'}
              </p>
            </div>
          )}

          {/* Etapa 3: Verificando */}
          {step === 'checking' && (
            <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">Pagamento Confirmado!</p>
                <p className="text-sm text-muted-foreground">Processando...</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {/* Etapa 4: Sucesso */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-6 py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">Pagamento Confirmado!</p>
                <p className="text-sm text-muted-foreground mt-2">{'Sua assinatura VIP foi ativada.'}</p>
              </div>
              <Button 
                onClick={() => window.open('https://chat.whatsapp.com/Ia25ACVCPkq4cMbeWCxwYx?mode=gi_t', '_blank')}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-lg"
              >
                {'Acessar conte\u00fado!'}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
