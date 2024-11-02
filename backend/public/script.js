document.getElementById('userForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const age = document.getElementById('age').value;
    const email = document.getElementById('email').value;

    const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, age, email })
    });
    const data = await response.json();
    if (data.id) alert('사용자가 추가되었습니다.');
});

async function loadUsers() {
    const response = await fetch('/api/users');
    const users = await response.json();
    const userList = document.getElementById('userList');
    userList.innerHTML = users.map(user => `
    <li>${user.name} (나이: ${user.age}, 이메일: ${user.email})</li>
  `).join('');
}
loadUsers();
