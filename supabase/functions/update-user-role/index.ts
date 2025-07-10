import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

console.log('Edge Function: update-user-role loaded')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '')
    console.log('Token length:', token.length)
    
    // Verify the JWT token and get user
    const { data: { user: adminUser }, error: jwtError } = await supabaseAdmin.auth.getUser(token)
    console.log('JWT verification:', jwtError ? 'Failed' : 'Success')
    console.log('Admin user:', adminUser ? 'Found' : 'Not found')
    
    if (jwtError || !adminUser) {
      console.error('JWT Error:', jwtError)
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication token',
        details: jwtError?.message
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Get the request body
    const { userId, role } = await req.json()
    console.log('Request body:', { userId, role })

    // Get the admin's role from profiles
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    console.log('Admin profile check:', {
      success: !adminProfileError,
      role: adminProfile?.role,
      userId: adminUser.id
    })

    if (adminProfileError || adminProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - Admin access required',
        details: adminProfileError ? adminProfileError.message : 'User is not an admin',
        userRole: adminProfile?.role
      }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // Update the user's metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { role } }
    )

    console.log('Update result:', updateError ? 'Failed' : 'Success')

    if (updateError) {
      return new Response(JSON.stringify({ 
        error: updateError.message,
        details: 'Failed to update user metadata'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      type: error.constructor.name,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}) 