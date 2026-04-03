
fetch('http://localhost:5050/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demoadmin@zentrix.com', password: 'Test@1234' })
}).then(r => r.json()).then(data => {
  const token = data.token || data.accessToken;
  if (!token) return console.log('Login failed', data);
  fetch('http://localhost:5050/api/dashboard?personal=false', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.text()).then(dash => {
    console.log('Dash status code:', dash);
  }).catch(e => console.log('Dash fetch error:', e));
});
