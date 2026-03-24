const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ygxrmeugswqykhxlfjkl.supabase.co';
const supabaseKey = 'sb_publishable_ZpXluIMDi4ebS-9MkIFAsA_Sr_imexZ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSeed() {
  console.log('--- Cleaning up old test data to ensure clean UI login ---');
  await supabase.from('attendance').delete().neq('id', 0);
  await supabase.from('schedule').delete().neq('id', 0);
  await supabase.from('students').delete().neq('id', 0);
  await supabase.from('teachers').delete().neq('id', 0);
  
  // The UI calculates Teacher email strictly as: name.toLowerCase().replace(/\s/g, '') + "@attendai.app"
  // So for name "TestTeacher", email must be "testteacher@attendai.app"
  
  const email = 'testteacher@attendai.app';
  console.log('Ensuring auth user exists:', email);
  
  let authUserId = null;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });

  if (authError && authError.message.includes('User already registered')) {
    const { data: loginData } = await supabase.auth.signInWithPassword({
      email,
      password: 'password123'
    });
    authUserId = loginData.user.id;
  } else {
    authUserId = authData.user.id;
  }

  const { data: teacher, error: teacherError } = await supabase.from('teachers').insert({
    user_id: authUserId,
    name: 'TestTeacher',
    employee_id: 'EMP-001',
    subject: 'Computer Science',
    department: 'Engineering'
  }).select().single();

  if (teacherError) {
    console.error('Failed to insert teacher profile:', teacherError);
    return;
  }
  
  const currentDayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  await supabase.from('schedule').insert({
    teacher_id: teacher.id,
    subject: 'Intro to AI',
    day: currentDayStr,
    start: '00:00',
    end: '23:59'
  });

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

  // Insert a mock attendance to verify cascade deletion later
  await supabase.from('attendance').insert({
    teacher_id: teacher.id,
    student_name: 'teststudent_rls',
    time: new Date().toISOString()
  });

  console.log('--- TEST DATA SEEDED SUCCESSFULLY ---');
  console.log('Teacher Name: TestTeacher | Password: password123');
  console.log('Student Name: teststudent_rls | Password: password123');
}

fixSeed();
