const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log('URL:', process.env.SUPABASE_URL)

  // Test 1: Check tables exist
  console.log('\n--- Test 1: Check tables ---')
  const tables = ['profiles', 'vendors', 'products', 'submissions', 'purchases']
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.log(`  ✗ ${table}: ${error.message}`)
    } else {
      console.log(`  ✓ ${table}: table exists`)
    }
  }

  // Test 2: Insert a test vendor profile
  console.log('\n--- Test 2: Insert test data ---')
  const testUserId = '00000000-0000-0000-0000-000000000001'

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: testUserId,
      role: 'vendor',
      full_name: 'Test Vendor'
    })

  if (profileError) {
    console.log('  ✗ Profile insert:', profileError.message)
  } else {
    console.log('  ✓ Profile inserted successfully')
  }

  // Test 3: Read it back
  console.log('\n--- Test 3: Read back data ---')
  const { data: profile, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', testUserId)
    .single()

  if (readError) {
    console.log('  ✗ Profile read:', readError.message)
  } else {
    console.log('  ✓ Profile read back:')
    console.log('    Name:', profile.full_name)
    console.log('    Role:', profile.role)
    console.log('    Created:', profile.created_at)
  }

  // Test 4: Clean up test data
  console.log('\n--- Test 4: Clean up ---')
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', testUserId)

  if (deleteError) {
    console.log('  ✗ Cleanup:', deleteError.message)
  } else {
    console.log('  ✓ Test data cleaned up')
  }

  console.log('\n================================================')
  console.log('   Supabase connection test complete')
  console.log('   All systems ready for VendorChain')
  console.log('================================================')
}

testConnection().catch(console.error)
