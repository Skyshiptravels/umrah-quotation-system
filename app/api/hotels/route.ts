import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import jwt from 'jsonwebtoken'

// Auth helper
function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return {
      userId: decoded.sub,
      orgId: decoded.org,
      email: decoded.email,
      role: decoded.role,
    }
  } catch (error) {
    return null
  }
}

// GET - List hotels
export async function GET(request: NextRequest) {
  try {
    const auth = getAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const city = request.nextUrl.searchParams.get('city')
    const tier = request.nextUrl.searchParams.get('tier')

    let query = supabaseAdmin
      .from('hotels')
      .select('*')
      .eq('organization_id', auth.orgId)

    if (city) query = query.eq('city', city)
    if (tier) query = query.eq('tier', tier)

    const { data: hotels, error } = await query

    if (error) {
      console.error('Hotels GET error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch hotels' },
        { status: 500 }
      )
    }

    return NextResponse.json({ hotels: hotels || [] })
  } catch (error) {
    console.error('Hotels GET exception:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}

// POST - Create hotel
export async function POST(request: NextRequest) {
  try {
    const auth = getAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, city, tier } = body

    // Validation
    if (!name || !city || !tier) {
      return NextResponse.json(
        { error: 'Missing required fields: name, city, tier' },
        { status: 400 }
      )
    }

    if (!['makkah', 'madinah'].includes(city)) {
      return NextResponse.json(
        { error: 'City must be makkah or madinah' },
        { status: 400 }
      )
    }

    if (!['economy', 'standard', 'luxury'].includes(tier)) {
      return NextResponse.json(
        { error: 'Tier must be economy, standard, or luxury' },
        { status: 400 }
      )
    }

    // Create hotel
    const { data: hotel, error } = await supabaseAdmin
      .from('hotels')
      .insert([
        {
          organization_id: auth.orgId,
          name: name,
          city: city,
          tier: tier,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Hotels POST error:', error)
      return NextResponse.json(
        { error: 'Failed to create hotel' },
        { status: 500 }
      )
    }

    return NextResponse.json(hotel, { status: 201 })
  } catch (error) {
    console.error('Hotels POST exception:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}