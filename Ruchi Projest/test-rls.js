const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ygxrmeugswqykhxlfjkl.supabase.co';
const supabaseKey = 'sb_publishable_ZpXluIMDi4ebS-9MkIFAsA_Sr_imexZ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
  console.log('--- Testing as Anon ---');
  const { data: anonData, error: anonError } = await supabase.from('students').select('*');
  console.log('Anon Students read count:', anonData ? anonData.length : 0);
  if (anonError) console.log('Anon Error:', anonError);

  console.log('\n--- Creating Dummy Auth User ---');
  const email = 'dummy_test_' + Date.now() + '@attendai.app';
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });

  if (authError) {
    console.log('Sign up error:', authError.message);
    return;
  }

  console.log('--- Testing as Authenticated ---');
  const { data: authReadData, error: authReadError } = await supabase.from('students').select('*');
  console.log('Auth Students read count:', authReadData ? authReadData.length : 0);
  if (authReadError) console.log('Auth Error:', authReadError);
}

testRLS();
