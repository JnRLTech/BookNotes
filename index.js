import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;

env.config(); // load contents of .env file

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();



let bookNotes = [];
let currentUser = 1;

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/notes", async (req, res) => {
  console.log(req.user);
  if(req.user !== undefined) {
    currentUser = req.user.id;
    console.log(req.user);
    console.log("currentUser " + currentUser);
  }
  if (req.isAuthenticated()) {
    try {
      const result = await db.query("SELECT book_notes.id, book_notes.notes, book_notes.rating, book_notes.date, book_notes.book_id, book_notes.user_id, books.isbn, books.author, books.title, users.name FROM book_notes JOIN books ON book_id = books.id JOIN users ON user_id = users.id WHERE book_notes.user_id = $1 ORDER BY book_notes.rating DESC;", [currentUser]);
      bookNotes = result.rows;

      res.render("index.ejs", {
        rBookNotes: bookNotes,
      });

    } catch (err) {
        console.log(err);
    }
  }else {
    res.redirect("/login");
  }
});

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
          );
          const user = result.rows[0];
          currentUser = user.id;
          req.login(user, (err) => {
            console.log("success");
            res.redirect("/notes");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});


// Sort by book title
app.get("/title", async (req, res) => {
  try {
    const result = await db.query("SELECT book_notes.id, book_notes.notes, book_notes.rating, book_notes.date, book_notes.book_id, book_notes.user_id, books.isbn, books.author, books.title, users.name FROM book_notes JOIN books ON book_id = books.id JOIN users ON user_id = users.id WHERE book_notes.user_id = $1 ORDER BY books.title ASC;", [currentUser]);
    bookNotes = result.rows;

    res.render("index.ejs", {
      rBookNotes: bookNotes,
    });

  } catch (err) {
      console.log(err);
  }
});


// Sort by book date
app.get("/date", async (req, res) => {
  try {
    const result = await db.query("SELECT book_notes.id, book_notes.notes, book_notes.rating, book_notes.date, book_notes.book_id, book_notes.user_id, books.isbn, books.author, books.title, users.name FROM book_notes JOIN books ON book_id = books.id JOIN users ON user_id = users.id WHERE book_notes.user_id = $1 ORDER BY book_notes.date DESC; ", [currentUser]);
    bookNotes = result.rows;

    res.render("index.ejs", {
      rBookNotes: bookNotes,
    });

  } catch (err) {
      console.log(err);
  }
});

// Sort by book rating
app.get("/rating", async (req, res) => {
  try {
    const result = await db.query("SELECT book_notes.id, book_notes.notes, book_notes.rating, book_notes.date, book_notes.book_id, book_notes.user_id, books.isbn, books.author, books.title, users.name FROM book_notes JOIN books ON book_id = books.id JOIN users ON user_id = users.id WHERE book_notes.user_id = $1 ORDER BY book_notes.rating DESC; ", [currentUser]);
    bookNotes = result.rows;

    res.render("index.ejs", {
      rBookNotes: bookNotes,
    });

  } catch (err) {
      console.log(err);
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/notes",
  passport.authenticate("google", {
    successRedirect: "/notes",
    failureRedirect: "/login",
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/notes",
    failureRedirect: "/login",
  })
);

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
    res.redirect("/notes");
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
    res.redirect("/notes");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {

  const bookNote = JSON.parse(req.body.bookNote); // turn the book notes that the user clicked on back into an object

  try {
    await db.query("DELETE FROM book_notes WHERE id = $1", [bookNote.id]);
    res.redirect("/notes");
  } catch (err) {
    console.log(err);
  }
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/notes",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
