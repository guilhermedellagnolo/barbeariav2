
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler .env.local manualmente
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error('Could not read .env.local at', envPath);
  process.exit(1);
}

const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  console.log('Keys found:', Object.keys(env));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const email = 'caludinei@gmail.com';
  console.log(`Checking user: ${email}`);

  // 1. List users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (user) {
    console.log('User FOUND:', user.id, user.email);
    console.log('Deleting user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
    } else {
      console.log('User deleted successfully.');
    }
  } else {
    console.log('User NOT found in list.');
  }

  console.log('Attempting to create user...');
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { nome: 'Claudinei Teste' }
  });

  if (createError) {
    console.error('Error creating user:', createError);
    // console.error('Error details:', JSON.stringify(createError, null, 2));
  } else {
    console.log('User created successfully:', newUser.user.id);
    // Limpar
    await supabase.auth.admin.deleteUser(newUser.user.id);
    console.log('Test user cleaned up.');
  }
}

run();
