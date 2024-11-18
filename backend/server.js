const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const session = require('express-session');

const app = express();
const PORT = 3000;

// 본문 파싱을 위한 미들웨어 등록
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 세션 설정
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
}));

// SQLite database setup
const db = new sqlite3.Database('group.db', (err) => {
    if (err) {
        console.error('SQLite 연결 실패:', err);
    } else {
        console.log('SQLite 연결 성공');
    }
});

// 테이블 생성
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, userName TEXT NOT NULL, userPW TEXT NOT NULL, reward INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT NOT NULL, image TEXT, FOREIGN KEY (user_id) REFERENCES users(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS zones (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER, name TEXT NOT NULL, FOREIGN KEY (group_id) REFERENCES groups(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, zone_id INTEGER, name TEXT NOT NULL, reward INTEGER DEFAULT 0, completed INTEGER DEFAULT 0, FOREIGN KEY (zone_id) REFERENCES zones(id))`);
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

// 회원가입 API
app.post('/join', (req, res) => {
    const { userName, userPW1, userPW2 } = req.body;
    if (userPW1 !== userPW2) {
        return res.send('<script>alert("비밀번호가 일치하지 않습니다."); window.location.href = "/join";</script>');
    }
    db.get('SELECT * FROM users WHERE userName = ?', [userName], (err, row) => {
        if (row) {
            return res.send('<script>alert("이미 존재하는 아이디입니다."); window.location.href = "/join";</script>');
        }
        db.run('INSERT INTO users (userName, userPW) VALUES (?, ?)', [userName, userPW1], (err) => {
            if (err) {
                return res.send('<script>alert("회원가입 중 오류가 발생했습니다."); window.location.href = "/join";</script>');
            }
            res.redirect('/');
        });
    });
});

// 로그인 API
app.post('/', (req, res) => {
    const { userName, userPW } = req.body;
    db.get('SELECT * FROM users WHERE userName = ? AND userPW = ?', [userName, userPW], (err, user) => {
        if (err || !user) {
            return res.send('<script>alert("아이디 또는 비밀번호가 일치하지 않습니다."); window.location.href = "/";</script>');
        }
        req.session.userId = user.id;
        req.session.userName = user.userName;
        res.redirect('/openMain');
    });
});

// 사용자별 그룹 페이지
app.get('/openMain', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// 그룹 추가 API
app.post('/addGroup', upload.single('groupImage'), (req, res) => {
    const userId = req.session.userId;
    const groupName = req.body.groupName;
    const imagePath = `/uploads/${req.file.filename}`;

    db.run('INSERT INTO groups (user_id, name, image) VALUES (?, ?, ?)', [userId, groupName, imagePath], (err) => {
        if (err) {
            return res.status(500).json({ message: '그룹 추가 실패' });
        }
        res.status(200).json({ message: '그룹이 추가되었습니다.' });
    });
});

// 사용자별 그룹 목록 조회 API
app.get('/groups', (req, res) => {
    const userId = req.session.userId;
    db.all('SELECT * FROM groups WHERE user_id = ?', [userId], (err, groups) => {
        if (err) {
            return res.status(500).json({ message: '그룹 목록 조회 실패' });
        }
        res.status(200).json({ groups });
    });
});

// 구역 추가 API
app.post('/addZone', (req, res) => {
    const { zoneName, groupName } = req.body;

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

    db.get('SELECT * FROM groups WHERE name = ?', [groupName], (err, group) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 조회 실패' });
        }
        if (!group) {
            return res.status(404).json({ message: '그룹을 찾을 수 없습니다.' });
        }

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
    const { taskReward } = req.body;
    const userId = req.session.userId;

    // 세션에 사용자 ID가 없으면 오류 반환
    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    const rewardValue = Number(taskReward);
    if (isNaN(rewardValue)) {
        return res.status(400).json({ message: '잘못된 보상 값입니다.' });
    }

    // 사용자 ID로 리워드 조회 및 업데이트
    db.get('SELECT reward FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 사용자 조회 실패' });
        }
        if (!row) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        const newReward = row.reward + rewardValue;

        // 리워드 업데이트
        db.run('UPDATE users SET reward = ? WHERE id = ?', [newReward, userId], function (err) {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 리워드 업데이트 실패' });
            }
            res.status(200).json({ message: '리워드가 업데이트되었습니다.', newReward });
        });
    });
});

// 세션 기반으로 사용자의 리워드를 가져오는 API
app.get('/getReward', (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }

    // 세션에 저장된 사용자 ID로 리워드 조회
    db.get('SELECT reward FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 리워드 조회 실패' });
        }
        if (!row) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        res.status(200).json({ reward: row.reward });
    });
});


// 로그아웃 API
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: '로그아웃 중 오류 발생' });
        }
        res.redirect('/');
    });
});


// 기본 페이지 (main.html) 서빙
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/join', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
});

app.get('/openMain', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 실행 중입니다.`);
});
