import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import jwt from 'jsonwebtoken'

function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as any
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = request.nextUrl.searchParams.get('status') || 'draft'
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const { data: quotations, error } = await supabaseAdmin
      .from('quotations')
      .select('*')
      .eq('organization_id', auth.org)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Quotations GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    return NextResponse.json({
      quotations: quotations || [],
      page,
      limit,
      total: quotations?.length || 0,
    })
  } catch (error) {
    console.error('Quotations GET exception:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientName,
      clientEmail,
      adults,
      childrenWithBed,
      childrenWithoutBed,
      infants,
      ticketRateAdult,
      ticketRateChild,
      ticketRateInfant,
      visaCategoryId,
      stays,
      transport,
      status = 'draft',
    } = body

    // Simple calculation
    const totalPax = adults + childrenWithBed + childrenWithoutBed + infants
    const ticketCost =
      adults * ticketRateAdult +
      (childrenWithBed + childrenWithoutBed) * ticketRateChild +
      infants * ticketRateInfant

    const visaCost = (adults + childrenWithBed + childrenWithoutBed) * 2500 // SAR per person
    const stayCost = stays.reduce((sum: number, stay: any) => sum + (stay.cost || 0), 0)
    const transportCost = transport?.cost || 5000

    const subtotal = visaCost + stayCost + transportCost
    const profit = Math.floor(subtotal * 0.15) // 15% profit margin (PKR column stores calculated profit)
    const totalSAR = subtotal + profit
    const totalPkr = Math.floor(totalSAR * 28) // SAR to PKR
    const perPersonPkr = totalPax > 0 ? Math.floor(totalPkr / totalPax) : 0

    const paxAdults = Math.floor(Number(adults) || 0)
    const paxChildren = Math.floor(
      (Number(childrenWithBed) || 0) + (Number(childrenWithoutBed) || 0)
    )
    const paxInfants = Math.floor(Number(infants) || 0)
    const totalSar = Math.floor(subtotal)
    const profitPkr = profit

    // Create quotation
    const quotationNumber = `ST-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`

    const { data: quotation, error } = await supabaseAdmin
      .from('quotations')
      .insert([
        {
          organization_id: auth.org,
          created_by_user_id: auth.sub,
          quotation_number: quotationNumber,
          client_name: clientName,
          client_email: clientEmail ?? null,
          client_phone: clientEmail || '',
          pax_adults: paxAdults,
          pax_children: paxChildren,
          pax_infants: paxInfants,
          total_pax: totalPax,
          total_sar: totalSar,
          total_pkr: totalPkr,
          per_person_pkr: perPersonPkr,
          profit_pkr: profitPkr,
          visa_category_id: null,
          status: status,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Quotations POST error:', error)
      return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }

    return NextResponse.json(
      {
        quotationId: quotation.id,
        quotationNumber: quotation.quotation_number,
        totalPkr: quotation.total_pkr,
        perPersonPkr: quotation.per_person_pkr,
        breakdown: {
          visaCost,
          ticketCost,
          stayCost,
          transportCost,
          subtotal,
          profit,
          totalPkr,
          perPerson: perPersonPkr,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Quotations POST exception:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}