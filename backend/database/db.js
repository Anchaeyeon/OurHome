const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    image TEXT
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id)
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER,
    name TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (zone_id) REFERENCES zones(id)
  )`);
});

module.exports = db;
