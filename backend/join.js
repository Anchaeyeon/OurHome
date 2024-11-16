const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs'); // 파일 시스템 모듈 추가
const app = express();
const PORT = 3000;

// Body-parser 설정
app.use(bodyParser.urlencoded({ extended: true }));

// 정적 파일 서빙
app.use(express.static('public'));

// 회원가입 처리 라우트
app.post('/join', (req, res) => {
    const { userName, userPW1, userPW2 } = req.body;

    // 비밀번호 확인
    if (userPW1 !== userPW2) {
        return res.send('<script>alert("비밀번호가 일치하지 않습니다."); window.location.href = "/";</script>');
    }

    // 저장할 사용자 데이터
    const newUser = { userName, userPW: userPW1 };
    const usersFilePath = './users.json';

    // 파일에서 기존 사용자 데이터 읽기
    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        let users = [];
        if (!err && data) {
            // 기존 데이터가 있으면 배열로 변환
            users = JSON.parse(data);
        }

        // 새 사용자 데이터를 배열에 추가
        users.push(newUser);

        // 새로운 데이터로 users.json 파일에 덮어쓰기
        fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                return res.send('<script>alert("회원가입 중 오류가 발생했습니다."); window.location.href = "/";</script>');
            }
            res.redirect('/login');  // 로그인 페이지로 이동
        });
    });
});

// 로그인 처리 라우트
app.post('/login', (req, res) => {
    const { userName, userPW } = req.body;
    const usersFilePath = './users.json';

    // 파일에서 사용자 데이터 읽기
    fs.readFile(usersFilePath, 'utf-8', (err, data) => {
        if (err) {
            return res.send('<script>alert("로그인 중 오류가 발생했습니다."); window.location.href = "/";</script>');
        }

        // 기존 사용자 데이터 파싱
        const users = JSON.parse(data);

        // 사용자가 입력한 아이디와 비밀번호가 일치하는지 확인
        const user = users.find(u => u.userName === userName && u.userPW === userPW);

        if (user) {
            res.redirect('/');
        } else {
            res.send('아이디 또는 비밀번호가 일치하지 않습니다.');
        }
    });
});

// 회원가입 페이지 띄우기
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
});

// 로그인 페이지 띄우기
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 실행 중`);
});
