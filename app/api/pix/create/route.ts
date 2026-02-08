import { NextRequest, NextResponse } from 'next/server'

const SYNCPAY_BASE_URL = 'https://api.syncpayments.com.br'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  expires_at: string
}

interface PixResponse {
  message: string
  pix_code: string
  identifier: string
}

async function getAccessToken(): Promise<string> {
  const CLIENT_ID = process.env.SYNCPAY_CLIENT_ID
  const CLIENT_SECRET = process.env.SYNCPAY_CLIENT_SECRET

  console.log('[v0] Checking credentials - CLIENT_ID exists:', !!CLIENT_ID, '- CLIENT_SECRET exists:', !!CLIENT_SECRET)

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Credenciais SyncPay não configuradas. Configure SYNCPAY_CLIENT_ID e SYNCPAY_CLIENT_SECRET.')
  }

  console.log('[v0] Attempting auth with SyncPay...')
  
  const response = await fetch(`${SYNCPAY_BASE_URL}/api/partner/v1/auth-token`, {
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
  return data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, cpf, amount = 29.90 } = body

    if (!name || !email || !cpf) {
      return NextResponse.json(
        { error: 'Nome, email e CPF são obrigatórios' },
        { status: 400 }
      )
    }

    // Obter token de acesso
    const accessToken = await getAccessToken()

    // Criar cobrança Pix
    const externalId = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    console.log('[v0] Creating PIX charge for:', { name, email, amount, externalId })
    
    const pixResponse = await fetch(`${SYNCPAY_BASE_URL}/api/partner/v1/cash-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: amount,
        description: 'Assinatura VIP - Lana Alvarenga',
        client: {
          name: name,
          cpf: cpf,
          email: email,
        },
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
    console.log('[v0] PIX charge created successfully:', { identifier: pixData.identifier, message: pixData.message })

    return NextResponse.json({
      success: true,
      transactionId: pixData.identifier,
      externalId: externalId,
      qrCode: pixData.pix_code,
      qrCodeText: pixData.pix_code,
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
