const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ygxrmeugswqykhxlfjkl.supabase.co';
const supabaseKey = 'sb_publishable_ZpXluIMDi4ebS-9MkIFAsA_Sr_imexZ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTestData() {
  console.log('Seeding data to test RLS policies...');

  // 1. Create a mock authenticated teacher
  const email = 'testteacher_' + Date.now() + '@attendai.app';
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });

  if (authError || !authData.user) {
    console.error('Failed to create teacher auth user', authError);
    return;
  }

  // Insert into teachers table
  const { data: teacher, error: teacherError } = await supabase.from('teachers').insert({
    user_id: authData.user.id,
    name: 'Test Teacher',
    employee_id: 'EMP-001',
    subject: 'Computer Science',
    department: 'Engineering'
  }).select().single();

  if (teacherError) {
    console.error('Failed to insert teacher profile', teacherError);
    return;
  }
  
  const currentDayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // 2. Insert a schedule
  await supabase.from('schedule').insert({
    teacher_id: teacher.id,
    subject: 'Intro to AI',
    day: currentDayStr,
    start: '00:00',
    end: '23:59' // active slot all day
  });

  // 3. Insert a student
  const { data: student, error: studentError } = await supabase.from('students').insert({
    teacher_id: teacher.id,
    name: 'teststudent_rls',
    password: 'password123',
    roll: 'RLS-01',
    department: 'CS',
    descriptor: Array(128).fill(0.1)
  }).select().single();

  if (studentError) {
    console.error('Failed to insert student', studentError);
    return;
  }

  console.log('--- TEST DATA SEEDED SUCCESSFULLY ---');
  console.log('Teacher Name: Test Teacher | Password: password123');
  console.log('Student Name: teststudent_rls | Password: password123');
}

seedTestData();
