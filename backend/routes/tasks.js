const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 구역 추가
router.post('/zones', (req, res) => {
    const { group_id, name } = req.body;
    db.run(`INSERT INTO zones (group_id, name) VALUES (?, ?)`, [group_id, name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name });
    });
});

// 특정 그룹의 구역 목록 조회
router.get('/zones', (req, res) => {
    const { group_id } = req.query;
    db.all(`SELECT * FROM zones WHERE group_id = ?`, [group_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 구역 내 집안일 추가
router.post('/', (req, res) => {
    const { zone_id, name } = req.body;
    db.run(`INSERT INTO tasks (zone_id, name) VALUES (?, ?)`, [zone_id, name], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, completed: 0 });
    });
});

// 구역 내 집안일 목록 조회
router.get('/', (req, res) => {
    const { group_id } = req.query;
    db.all(`
    SELECT tasks.* FROM tasks
    JOIN zones ON tasks.zone_id = zones.id
    WHERE zones.group_id = ?`, [group_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 집안일 완료/삭제
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    db.run(`UPDATE tasks SET completed = ? WHERE id = ?`, [completed, id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM tasks WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
