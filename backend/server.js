const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
app.use(express.json());

// 정적 파일을 제공하는 미들웨어 설정 (public 폴더 내의 HTML, CSS, JS 파일들)
app.use(express.static(path.join(__dirname, 'public')));

// 데이터 파일 경로
const dataFilePath = path.join(__dirname, 'data.json');

// 데이터 읽기
function readData() {
    const rawData = fs.readFileSync(dataFilePath);
    return JSON.parse(rawData);
}

// 데이터 쓰기
function writeData(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

// 그룹 추가
app.post('/groups', (req, res) => {
    const { name, image } = req.body;
    const data = readData();

    // 새로운 그룹 생성
    const newGroup = {
        id: data.groups.length + 1,
        name,
        image,
        zones: []  // 초기 구역은 비어있음
    };

    data.groups.push(newGroup);
    writeData(data);

    res.status(201).json(newGroup);
});

// 그룹 목록 조회
app.get('/groups', (req, res) => {
    const data = readData();
    res.json(data.groups);
});

// 그룹 상세 조회
app.get('/groups/:id', (req, res) => {
    const groupId = parseInt(req.params.id);
    const data = readData();
    const group = data.groups.find(g => g.id === groupId);

    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
});

// 구역 추가
app.post('/groups/:id/zones', (req, res) => {
    const groupId = parseInt(req.params.id);
    const { name } = req.body;

    const data = readData();
    const group = data.groups.find(g => g.id === groupId);

    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }

    const newZone = {
        id: group.zones.length + 1,
        name,
        tasks: []  // 구역 추가 시 초기에는 집안일이 없음
    };

    group.zones.push(newZone);
    writeData(data);

    res.status(201).json(newZone);
});

// 집안일 추가
app.post('/groups/:groupId/zones/:zoneId/tasks', (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const zoneId = parseInt(req.params.zoneId);
    const { name } = req.body;

    const data = readData();
    const group = data.groups.find(g => g.id === groupId);

    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }

    const zone = group.zones.find(z => z.id === zoneId);
    if (!zone) {
        return res.status(404).json({ error: 'Zone not found' });
    }

    const newTask = {
        id: zone.tasks.length + 1,
        name,
        completed: false
    };

    zone.tasks.push(newTask);
    writeData(data);

    res.status(201).json(newTask);
});

// 집안일 완료 처리
app.patch('/groups/:groupId/zones/:zoneId/tasks/:taskId', (req, res) => {
    const groupId = parseInt(req.params.groupId);
    const zoneId = parseInt(req.params.zoneId);
    const taskId = parseInt(req.params.taskId);

    const data = readData();
    const group = data.groups.find(g => g.id === groupId);

    if (!group) {
        return res.status(404).json({ error: 'Group not found' });
    }

    const zone = group.zones.find(z => z.id === zoneId);
    if (!zone) {
        return res.status(404).json({ error: 'Zone not found' });
    }

    const task = zone.tasks.find(t => t.id === taskId);
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    task.completed = true;  // 집안일 완료 처리
    writeData(data);

    res.json(task);
});

// 서버 시작
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
