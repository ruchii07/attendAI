const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ygxrmeugswqykhxlfjkl.supabase.co';
const supabaseKey = 'sb_publishable_ZpXluIMDi4ebS-9MkIFAsA_Sr_imexZ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { error } = await supabase.from('schedule').insert({
    teacher_id: '123', // fake
    subject: 'Test',
    day: 'Monday',
    start: '00:00',
    end: '00:00'
  });
  console.log('Insert Error:', error);
}

testInsert();
