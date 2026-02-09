import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const rawText = await statusResponse.text()
    console.log('[v0] STATUS - Raw response:', rawText.substring(0, 1000))

    if (!statusResponse.ok) {
      console.error('[v0] STATUS - Error:', statusResponse.status)
      return NextResponse.json(
        { error: 'Falha ao consultar status' },
        { status: 500 }
      )
    }

    let responseData
    try {
      responseData = JSON.parse(rawText)
    } catch {
      return NextResponse.json(
        { error: 'Resposta invalida da Rokify' },
        { status: 500 }
      )
    }

    const statusData = responseData.data || responseData
    console.log('[v0] STATUS - txStatus:', statusData.status, 'paidAt:', statusData.paidAt)

    // Rokify usa "paid" quando o pix foi confirmado, "waiting_payment" quando pendente
    const isPaid = statusData.status === 'paid' || statusData.status === 'approved' || statusData.status === 'completed'

    // Se pagou, atualizar status no Supabase
    if (isPaid) {
      try {
        const supabase = createAdminClient()
        await supabase
          .from('subscribers')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          })
          .eq('transaction_id', transactionId)
      } catch (dbErr) {
        console.error('[v0] STATUS - Error updating subscriber to paid:', dbErr)
      }
    }

    return NextResponse.json({
      success: true,
      transactionId: statusData.id || statusData.reference_id || statusData.identifier,
      status: statusData.status,
      isPaid: isPaid,
      paidAt: statusData.paidAt || statusData.paid_at || statusData.transaction_date,
    })

  } catch (error) {
    console.error('[v0] Error checking pix status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
