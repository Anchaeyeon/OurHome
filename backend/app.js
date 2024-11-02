const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('./mydatabase.db', (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('SQLite 데이터베이스에 연결되었습니다.');
});

// 사용자 테이블 생성
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE
  )`);
});

// 사용자 데이터 추가 API
app.post('/api/users', (req, res) => {
    const { name, age, email } = req.body;
    const query = `INSERT INTO users (name, age, email) VALUES (?, ?, ?)`;
    db.run(query, [name, age, email], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ id: this.lastID });
    });
});

// 사용자 목록 조회 API
app.get('/api/users', (req, res) => {
    const query = `SELECT * FROM users`;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 사용자 수정 API
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, age, email } = req.body;
    const query = `UPDATE users SET name = ?, age = ?, email = ? WHERE id = ?`;
    db.run(query, [name, age, email, id], function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ updatedID: id });
    });
});

// 사용자 삭제 API
app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM users WHERE id = ?`;
    db.run(query, id, function (err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ deletedID: id });
    });
});

// 서버 실행
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT} 포트에서 실행 중입니다.`);
});
