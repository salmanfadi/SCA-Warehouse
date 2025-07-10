
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { customer_name, customer_email, customer_company, message, products } = await req.json()

    if (!customer_name || !customer_email || !products || !Array.isArray(products)) {
      return new Response(
        JSON.stringify({ status: 'error', error: 'Invalid input data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create the sales inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('sales_inquiries')
      .insert({
        customer_name,
        customer_email,
        customer_company,
        message,
        status: 'new'
      })
      .select()
      .single()

    if (inquiryError) {
      console.error('Inquiry creation error:', inquiryError)
      return new Response(
        JSON.stringify({ status: 'error', error: 'Failed to create inquiry' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Add inquiry items
    const inquiryItems = products.map((product: any) => ({
      inquiry_id: inquiry.id,
      product_id: product.productId,
      quantity: product.quantity,
      specific_requirements: product.requirements || null
    }))

    const { error: itemsError } = await supabase
      .from('sales_inquiry_items')
      .insert(inquiryItems)

    if (itemsError) {
      console.error('Inquiry items error:', itemsError)
      return new Response(
        JSON.stringify({ status: 'error', error: 'Failed to add inquiry items' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: 'Inquiry submitted successfully', 
        inquiry_id: inquiry.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Request error:', error.message)
    return new Response(
      JSON.stringify({ status: 'error', error: 'Server error processing request' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
