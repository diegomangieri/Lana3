import { NextRequest, NextResponse } from 'next/server'

const SYNCPAY_BASE_URL = 'https://api.syncpayments.com.br'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  expires_at: string
}

interface TransactionStatus {
  identifier: string
  status: string
  amount: number
  paid_at?: string
}

async function getAccessToken(): Promise<string> {
  const CLIENT_ID = process.env.SYNCPAY_CLIENT_ID
  const CLIENT_SECRET = process.env.SYNCPAY_CLIENT_SECRET

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Credenciais SyncPay nao configuradas')
  }

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

  if (!response.ok) {
    throw new Error('Falha na autenticacao com SyncPay')
  }

  const data: TokenResponse = await response.json()
  return data.access_token
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'ID da transação é obrigatório' },
        { status: 400 }
      )
    }

    const accessToken = await getAccessToken()

    const statusResponse = await fetch(
      `${SYNCPAY_BASE_URL}/api/partner/v1/transaction/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!statusResponse.ok) {
      const error = await statusResponse.text()
      return NextResponse.json(
        { error: 'Falha ao consultar status' },
        { status: 500 }
      )
    }

    const responseData = await statusResponse.json()

    // A resposta vem dentro de um objeto "data"
    const statusData = responseData.data || responseData

    // Status possiveis: pending, completed, expired, cancelled
    const isPaid = statusData.status === 'paid' || statusData.status === 'approved' || statusData.status === 'completed'

    return NextResponse.json({
      success: true,
      transactionId: statusData.reference_id || statusData.identifier,
      status: statusData.status,
      isPaid: isPaid,
      paidAt: statusData.transaction_date,
    })

  } catch (error) {
    console.error('[v0] Error checking pix status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
