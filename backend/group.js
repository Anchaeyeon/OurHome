const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');

// bodyParser 미들웨어 사용 (클라이언트에서 JSON 형식으로 전송한 데이터를 파싱)

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
    image TEXT
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id)
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER,
    name TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (zone_id) REFERENCES zones(id)
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

// 그룹 목록과 구역 목록 가져오기 API
app.get('/groups', (req, res) => {
    db.all('SELECT * FROM groups', [], (err, groups) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 목록 조회 실패' });
        }

        // Fetch zones for each group
        const groupIds = groups.map(group => group.id); // Collect all group IDs
        const query = `SELECT * FROM zones WHERE group_id IN (${groupIds.join(',')})`;

        db.all(query, [], (err, zones) => {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 구역 목록 조회 실패' });
            }

            // Group zones by groupId
            const groupsWithZones = groups.map(group => {
                const groupZones = zones.filter(zone => zone.group_id === group.id);
                return {
                    ...group,
                    zones: groupZones  // Add zones to the group object
                };
            });

            res.status(200).json({ groups: groupsWithZones });
        });
    });
});

// 구역 추가 API
app.post('/addZone', (req, res) => {
    const { zoneName, groupName } = req.body;

    // 구역 이름과 그룹 이름이 제공되지 않으면 에러 반환
    if (!zoneName || !groupName) {
        return res.status(400).json({ message: '구역 이름과 그룹 이름을 모두 제공해야 합니다.' });
    }

    // 그룹 이름으로 그룹 ID 찾기
    db.get('SELECT id FROM groups WHERE name = ?', [groupName], (err, row) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 조회 실패' });
        }
        if (!row) {
            return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
        }

        const groupId = row.id;

        // 구역 추가
        db.run('INSERT INTO zones (name, group_id) VALUES (?, ?)', [zoneName, groupId], (err) => {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 구역 추가 실패' });
            }
            res.status(200).json({ message: `${zoneName} 구역이 추가되었습니다.` });
        });
    });
});

// 그룹 이름으로 구역 목록 가져오기 API
app.get('/zones/:groupName', (req, res) => {
    const groupName = req.params.groupName;

    // 그룹 이름으로 그룹 ID를 찾기
    db.get('SELECT * FROM groups WHERE name = ?', [groupName], (err, group) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 조회 실패' });
        }
        if (!group) {
            return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
        }

        // 그룹 ID를 사용해 해당 그룹의 구역 목록을 조회
        db.all('SELECT * FROM zones WHERE group_id = ?', [group.id], (err, zones) => {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 구역 목록 조회 실패' });
            }
            res.status(200).json({ zones });
        });
    });
});

// 기본 페이지 (main.html) 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// 서버 시작
const PORT = process.env.PORT || 3001; // 환경변수에서 포트를 가져오고, 없다면 3000번 사용
app.listen(PORT, () => {
    console.log(`서버가 ${PORT}번 포트에서 실행 중입니다. http://localhost:${PORT}`);
});
