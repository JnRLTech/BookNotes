
CREATE TABLE books
(
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    author VARCHAR(100) NOT NULL
);

CREATE TABLE users(
id SERIAL PRIMARY KEY,
name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE book_notes (
	id SERIAL PRIMARY KEY,  
	notes TEXT,
	rating INTEGER,
	date DATE,
	book_id INTEGER REFERENCES books(id),
	user_id INTEGER REFERENCES users(id)
);

SELECT *
FROM book_notes 
JOIN books ON book_id = books.id
JOIN users ON user_id = users.id;