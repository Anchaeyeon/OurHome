const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 그룹 생성
router.post('/', (req, res) => {
    const { name, image } = req.body;
    db.run(`INSERT INTO groups (name, image) VALUES (?, ?)`, [name, image], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, name, image });
    });
});

// 그룹 목록 조회
router.get('/', (req, res) => {
    db.all(`SELECT * FROM groups`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 특정 그룹 조회
router.get('/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM groups WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Group not found" });
        res.json(row);
    });
});

// 그룹 삭제
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM groups WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
