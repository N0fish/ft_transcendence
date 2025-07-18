import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
export const db = new Database('stats.db');

export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1Id INTEGER NOT NULL,
      player2Id INTEGER NOT NULL,
      winnerId INTEGER NOT NULL,
      score TEXT NOT NULL,
      duration TEXT NOT NULL,
      playedAt TEXT NOT NULL,
      roomId TEXT UNIQUE
    )
  `);

  const columns = db.prepare(`PRAGMA table_info(matches)`).all();
  const hasRoomId = columns.some(col => col.name === 'roomId');
  if (!hasRoomId) {
    db.exec(`ALTER TABLE matches ADD COLUMN roomId TEXT UNIQUE`);
  }
  
}

export const migrate = (sqlFilePath) => {
  if (!sqlFilePath) {
    throw 'Error: Please provide a path to the SQL file.';
  }

  const fullPath = path.resolve(sqlFilePath);
  if (!fs.existsSync(fullPath)) {
    throw `Error: File not found at path "${fullPath}".`;
  }

  const sql = fs.readFileSync(fullPath, 'utf8');
  db.exec(sql);

  console.log(`SQL from "${fullPath}" executed successfully!`);
}