const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('group.db', (err) => {
    if (err) {
        console.error('SQLite 연결 실패:', err);
    } else {
        console.log('SQLite 연결 성공');
    }
});

// 그룹 테이블 생성 (만약 없다면)
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image TEXT NOT NULL
    )`);
});

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일을 서빙하기 위해 public 디렉토리를 설정
app.use(express.static(path.join(__dirname, 'public')));

// 파일 업로드 설정 (multer 사용)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // 업로드된 파일을 'uploads' 폴더에 저장
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // 파일 이름에 타임스탬프 추가
    },
});

const upload = multer({ storage: storage });

// 그룹 추가 API
app.post('/addGroup', upload.single('groupImage'), (req, res) => {
    const { groupName } = req.body;
    const groupImage = req.file ? `/uploads/${req.file.filename}` : ''; // 이미지 파일 경로

    if (!groupName || !groupImage) {
        return res.status(400).json({ message: '그룹 이름과 사진을 모두 제공해야 합니다.' });
    }

    // 그룹 데이터를 그룹 테이블에 저장
    db.run('INSERT INTO groups (name, image) VALUES (?, ?)', [groupName, groupImage], (err) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 추가 실패' });
        }
        res.status(200).json({ message: '그룹이 추가되었습니다.' });
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

// 기본 페이지 (main.html) 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// 서버 시작
const PORT = process.env.PORT || 3000; // 환경변수에서 포트를 가져오고, 없다면 3000번 사용
app.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중입니다. http://localhost:${PORT}`);
});
