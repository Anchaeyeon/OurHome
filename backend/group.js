const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs'); // 추가된 코드

// bodyParser 미들웨어 사용 (클라이언트에서 JSON 형식으로 전송한 데이터를 파싱)

// SQLite 데이터베이스 연결
const db = new sqlite3.Database('group.db', (err) => {
    if (err) {
        console.error('SQLite 연결 실패:', err);
    } else {
        console.log('SQLite 연결 성공');
    }
});

db.serialize(() => {
    // 그룹 테이블 생성 (만약 없다면)
    db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        image TEXT
    )`);

    // 구역 테이블 생성 (만약 없다면)
    db.run(`CREATE TABLE IF NOT EXISTS zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        name TEXT NOT NULL,
        FOREIGN KEY (group_id) REFERENCES groups(id)
    )`);

    // 집안일 테이블 생성 (만약 없다면)
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_id INTEGER,
        name TEXT NOT NULL,
        reward INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        FOREIGN KEY (zone_id) REFERENCES zones(id)
    )`);

    // 사용자 테이블 생성 (만약 없다면)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        reward INTEGER DEFAULT 0
    )`);

    // 기본 사용자 "나" 추가 (만약 없다면)
    db.get('SELECT id FROM users WHERE name = "나"', (err, row) => {
        if (err) {
            console.error('서버 오류: 사용자 조회 실패', err);
        }
        if (!row) {
            db.run('INSERT INTO users (name) VALUES ("나")', (err) => {
                if (err) {
                    console.error('서버 오류: 기본 사용자 추가 실패', err);
                } else {
                    console.log('기본 사용자 "나"가 추가되었습니다.');
                }
            });
        }
    });
});

// 'uploads' 폴더 생성 (없을 경우)
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 파일 업로드 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// JSON 파싱 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 그룹 추가 API
app.post('/addGroup', upload.single('groupImage'), (req, res) => {
    const groupName = req.body.groupName;
    const imagePath = `/uploads/${req.file.filename}`;

    db.run(`INSERT INTO groups (name, image) VALUES (?, ?)`, [groupName, imagePath], (err) => {
        if (err) {
            return res.status(500).json({ message: '그룹 추가 실패' });
        }
        res.status(200).json({ message: '그룹이 추가되었습니다.' });
    });
});

// 그룹 목록 조회 API
app.get('/groups', (req, res) => {
    db.all('SELECT * FROM groups', [], (err, groups) => {
        if (err) {
            return res.status(500).json({ message: '그룹 목록 조회 실패' });
        }
        res.status(200).json({ groups });
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

// 집안일 추가 API
app.post('/addTask', (req, res) => {
    const { zoneName, taskName, taskReward, completeTask } = req.body;

    // 구역 이름과 집안일 이름이 제공되지 않으면 에러 반환
    if (!zoneName || !taskName) {
        return res.status(400).json({ message: '구역 이름과 집안일 이름을 모두 제공해야 합니다.' });
    }

    // 구역 이름으로 구역 ID 찾기
    db.get('SELECT id FROM zones WHERE name = ?', [zoneName], (err, row) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 구역 조회 실패' });
        }
        if (!row) {
            return res.status(404).json({ message: '구역을 찾을 수 없습니다.' });
        }

        const zoneId = row.id;

        // 집안일 추가
        db.run('INSERT INTO tasks (name, reward, completed, zone_id) VALUES (?, ?, ?, ?)', [taskName, taskReward, completeTask, zoneId], (err) => {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 집안일 추가 실패', error: err.message });
            }
            res.status(200).json({ message: `${zoneName}에 ${taskName} 집안일이 추가되었습니다. 보상:${taskReward}` });
        });
    });
});

// 구역에 해당하는 집안일 불러오기 API
app.get('/tasks/:zoneId', (req, res) => {
    const zoneId = req.params.zoneId;

    // 해당 구역 ID에 해당하는 집안일을 가져옴
    db.all('SELECT id, name, reward, completed FROM tasks WHERE zone_id = ?', [zoneId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 집안일 조회 실패' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: '집안일이 없습니다.' });
        }

        res.status(200).json({ tasks: rows });
    });
});

// 집안일 삭제 API
app.delete('/deleteTask/:taskId', (req, res) => {
    const taskId = req.params.taskId;

    // 해당 taskId를 가진 집안일을 삭제
    db.run('DELETE FROM tasks WHERE id = ?', [taskId], (err) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 집안일 삭제 실패' });
        }
        res.status(200).json({ message: '집안일이 삭제되었습니다.' });
    });
});

// 리워드 업데이트 API
app.post('/updateReward', (req, res) => {
    const { userName, taskReward } = req.body;

    // 사용자 이름으로 리워드 업데이트
    db.get('SELECT reward FROM users WHERE name = ?', [userName], (err, row) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 사용자 조회 실패' });
        }
        if (!row) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 기존 리워드에 추가
        const newReward = row.reward + taskReward;

        // 리워드 업데이트
        db.run('UPDATE users SET reward = ? WHERE name = ?', [newReward, userName], (err) => {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 리워드 업데이트 실패' });
            }
            res.status(200).json({ message: '리워드가 업데이트되었습니다.', newReward });
        });
    });
});

// 사용자의 리워드를 가져오는 API
app.get('/getReward/:userName', (req, res) => {
    const userName = req.params.userName;

    // 사용자 이름으로 리워드 조회
    db.get('SELECT reward FROM users WHERE name = ?', [userName], (err, row) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 사용자 조회 실패' });
        }
        if (!row) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        // 리워드 반환
        res.status(200).json({ reward: row.reward });
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