import { NextRequest, NextResponse } from 'next/server'

const SYNCPAY_BASE_URL = 'https://api.syncpayments.com.br'
const CLIENT_ID = process.env.SYNCPAY_CLIENT_ID!
const CLIENT_SECRET = process.env.SYNCPAY_CLIENT_SECRET!

interface TokenResponse {
  token: string
  expires_in?: number
}

interface PixResponse {
  id: string
  status: string
  qrcode: string
  qrcode_text: string
  pix_key?: string
  amount: number
  external_id: string
}

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${SYNCPAY_BASE_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[v0] SyncPay auth error:', error)
    throw new Error('Falha na autenticação com SyncPay')
  }

  const data: TokenResponse = await response.json()
  return data.token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, cpf, amount = 19.90 } = body

    if (!name || !email || !cpf) {
      return NextResponse.json(
        { error: 'Nome, email e CPF são obrigatórios' },
        { status: 400 }
      )
    }

    // Remove formatação do CPF
    const cleanCpf = cpf.replace(/\D/g, '')

    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { error: 'CPF inválido' },
        { status: 400 }
      )
    }

    // Obter token de acesso
    const accessToken = await getAccessToken()

    // Criar cobrança Pix
    const externalId = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const pixResponse = await fetch(`${SYNCPAY_BASE_URL}/transaction/pix/cashin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: amount,
        external_id: externalId,
        payer: {
          name: name,
          email: email,
          cpf: cleanCpf,
        },
        description: 'Assinatura VIP - Lana Alvarenga',
        expiration_minutes: 30,
      }),
    })

    if (!pixResponse.ok) {
      const error = await pixResponse.text()
      console.error('[v0] SyncPay pix error:', error)
      return NextResponse.json(
        { error: 'Falha ao criar cobrança Pix' },
        { status: 500 }
      )
    }

    const pixData: PixResponse = await pixResponse.json()

    return NextResponse.json({
      success: true,
      transactionId: pixData.id,
      externalId: externalId,
      qrCode: pixData.qrcode,
      qrCodeText: pixData.qrcode_text,
      amount: amount,
    })

  } catch (error) {
    console.error('[v0] Error creating pix charge:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
