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

    const { data, error } = await supabase
      .from('subscribers')
      .select('id, email, name, status, paid_at')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'paid')
      .single()

    if (error || !data) {
      return NextResponse.json({
        found: false,
        message: 'Email nao encontrado na base de assinantes.',
      })
    }

    return NextResponse.json({
      found: true,
      subscriber: {
        name: data.name,
        email: data.email,
        paidAt: data.paid_at,
      },
    })
  } catch (error) {
    console.error('[v0] Error in subscriber GET:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
