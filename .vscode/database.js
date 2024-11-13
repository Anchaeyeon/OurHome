const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('household.db');

// 테이블 생성
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER,
            name TEXT NOT NULL,
            FOREIGN KEY(group_id) REFERENCES groups(id)
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id INTEGER,
            name TEXT NOT NULL,
            reward INTEGER,
            FOREIGN KEY(zone_id) REFERENCES zones(id)
        )
    `);
});

module.exports = db;  // 데이터베이스 객체를 다른 파일에서 사용할 수 있게 내보냄
