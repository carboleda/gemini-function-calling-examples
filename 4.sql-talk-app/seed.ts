import sqlite3 from "sqlite3";

// Create a new database connection
const dbFile = `${__dirname}/db.sqlite`;
const db = new sqlite3.Database(dbFile);

// Open the database connection
db.serialize(() => {
  // Insert sample data into the student table
  db.run(`INSERT INTO student (name, age, email, address) VALUES
  ('Alice Smith', 22, 'alice@example.com', '123 Maple Street'),
  ('Bob Johnson', 24, 'bob@example.com', '456 Oak Street'),
  ('Cathy Brown', 21, 'cathy@example.com', '789 Pine Street')`);

  // Insert sample data into the course table
  db.run(`INSERT INTO course (title, content, instructor, duration) VALUES
  ('Introduction to Computer Science', 'Basics of computer science', 'Dr. John Doe', 10),
  ('Advanced Mathematics', 'In-depth coverage of mathematical concepts', 'Dr. Jane Smith', 15),
  ('English Literature', 'Study of English literature', 'Prof. Emily White', 12)`);

  // Insert sample data into the student_course table to represent enrollments
  // - Alice Smith is enrolled in Introduction to Computer Science and Advanced Mathematics
  // - Bob Johnson is enrolled in Advanced Mathematics
  // - Cathy Brown is enrolled in Introduction to Computer Science and English Literature
  db.run(`INSERT INTO student_course (student_id, course_id) VALUES
  (1, 1),
  (1, 2),
  (2, 2),
  (3, 1),
  (3, 3)`);

  // Insert sample data into the notes table
  // - Alice Smith's notes for Introduction to Computer Science is 4.5
  // - Alice Smith's notes for Advanced Mathematics is 3.8
  // - Bob Johnson's notes for Advanced Mathematics is 4.2
  // - Cathy Brown's notes for Introduction to Computer Science is 4.0
  // - Cathy Brown's notes for English Literature is 3.5
  db.run(`INSERT INTO notes (note, created_at, student_course_id) VALUES
  (4.5, '2023-04-01', 1),
  (3.8, '2023-04-02', 2),
  (4.2, '2023-04-03', 3),
  (4.0, '2023-04-04', 4),
  (3.5, '2023-04-05', 5)`);
});

// Close the database connection
db.close();
