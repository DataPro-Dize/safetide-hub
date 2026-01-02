import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string
  name: string
  phone?: string
  role: 'technician' | 'supervisor' | 'admin'
  groupId?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header to verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Client to verify the requesting user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    })

    // Admin client for creating users (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // Verify the requesting user is authenticated and is an admin
    const { data: { user: requestingUser }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requesting user has admin role
    const { data: adminRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError) {
      console.error('Error checking admin role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!adminRole) {
      console.error('User is not an admin:', requestingUser.id)
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { email, name, phone, role, groupId }: CreateUserRequest = await req.json()

    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, name, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating user:', { email, name, role, groupId })

    // Generate secure temporary password
    const tempPassword = crypto.randomUUID() + crypto.randomUUID()

    // Create user using Admin API (doesn't affect the requesting user's session)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: name.trim() }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = newUser.user.id
    console.log('User created with ID:', userId)

    // Update profile with additional data (using admin client to bypass RLS)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name: name.trim(),
        phone: phone || null,
        role: role,
        is_admin: role === 'admin',
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      // Don't fail the whole operation, profile was created by trigger
    }

    // Insert role into user_roles table
    const appRole = role === 'admin' ? 'admin' : role === 'supervisor' ? 'moderator' : 'user'
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: appRole
      })

    if (roleInsertError) {
      console.error('Error inserting user role:', roleInsertError)
    } else {
      console.log('User role inserted:', appRole)
    }

    // Link user to ALL companies of the group if groupId provided
    if (groupId) {
      // Get ALL companies of the group (not just the first one)
      const { data: companies, error: companiesError } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('group_id', groupId)

      if (companiesError) {
        console.error('Error fetching companies:', companiesError)
      } else if (companies && companies.length > 0) {
        // Create user_companies entries for ALL companies in the group
        const userCompaniesData = companies.map(company => ({
          user_id: userId,
          company_id: company.id,
        }))

        const { error: linkError } = await supabaseAdmin
          .from('user_companies')
          .insert(userCompaniesData)

        if (linkError) {
          console.error('Error linking user to companies:', linkError)
        } else {
          console.log('User linked to all companies:', companies.map(c => c.id))
        }
      } else {
        console.log('No companies found for group:', groupId)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: 'User created successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
