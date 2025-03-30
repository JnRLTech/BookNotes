CREATE TABLE book_notes (
	id SERIAL PRIMARY KEY,
	book_id INTEGER REFERENCES books(id),
	user_id INTEGER REFERENCES user(id)
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