fetch('http://localhost:3000/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json'},
    body: JSON.stringify ({ email: 'test@example.com', password: 'mypassword123' })
})
.then (res => res.json())
.then(data => console.log(data));