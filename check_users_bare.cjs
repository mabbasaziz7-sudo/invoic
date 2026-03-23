const https = require('https');

const supabaseUrl = 'https://mtayfhilwfamqkrntstu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YXlmaGlsd2ZhbXFrcm50c3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjIxNzMsImV4cCI6MjA4OTczODE3M30.S95Nbyq2sAPPs1dnW1V3Sg-0jFY3getSqAOuB3ZCbW8';

const options = {
  hostname: 'mtayfhilwfamqkrntstu.supabase.co',
  path: '/rest/v1/users?select=*',
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const users = JSON.parse(data);
      console.log('Users found in db:');
      console.log(JSON.stringify(users, null, 2));
    } catch (e) {
      console.error('Failed to parse:', data);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
