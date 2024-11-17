const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');

const app = express();
const PORT = 3000;

// SQLite database setup
const db = new sqlite3.Database('group.db', (err) => {
    if (err) {
        console.error('SQLite 연결 실패:', err);
    } else {
        console.log('SQLite 연결 성공');
    }
});

// Create tables if they don't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER,
            name TEXT NOT NULL,
            FOREIGN KEY (group_id) REFERENCES groups(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id INTEGER,
            name TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            FOREIGN KEY (zone_id) REFERENCES zones(id)
        )
    `);
});

// Body-parser setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use(express.static('public'));

// Multer file upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Save uploaded files to 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to file name
    },
});

const upload = multer({ storage: storage });

// Routes for user registration and login
app.post('/join', (req, res) => {
    const { userName, userPW1, userPW2 } = req.body;

    if (userPW1 !== userPW2) {
        return res.send('<script>alert("비밀번호가 일치하지 않습니다."); window.location.href = "/";</script>');
    }

    const newUser = { userName, userPW: userPW1 };
    const usersFilePath = './users.json';

    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        let users = [];
        if (!err && data) {
            users = JSON.parse(data);
        }

        users.push(newUser);

        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.send('<script>alert("회원가입 중 오류가 발생했습니다."); window.location.href = "/";</script>');
            }
            res.redirect('/login');
        });
    });
});

app.post('/login', (req, res) => {
    const { userName, userPW } = req.body;
    const usersFilePath = './users.json';

    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        if (err) {
            return res.send('<script>alert("로그인 중 오류가 발생했습니다."); window.location.href = "/";</script>');
        }

        const users = JSON.parse(data);

        const user = users.find(u => u.userName === userName && u.userPW === userPW);

        if (user) {
            res.redirect('/AddGroup');
        } else {
            res.send('<script>alert("아이디 또는 비밀번호가 일치하지 않습니다."); window.location.href = "/login";</script>');
        }
    });
});

// Routes for group management
app.post('/addGroup', upload.single('groupImage'), (req, res) => {
    const { groupName } = req.body;
    const groupImage = req.file ? `/uploads/${req.file.filename}` : '';

    if (!groupName || !groupImage) {
        return res.status(400).json({ message: '그룹 이름과 사진을 모두 제공해야 합니다.' });
    }

    db.run('INSERT INTO groups (name, image) VALUES (?, ?)', [groupName, groupImage], (err) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 추가 실패' });
        }
        res.status(200).json({ message: '그룹이 추가되었습니다.' });
    });
});

app.get('/groups', (req, res) => {
    db.all('SELECT * FROM groups', [], (err, groups) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 그룹 목록 조회 실패' });
        }

        const groupIds = groups.map(group => group.id);
        const query = `SELECT * FROM zones WHERE group_id IN (${groupIds.join(',')})`;

        db.all(query, [], (err, zones) => {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 구역 목록 조회 실패' });
            }

            const groupsWithZones = groups.map(group => {
                const groupZones = zones.filter(zone => zone.group_id === group.id);
                return {
                    ...group,
                    zones: groupZones,
                };
            });

            res.status(200).json({ groups: groupsWithZones });
        });
    });
});

app.post('/addZone', (req, res) => {
    const { zoneName, groupName } = req.body;

    if (!zoneName || !groupName) {
        return res.status(400).json({ message: '구역 이름과 그룹 이름을 모두 제공해야 합니다.' });
    }

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

// Serve pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/AddGroup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Main.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 실행 중입니다.`);
});
