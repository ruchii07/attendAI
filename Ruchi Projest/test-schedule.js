const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ygxrmeugswqykhxlfjkl.supabase.co';
const supabaseKey = 'sb_publishable_ZpXluIMDi4ebS-9MkIFAsA_Sr_imexZ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLS() {
  console.log('Testing schedule check as anon...');
  let { data: scheduleData } = await supabase.from('schedule').select('*');
  console.log('Schedule read count (Anon):', scheduleData ? scheduleData.length : 0);
  
  console.log('Attempting to check as authenticated student...');
  // Actually students aren't in Supabase Auth, they are just rows!
  // BUT the policy the user wrote has "anon, authenticated".
  // Because "teststudent_rls" DOES NOT sign into Supabase Auth (we use custom auth for students),
  // the Supabase client remains "anon" when accessing the schedule table for a student!
}

testRLS();
