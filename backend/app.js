const express = require('express');
const router = express.Router();
const db = require('./database');

// 그룹 목록 가져오기
router.get('/', (req, res) => {
    db.all('SELECT * FROM groups', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 그룹 추가
router.post('/', (req, res) => {
    const { name } = req.body;
    db.run('INSERT INTO groups (name) VALUES (?)', [name], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID });
    });
});

module.exports = router;
