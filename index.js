import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "gdEUcr9QCGrvi0f$",
  port: 5433,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let bookNotes = [];
let currentUser = 1;


app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT book_notes.id, book_notes.notes, book_notes.rating, book_notes.date, book_notes.book_id, book_notes.user_id, books.isbn, books.author, books.title, users.name FROM book_notes JOIN books ON book_id = books.id JOIN users ON user_id = users.id ORDER BY book_notes.rating DESC;");
    bookNotes = result.rows;

    res.render("index.ejs", {
      rBookNotes: bookNotes,
    });

  } catch (err) {
      console.log(err);
  }
});

app.get("/title", async (req, res) => {
  try {
    const result = await db.query("SELECT book_notes.id, book_notes.notes, book_notes.rating, book_notes.date, book_notes.book_id, book_notes.user_id, books.isbn, books.author, books.title, users.name FROM book_notes JOIN books ON book_id = books.id JOIN users ON user_id = users.id ORDER BY books.title ASC;");
    bookNotes = result.rows;

    res.render("index.ejs", {
      rBookNotes: bookNotes,
    });

  } catch (err) {
      console.log(err);
  }
});

app.get("/date", async (req, res) => {
  try {
    const result = await db.query("SELECT book_notes.id, book_notes.notes, book_notes.rating, book_notes.date, book_notes.book_id, book_notes.user_id, books.isbn, books.author, books.title, users.name FROM book_notes JOIN books ON book_id = books.id JOIN users ON user_id = users.id ORDER BY book_notes.date DESC; ");
    bookNotes = result.rows;

    res.render("index.ejs", {
      rBookNotes: bookNotes,
    });

  } catch (err) {
      console.log(err);
  }
});




app.post("/add", (req, res) => {
  const item = req.body.bookTitle;
  res.render("new.ejs");
});

app.post("/new", async (req, res) => {

  const title = req.body.bookTitle;
  const author = req.body.bookAuthor;
  const isbn = req.body.bookISBN;
  const notes = req.body.bookNotes;
  const rating = req.body.bookRating;

  let bookId = 0;


  try {

    
    const result1 = await db.query(
      "SELECT id FROM books WHERE LOWER(title) LIKE '%' || $1 || '%';",
      [title.toLowerCase()]);   

    if(result1.rows.length === 0){ // Only add a new book if it doesn't already exist

      const result2 = await db.query("INSERT INTO books (title, author, isbn) VALUES ($1,$2,$3) RETURNING id", [title,author,isbn]);
      bookId = result2.rows[0].id;
    }else {
      bookId = result1.rows[0].id; // use the id of the book that was found
    }

    try{

      await db.query("INSERT INTO book_notes (notes, rating, date, book_id, user_id) VALUES ($1,$2,$3,$4,$5)", [notes,rating,new Date().toLocaleDateString(),bookId,currentUser]);

    }catch (err) {
      console.log(err);
    }
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }

});

app.post("/", async (req, res) => {
 const bookNote = JSON.parse(req.body.bookNote); // turn the book notes that the user clicked on back into an object
  
  res.render("edit.ejs",{rbookNote: bookNote});
});

app.post("/edit", async (req, res) => {
  const notes = req.body.updatedBookNotes;
  const title = req.body.updatedBookTitle;
  const rating = req.body.updatedBookRating;
  const id = req.body.updatedBookId;

  try {
    await db.query("UPDATE book_notes SET notes = ($1), rating = ($2) WHERE book_id = $3 and user_id = $4", [notes, rating, id, currentUser]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {

  const bookNote = JSON.parse(req.body.bookNote); // turn the book notes that the user clicked on back into an object

  try {
    await db.query("DELETE FROM book_notes WHERE id = $1", [bookNote.id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
