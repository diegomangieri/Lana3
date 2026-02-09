import { NextRequest, NextResponse } from 'next/server'

const ROKIFY_BASE_URL = 'https://api.rokify.com.br/functions/v1'

function getRokifyAuthHeader(): string {
  const secretKey = process.env.ROKIFY_SECRET_KEY
  const companyId = process.env.ROKIFY_COMPANY_ID

  if (!secretKey || !companyId) {
    throw new Error('Credenciais Rokify nao configuradas. Configure ROKIFY_SECRET_KEY e ROKIFY_COMPANY_ID.')
  }

  const credentials = Buffer.from(`${secretKey}:${companyId}`).toString('base64')
  return `Basic ${credentials}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, cpf, amount = 19.90 } = body

    if (!name || !email || !cpf) {
      return NextResponse.json(
        { error: 'Nome, email e CPF sao obrigatorios' },
        { status: 400 }
      )
    }

    const authorization = getRokifyAuthHeader()

    const externalId = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const pixResponse = await fetch(`${ROKIFY_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
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

    if (!pixResponse.ok) {
      const error = await pixResponse.text()
      console.error('[v0] Rokify pix error:', pixResponse.status, error)
      return NextResponse.json(
        { error: `Falha ao criar cobranca Pix: ${pixResponse.status}` },
        { status: 500 }
      )
    }

    const pixData = await pixResponse.json()

    return NextResponse.json({
      success: true,
      transactionId: pixData.identifier || pixData.id,
      externalId: externalId,
      qrCode: pixData.pix_code || pixData.qr_code,
      qrCodeText: pixData.pix_code || pixData.qr_code,
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
