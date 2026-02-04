import { NextRequest, NextResponse } from 'next/server'

const SYNCPAY_BASE_URL = 'https://api.syncpayments.com.br'

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
  const CLIENT_ID = process.env.SYNCPAY_CLIENT_ID
  const CLIENT_SECRET = process.env.SYNCPAY_CLIENT_SECRET

  console.log('[v0] Checking credentials - CLIENT_ID exists:', !!CLIENT_ID, '- CLIENT_SECRET exists:', !!CLIENT_SECRET)

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Credenciais SyncPay não configuradas. Configure SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET.')
  }

  console.log('[v0] Attempting auth with SyncPay...')
  
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

  console.log('[v0] SyncPay auth response status:', response.status)

  if (!response.ok) {
    const error = await response.text()
    console.error('[v0] SyncPay auth error:', error)
    throw new Error(`Falha na autenticação com SyncPay: ${response.status}`)
  }

  const data: TokenResponse = await response.json()
  console.log('[v0] SyncPay auth successful, token received')
  return data.token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, amount = 19.90 } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email são obrigatórios' },
        { status: 400 }
      )
    }

    // Obter token de acesso
    const accessToken = await getAccessToken()

    // Criar cobrança Pix
    const externalId = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    console.log('[v0] Creating PIX charge for:', { name, email, amount, externalId })
    
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
        },
        description: 'Assinatura VIP - Lana Alvarenga',
        expiration_minutes: 30,
      }),
    })

    console.log('[v0] PIX creation response status:', pixResponse.status)

    if (!pixResponse.ok) {
      const error = await pixResponse.text()
      console.error('[v0] SyncPay pix error:', pixResponse.status, error)
      return NextResponse.json(
        { error: `Falha ao criar cobrança Pix: ${pixResponse.status}` },
        { status: 500 }
      )
    }

    const pixData: PixResponse = await pixResponse.json()
    console.log('[v0] PIX charge created successfully:', { id: pixData.id, status: pixData.status })

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
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
