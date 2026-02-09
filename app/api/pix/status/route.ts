import { NextRequest, NextResponse } from 'next/server'

const ROKIFY_BASE_URL = 'https://api.rokify.com.br/functions/v1'

function getRokifyAuthHeader(): string {
  const secretKey = process.env.ROKIFY_SECRET_KEY
  const companyId = process.env.ROKIFY_COMPANY_ID

  if (!secretKey || !companyId) {
    throw new Error('Credenciais Rokify n\u00e3o configuradas')
  }

  const credentials = Buffer.from(`${secretKey}:${companyId}`).toString('base64')
  return `Basic ${credentials}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return NextResponse.json(
        { error: 'ID da transa\u00e7\u00e3o \u00e9 obrigat\u00f3rio' },
        { status: 400 }
      )
    }

    const authorization = getRokifyAuthHeader()

    const statusResponse = await fetch(
      `${ROKIFY_BASE_URL}/transactions/${transactionId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': authorization,
        },
      }
    )

    if (!statusResponse.ok) {
      const error = await statusResponse.text()
      console.error('[v0] Rokify status error:', statusResponse.status, error)
      return NextResponse.json(
        { error: 'Falha ao consultar status' },
        { status: 500 }
      )
    }

    const responseData = await statusResponse.json()

    const statusData = responseData.data || responseData

    // Status possiveis: pending, completed, expired, cancelled, paid, approved
    const isPaid = statusData.status === 'paid' || statusData.status === 'approved' || statusData.status === 'completed'

    return NextResponse.json({
      success: true,
      transactionId: statusData.reference_id || statusData.identifier || statusData.id,
      status: statusData.status,
      isPaid: isPaid,
      paidAt: statusData.paid_at || statusData.transaction_date,
    })

  } catch (error) {
    console.error('[v0] Error checking pix status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
