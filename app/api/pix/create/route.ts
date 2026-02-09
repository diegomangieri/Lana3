import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const { name, email, amount = 29.90 } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nome e email sao obrigatorios' },
        { status: 400 }
      )
    }

    const authorization = getRokifyAuthHeader()
    const externalId = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const amountInCents = Math.round(amount * 100)

    const rokifyPayload = {
      amount: amountInCents,
      paymentMethod: 'PIX',
      customer: {
        name: name,
        email: email,
      },
      externalRef: externalId,
    }

    console.log('[v0] CREATE - Sending payload:', JSON.stringify(rokifyPayload))

    const pixResponse = await fetch(`${ROKIFY_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authorization,
      },
      body: JSON.stringify(rokifyPayload),
    })

    const rawText = await pixResponse.text()
    console.log('[v0] CREATE - Raw response (first 2000 chars):', rawText.substring(0, 2000))

    let pixData
    try {
      pixData = JSON.parse(rawText)
    } catch {
      console.error('[v0] CREATE - Failed to parse JSON')
      return NextResponse.json(
        { error: 'Resposta invalida da Rokify' },
        { status: 500 }
      )
    }

    console.log('[v0] CREATE - status:', pixResponse.status, 'txStatus:', pixData.status, 'id:', pixData.id)

    if (!pixResponse.ok || pixData.status === 'refused') {
      console.error('[v0] CREATE - Refused:', JSON.stringify(pixData.refusedReason))
      return NextResponse.json(
        { error: 'Falha ao criar cobranca Pix. Tente novamente.' },
        { status: 500 }
      )
    }

    // Log every field inside pix object
    const pixInfo = pixData.pix
    if (pixInfo && typeof pixInfo === 'object') {
      const keys = Object.keys(pixInfo)
      console.log('[v0] CREATE - pix keys:', keys.join(', '))
      for (const key of keys) {
        const val = typeof pixInfo[key] === 'string' ? pixInfo[key].substring(0, 200) : JSON.stringify(pixInfo[key])
        console.log(`[v0] CREATE - pix.${key}:`, val)
      }
    } else {
      console.log('[v0] CREATE - pix field is:', typeof pixInfo, JSON.stringify(pixInfo))
    }

    // Try all possible field names for the QR code string
    const p = pixInfo || {}
    const qrCodeText =
      p.qrcode || p.qr_code || p.qrCode ||
      p.copiaECola || p.copy_paste || p.copyPaste ||
      p.emv || p.payload || p.brcode || p.code ||
      p.text || p.pixCode || p.pix_code ||
      pixData.qrCode || pixData.qrcode || pixData.pixCode || pixData.pix_code || ''

    console.log('[v0] CREATE - Extracted qrCodeText length:', qrCodeText.length, 'starts with:', qrCodeText.substring(0, 40))

    const txId = pixData.id || pixData.identifier

    // Salvar no Supabase com status pending na hora da criacao
    try {
      const supabase = createAdminClient()
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (existing) {
        await supabase
          .from('subscribers')
          .update({
            name: name || null,
            transaction_id: txId,
            amount: amount || 0,
            status: 'pending',
          })
          .eq('email', email.toLowerCase().trim())
      } else {
        await supabase
          .from('subscribers')
          .insert({
            email: email.toLowerCase().trim(),
            name: name || null,
            transaction_id: txId,
            amount: amount || 0,
            status: 'pending',
          })
      }
    } catch (dbErr) {
      console.error('[v0] CREATE - Error saving pending subscriber:', dbErr)
    }

    return NextResponse.json({
      success: true,
      transactionId: txId,
      externalId: externalId,
      qrCode: qrCodeText,
      qrCodeText: qrCodeText,
      amount: amount,
    })

  } catch (error) {
    console.error('[v0] CREATE - Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
