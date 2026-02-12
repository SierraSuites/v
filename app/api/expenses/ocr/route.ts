// API Route: Receipt OCR Processing
// POST /api/expenses/ocr
// Processes receipt images using AI OCR to extract vendor, amount, date, and category

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile with company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', user.id)
      .eq('company_id', profile.company_id)
      .single()

    const hasPermission = permissions?.permissions?.canManageFinances || false

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden - requires canManageFinances permission' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('receipt') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No receipt file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be an image or PDF' },
        { status: 400 }
      )
    }

    // Convert file to base64 for API processing
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    // TODO: Integrate with OCR service (Google Vision API, Textract, Tesseract, etc.)
    // For now, we'll simulate OCR processing with mock data
    //
    // Example integration with Google Cloud Vision API:
    /*
    import { ImageAnnotatorClient } from '@google-cloud/vision'
    const client = new ImageAnnotatorClient()

    const [result] = await client.textDetection({
      image: { content: base64 }
    })

    const detections = result.textAnnotations
    const text = detections?.[0]?.description || ''

    // Parse text to extract vendor, amount, date, etc.
    const vendor = extractVendor(text)
    const amount = extractAmount(text)
    const date = extractDate(text)
    const category = inferCategory(vendor, text)
    */

    // Mock OCR response (replace with actual OCR implementation)
    const mockOCRResult = {
      vendor: file.name.includes('depot') ? 'Home Depot' :
              file.name.includes('lowes') ? 'Lowes' :
              'Unknown Vendor',
      amount: Math.random() * 500 + 50, // Random amount between 50-550
      date: new Date().toISOString().split('T')[0],
      tax: Math.random() * 20 + 5,
      category: 'materials', // Infer based on vendor
      line_items: [
        {
          description: 'Item 1',
          amount: Math.random() * 100
        },
        {
          description: 'Item 2',
          amount: Math.random() * 100
        }
      ],
      confidence: 0.85 + Math.random() * 0.15 // 85-100%
    }

    console.log('📄 OCR Processing:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      result: mockOCRResult
    })

    return NextResponse.json(mockOCRResult)
  } catch (error: any) {
    console.error('OCR processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process receipt', details: error.message },
      { status: 500 }
    )
  }
}
