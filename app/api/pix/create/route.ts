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
    const { name, email, amount = 19.90 } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email sao obrigatorios' },
        { status: 400 }
      )
    }

    const authorization = getRokifyAuthHeader()

    const externalId = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Rokify espera amount em centavos e paymentMethod explícito
    const amountInCents = Math.round(amount * 100)

    const rokifyPayload = {
      amount: amountInCents,
      paymentMethod: 'pix',
      customer: {
        name: name,
        email: email,
      },
      externalRef: externalId,
    }

    console.log('[v0] Sending to Rokify:', JSON.stringify(rokifyPayload))

    const pixResponse = await fetch(`${ROKIFY_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify(rokifyPayload),
    })

    const pixData = await pixResponse.json()
    console.log('[v0] Rokify full response:', JSON.stringify(pixData, null, 2))
    console.log('[v0] Rokify pix field:', JSON.stringify(pixData.pix, null, 2))

    if (!pixResponse.ok || pixData.status === 'refused') {
      console.error('[v0] Rokify pix error:', pixResponse.status, JSON.stringify(pixData))
      return NextResponse.json(
        { error: `Falha ao criar cobranca Pix: ${pixResponse.status}` },
        { status: 500 }
      )
    }

    // Extrair QR code da resposta da Rokify - verificar todos os campos possiveis
    const pixInfo = pixData.pix || {}
    const qrCode = pixInfo.qrcode || pixInfo.qr_code || pixInfo.qrCode || pixData.pixCode || pixData.qrCode || pixData.pix_code || pixData.qr_code || ''
    const qrCodeText = pixInfo.copiaECola || pixInfo.copy_paste || pixInfo.copyPaste || pixInfo.emv || pixData.pixCopyPaste || pixData.qrCodeText || qrCode

    console.log('[v0] Extracted QR code:', qrCode ? 'found' : 'NOT FOUND')
    console.log('[v0] Extracted QR text:', qrCodeText ? qrCodeText.substring(0, 50) + '...' : 'NOT FOUND')

    return NextResponse.json({
      success: true,
      transactionId: pixData.id || pixData.identifier,
      externalId: externalId,
      qrCode: qrCode,
      qrCodeText: qrCodeText,
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
