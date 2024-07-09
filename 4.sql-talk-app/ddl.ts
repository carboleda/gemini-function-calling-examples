import sqlite3 from "sqlite3";
import fs from "node:fs";

fs.unlinkSync("4.sql-talk-app/db.sqlite");

// Create a new database connection
const db = new sqlite3.Database("4.sql-talk-app/db.sqlite");

// Open the database connection
db.serialize(() => {
  // Create a table
  db.run(`
    CREATE TABLE IF NOT EXISTS student (
      id INTEGER PRIMARY KEY,
      name TEXT,
      age INTEGER,
      email TEXT,
      address TEXT
    )
  `);

  // Create another table
  db.run(`
    CREATE TABLE IF NOT EXISTS course (
      id INTEGER PRIMARY KEY,
      title TEXT,
      content TEXT,
      instructor TEXT,
      duration INTEGER
    )
  `);

  // Create a third table
  db.run(`
    CREATE TABLE IF NOT EXISTS student_course (
      student_id INTEGER,
      course_id INTEGER,
      FOREIGN KEY (student_id) REFERENCES student(id),
      FOREIGN KEY (course_id) REFERENCES course(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      note REAL,
      created_at TEXT,
      student_id INTEGER,
      course_id INTEGER,
      FOREIGN KEY (student_id) REFERENCES student(id),
      FOREIGN KEY (course_id) REFERENCES course(id)
    )
  `);

  // Create foreign keys to establish relationships among tables
  db.run(`
    PRAGMA foreign_keys = ON
  `);
});

// Close the database connection
db.close();
