'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Copy, Check, Loader2, QrCode, AlertCircle, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
  cpf: string
}

export function PixPaymentModal({ isOpen, onClose, onSuccess, amount = 19.90 }: PixPaymentModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', cpf: '' })
  const [qrCodeText, setQrCodeText] = useState<string>('')
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const [transactionId, setTransactionId] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [checkingPayment, setCheckingPayment] = useState(false)

  // Criar cobrança Pix
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          cpf: formData.cpf.replace(/\D/g, ''),
          amount: amount,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar cobrança')
      }

      setQrCodeText(data.qrCodeText)
      setTransactionId(data.transactionId)
      setStep('qrcode')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pagamento')
    } finally {
      setLoading(false)
    }
  }

  // Copiar código Pix
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Erro ao copiar código')
    }
  }

  // Verificar status do pagamento
  const checkPaymentStatus = useCallback(async () => {
    if (!transactionId || checkingPayment) return

    try {
      const response = await fetch(`/api/pix/status?transactionId=${transactionId}`)
      const data = await response.json()

      if (data.isPaid) {
        setStep('checking')
        setCheckingPayment(true)
        setTimeout(() => {
          setStep('success')
          onSuccess()
        }, 1500)
      }
    } catch {
      // Silently fail and retry on next poll
    }
  }, [transactionId, checkingPayment, onSuccess])

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

  // Polling para verificar pagamento
  useEffect(() => {
    if (step !== 'qrcode' || !transactionId) return

    const interval = setInterval(checkPaymentStatus, 5000)
    return () => clearInterval(interval)
  }, [step, transactionId, checkPaymentStatus])

  // Bloquear scroll quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset ao fechar
  useEffect(() => {
    if (!isOpen) {
      setStep('form')
      setFormData({ name: '', email: '', cpf: '' })
      setQrCodeText('')
      setTransactionId('')
      setError('')
      setCheckingPayment(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <QrCode className="w-5 h-5" />
            <span className="font-semibold">Assinatura via Pix</span>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Etapa 1: Formulário */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="text-center mb-2">
                <p className="text-2xl font-bold text-foreground">R$ {amount.toFixed(2).replace('.', ',')}</p>
                <p className="text-sm text-muted-foreground">Conteúdos VIP (Lana Alvarenga)</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Nome completo</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Seu nome"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">CPF</label>
                <input
                  type="text"
                  required
                  value={formData.cpf}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    const formatted = value
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                      .replace(/(-\d{2})\d+?$/, '$1')
                    setFormData({ ...formData, cpf: formatted })
                  }}
                  maxLength={14}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="000.000.000-00"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading || !formData.name || !formData.email || formData.cpf.length < 14}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando Pix...
                  </>
                ) : (
                  'Gerar QR Code Pix'
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" />
                Pagamento 100% seguro
              </p>
            </form>
          )}

          {/* Etapa 2: QR Code */}
          {step === 'qrcode' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">R$ {amount.toFixed(2).replace('.', ',')}</p>
                <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o código</p>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl border-2 border-zinc-200">
                <canvas 
                  ref={qrCanvasRef}
                  className="w-48 h-48"
                />
              </div>

              {/* Código Pix */}
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
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar código Pix
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aguardando pagamento...</span>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                O QR Code expira em 30 minutos!
              </p>
            </div>
          )}

          {/* Etapa 3: Verificando */}
          {step === 'checking' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground">Processando...</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {/* Etapa 4: Sucesso */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground mt-2">Sua assinatura foi ativada com sucesso.</p>
              </div>
              <Button 
                onClick={() => window.open('https://google.com', '_blank')}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-lg"
              >
                Acesse o conteudo!
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
