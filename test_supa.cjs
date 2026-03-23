const https = require('https');

const hostname = 'mtayfhilwfamqkrntstu.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YXlmaGlsd2ZhbXFrcm50c3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjIxNzMsImV4cCI6MjA4OTczODE3M30.S95Nbyq2sAPPs1dnW1V3Sg-0jFY3getSqAOuB3ZCbW8';

const options = {
  hostname: hostname,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
