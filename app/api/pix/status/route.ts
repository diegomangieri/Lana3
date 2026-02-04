import { NextRequest, NextResponse } from 'next/server'

const SYNCPAY_BASE_URL = 'https://api.syncpayments.com.br'
const CLIENT_ID = process.env.SYNCPAY_CLIENT_ID!
const CLIENT_SECRET = process.env.SYNCPAY_CLIENT_SECRET!

interface TokenResponse {
  token: string
}

interface TransactionStatus {
  id: string
  status: string
  amount: number
  paid_at?: string
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
    throw new Error('Falha na autenticação com SyncPay')
  }

  const data: TokenResponse = await response.json()
  return data.token
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
      `${SYNCPAY_BASE_URL}/transaction/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!statusResponse.ok) {
      const error = await statusResponse.text()
      console.error('[v0] SyncPay status error:', error)
      return NextResponse.json(
        { error: 'Falha ao consultar status' },
        { status: 500 }
      )
    }

    const statusData: TransactionStatus = await statusResponse.json()

    // Status possíveis: pending, paid, expired, cancelled
    const isPaid = statusData.status === 'paid' || statusData.status === 'approved'

    return NextResponse.json({
      success: true,
      transactionId: statusData.id,
      status: statusData.status,
      isPaid: isPaid,
      paidAt: statusData.paid_at,
    })

  } catch (error) {
    console.error('[v0] Error checking pix status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
