const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('group.db', (err) => {
    if (err) {
        console.error('SQLite 연결 실패:', err);
    } else {
        console.log('SQLite 연결 성공');
    }
});

// 테이블 생성 (없으면)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        name TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id)
    )`);
});

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 그룹 생성 API
app.post('/createGroup', (req, res) => {
    const { groupName } = req.body;
    if (!groupName) {
        return res.status(400).json({ message: '그룹 이름을 입력해주세요.' });
    }
    db.run('INSERT INTO groups (name) VALUES (?)', [groupName], function (err) {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 생성 실패' });
        }
        res.status(200).json({ message: '그룹이 생성되었습니다.', groupId: this.lastID });
    });
});

// 구역 추가 API
app.post('/addZone', (req, res) => {
    const { groupId, zoneName } = req.body;

    if (!zoneName || !groupId) {
        return res.status(400).json({ message: '구역 이름과 그룹 ID를 모두 제공해야 합니다.' });
    }

    db.run('INSERT INTO zones (group_id, name) VALUES (?, ?)', [groupId, zoneName], function (err) {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 구역 추가 실패' });
        }
        res.status(200).json({ message: '구역이 추가되었습니다.' });
    });
});

// 그룹 목록 가져오기 API
app.get('/groups', (req, res) => {
    db.all('SELECT * FROM groups', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 목록 조회 실패' });
        }
        res.status(200).json({ groups: rows });
    });
});

// 구역 목록 가져오기 API
app.get('/zones/:groupId', (req, res) => {
    const { groupId } = req.params;
    db.all('SELECT * FROM zones WHERE group_id = ?', [groupId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 구역 목록 조회 실패' });
        }
        res.status(200).json({ zones: rows });
    });
});

// 기본 페이지 (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 그룹 페이지 (groupPage.html)
app.get('/group/:groupId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'groupPage.html'));
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중입니다.`);
});
