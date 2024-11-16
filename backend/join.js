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
        return res.send('비밀번호가 일치하지 않습니다.');
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
                return res.send('회원가입 중 오류가 발생했습니다.');
            }
            res.send('회원가입이 완료되었습니다.');
        });
    });
});

// 회원가입 페이지 띄우기
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'join.html')); // 올바른 경로 처리
});

// 서버 실행
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 실행 중입니다.`);
});
