'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle, Check, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface SubscriberLoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const TITLE_TEXT = 'Acesse o conte\u00FAdo!'
const DESC_TEXT = 'Digite o E-mail que voc\u00EA utilizou na hora da compra para acessar.'
const BTN_TEXT = 'Acessar conte\u00FAdo!'
const ERROR_TEXT = 'E-mail n\u00E3o encontrado. Verifique se digitou o E-mail correto usado na compra.'
const VERIFIED_TITLE = 'Assinatura verificada!'
const VERIFIED_DESC = 'Redirecionando para o conte\u00FAdo...'

export function SubscriberLoginModal({ isOpen, onClose, onSuccess }: SubscriberLoginModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setEmail('')
      setError('')
      setVerified(false)
      setLoading(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/subscriber?email=${encodeURIComponent(email.trim())}`)
      const data = await response.json()

      if (data.found) {
        setVerified(true)
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } else {
        setError(ERROR_TEXT)
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <Card className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 transition-all duration-300 ease-out !border-0 ${
        isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
      }`}>
        <div className="bg-gradient-to-r from-primary to-orange-500 p-4 flex items-center justify-between -mt-px">
          <div className="flex items-center gap-2 text-white">
            <Mail className="w-5 h-5" />
            <span className="font-semibold">{'J\u00E1 sou assinante'}</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-5">
          {!verified ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className={`text-center transition-all duration-500 delay-100 ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <p className="text-lg font-bold text-foreground">{TITLE_TEXT}</p>
                <p className="text-sm text-muted-foreground mt-1">{DESC_TEXT}</p>
              </div>

              <div className={`transition-all duration-500 delay-200 ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className={`transition-all duration-500 delay-300 ${
                isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}>
                <Button
                  type="submit"
                  disabled={loading || !email.includes('@')}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : BTN_TEXT}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{VERIFIED_TITLE}</p>
                <p className="text-sm text-muted-foreground mt-1">{VERIFIED_DESC}</p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
