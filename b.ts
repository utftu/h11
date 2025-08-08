const headers = new Headers();
headers.set('host', 'google.com');
headers.set('user-agent', 'curl/8.7.1');
headers.set('accept', '*/*');

const res = await fetch('https://googl.com', {
  method: 'GET',
  headers: headers,
  // body: req.body,
  redirect: 'manual',
});

const text = await res.text();
