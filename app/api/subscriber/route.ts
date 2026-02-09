import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// POST - salvar assinante apos pagamento confirmado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, transactionId, amount } = body

    if (!email || !transactionId) {
      return NextResponse.json(
        { error: 'Email e transactionId obrigatorios' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verificar se ja existe esse email
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      // Atualizar se ja existe
      await supabase
        .from('subscribers')
        .update({
          name: name || null,
          transaction_id: transactionId,
          amount: amount || 0,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('email', email.toLowerCase().trim())
    } else {
      // Inserir novo
      const { error } = await supabase
        .from('subscribers')
        .insert({
          email: email.toLowerCase().trim(),
          name: name || null,
          transaction_id: transactionId,
          amount: amount || 0,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })

      if (error) {
        console.error('[v0] Error saving subscriber:', error)
        return NextResponse.json(
          { error: 'Erro ao salvar assinante' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error in subscriber POST:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

const ROKIFY_BASE_URL = 'https://api.rokify.com.br/functions/v1'

function getRokifyAuthHeader(): string {
  const secretKey = process.env.ROKIFY_SECRET_KEY
  const companyId = process.env.ROKIFY_COMPANY_ID
  if (!secretKey || !companyId) return ''
  const credentials = Buffer.from(`${secretKey}:${companyId}`).toString('base64')
  return `Basic ${credentials}`
}

// GET - verificar se email ja pagou
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email obrigatorio' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Primeiro verificar se ja esta marcado como paid
    const { data: paidData } = await supabase
      .from('subscribers')
      .select('id, email, name, status, paid_at, transaction_id')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'paid')
      .single()

    if (paidData) {
      return NextResponse.json({
        found: true,
        subscriber: {
          name: paidData.name,
          email: paidData.email,
          paidAt: paidData.paid_at,
        },
      })
    }

    // Se nao esta paid, verificar se existe com status pending e checar na Rokify
    const { data: pendingData } = await supabase
      .from('subscribers')
      .select('id, email, name, status, transaction_id')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .single()

    if (pendingData && pendingData.transaction_id) {
      // Verificar na Rokify se o pagamento foi feito
      const authorization = getRokifyAuthHeader()
      if (authorization) {
        try {
          const statusResponse = await fetch(
            `${ROKIFY_BASE_URL}/transactions/${pendingData.transaction_id}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Authorization': authorization,
              },
            }
          )

          if (statusResponse.ok) {
            const txData = await statusResponse.json()
            const statusData = txData.data || txData
            const isPaid = statusData.status === 'paid' || statusData.status === 'approved' || statusData.status === 'completed'

            if (isPaid) {
              // Atualizar no banco
              await supabase
                .from('subscribers')
                .update({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                })
                .eq('id', pendingData.id)

              return NextResponse.json({
                found: true,
                subscriber: {
                  name: pendingData.name,
                  email: pendingData.email,
                  paidAt: new Date().toISOString(),
                },
              })
            }
          }
        } catch (rokifyErr) {
          console.error('[v0] SUBSCRIBER GET - Rokify check error:', rokifyErr)
        }
      }
    }

    return NextResponse.json({
      found: false,
      message: 'Email nao encontrado na base de assinantes.',
    })
  } catch (error) {
    console.error('[v0] Error in subscriber GET:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
