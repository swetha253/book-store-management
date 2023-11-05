const User = require("../model/user.js");
const db = require("../config/db.js");
const Books = require("../model/books.js");
const mongoose = require("mongoose");
const UserBook = require("../model/userBook.js");
const Review = require("../model/Review.js");
const bcrypt = require("bcrypt");

// Render all books if the user is an admin
exports.getAllBooks = async (req, res) => {
  if (!req.session.user) {
    return res.send("First enter your login credentials to access all books.");
  }

  if (req.session.user.isAdmin === false) {
    return res.send("Only admins can access all books.");
  }

  try {
    const books = await Books.find({}).exec();
    res.render("all-books", {
      books_list: books,
    });
  } catch (err) {
    // Handle errors if necessary
    console.error("Error fetching and rendering books:", err);
    res.status(500).send("Internal Server Error");
  }
};

// Render the update profile page
exports.getUpdateProfile = (req, res) => {
  res.render("updateProfile");
};

// Render the user page
exports.getPage = (req, res) => {
  res.render("user");
};

// Render the login page
exports.getLogin = (req, res) => {
  res.render("login");
};

// Render the addBook page if the user is an admin; otherwise, display an error message
exports.getAddBook = async (req, res) => {
  try {
    // Check if the user is logged in and is an admin
    if (!req.session.user) {
      return res.send(
        "First enter your login credentials to access adding books."
      );
    }

    if (!req.session.user.isAdmin) {
      return res.send("Only admins can access this page.");
    }

    // Render the addBook page
    res.render("addBook", {});
  } catch (err) {
    console.error("Error in getAddBook:", err);
    // Handle the error as needed
    return res.status(500).send("Internal Server Error");
  }
};

// User login verification route handler
exports.verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email in the database
    const existingUser = await User.findOne({ email });

    // Check if the user exists
    if (!existingUser) {
      return res.status(401).json({ error: "User does not exist." });
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await existingUser.comparePassword(password);

    // Check if the password is valid
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email and password" });
    }

    // Store the authenticated user in the session
    req.session.user = existingUser;

    // Redirect to the user's profile page
    return res.redirect("/profile");
  } catch (err) {
    console.error("Error in verifyLogin:", err);

    // Redirect to the login page or handle the error as needed
    return res.redirect("/login");
  }
};

// Create a new user route handler
exports.createUser = async (req, res) => {
  try {
    const { name, password, email, userid } = req.body;

    // Check if the email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.send("Error: Email ID is already registered");
    }

    // Create a new user record in the database
    const userCreated = await User.create({ name, password, email, userid });
    console.log("User Registered Successfully:", userCreated);

    // Create a user-specific book collection
    const userCollectionName = `books_${userid}`;
    await mongoose.connection.createCollection(userCollectionName);
    console.log(`User collection "${userCollectionName}" created successfully`);

    // Redirect to the home page
    return res.redirect("/");
  } catch (err) {
    console.error("Error in createUser:", err);

    // Redirect to an error page or handle the error as needed
    return res.redirect("back");
  }
};

// Display user profile route handler
exports.getProfile = async (req, res) => {
  try {
    // Check if the user is logged in
    if (!req.session.user) {
      return res.redirect("/");
    }

    // Render the 'profile' view with user details
    res.render("profile", { user_details: req.session.user });
  } catch (err) {
    console.error("Error in getProfile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add a book route handler
exports.addBook = async (req, res) => {
  try {
    const { title, author, isbn, price, quantity, image } = req.body;

    // Create a new book record in the database
    const bookAdded = await Books.create({
      title,
      author,
      isbn,
      price,
      quantity,
      image,
    });

    console.log("Book Added Successfully:", bookAdded);

    // Redirect back to the previous page
    return res.redirect("back");
  } catch (err) {
    console.error("Error in addBook:", err);

    // Redirect to an error page or handle the error as needed
    return res.redirect("/get-add-book");
  }
};

// Display books route handler
exports.getBooks = async (req, res) => {
  try {
    // Check if the user is not logged in
    if (!req.session.user) {
      return res.redirect("/");
    }

    // Fetch all books from the database
    const books = await Books.find({}).exec();

    // Render the 'getBook' view with the list of books
    res.render("getBook", { books_list: books });
  } catch (err) {
    console.error("Error in getBooks:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete a book route handler
exports.deleteBook = async (req, res) => {
  try {
    const id = req.query.id;

    // Check if the provided ID is valid
    if (!id) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    // Use the `findByIdAndDelete` method to delete the book
    const deletedBook = await Books.findByIdAndDelete(id);

    if (!deletedBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    console.log("Book Deleted", deletedBook);
    return res.redirect("back");
  } catch (err) {
    console.error("Error in deleteBook:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Search for books route handler
exports.getSearchBook = async (req, res) => {
  try {
    const query = String(req.query.query); // Ensure query is a string

    // Use a MongoDB query to search for books by title or author
    const searchResults = await Books.find({
      $or: [
        { title: { $regex: query, $options: "i" } }, // Case-insensitive search for title
        { author: { $regex: query, $options: "i" } }, // Case-insensitive search for author
      ],
    }).exec();

    res.render("search-results", { searchResults });
  } catch (err) {
    console.error("Error in getSearchBook:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getUserSearchBook = async (req, res) => {
  try {
    const query = String(req.query.query); // Ensure query is a string
    // Use a MongoDB query to search for books by title or author
    const searchResults = await Books.find({
      $or: [
        { title: { $regex: query, $options: "i" } }, // Case-insensitive search for title
        { author: { $regex: query, $options: "i" } }, // Case-insensitive search for author
      ],
    }).exec();

    res.render("UserSearchResults", { searchResults });
  } catch (err) {
    console.error("Error in getSearchBook:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add book to user's cart route handler
exports.addToCart = async (req, res) => {
  try {
    const { book_data, quantity } = req.body;
    const bookData = JSON.parse(book_data);

    // Check if the requested quantity is more than available
    if (quantity > bookData.quantity) {
      return res
        .status(400)
        .json({ error: "Entered quantity is more than available" });
    }

    // Check if the user is not logged in
    if (!req.session.user) {
      return res.status(401).json({ error: "User is not logged in" });
    }

    const userId = req.session.user.userid;

    // Generate the user-specific collection name
    const userCollectionName = `books_${userId}`;
    const UserBooks = mongoose.model(userCollectionName, UserBook.schema);

    // Check if the book is already in the user's cart
    const existingBook = await UserBooks.findOne({ isbn: bookData.isbn });

    if (existingBook) {
      return res
        .status(400)
        .json({ error: "This book is already in your cart" });
    }

    // Set the quantity and insert the book data into the user's collection
    bookData.quantity = quantity;
    const newBook = new UserBooks(bookData);
    await newBook.save();

    console.log(
      `Book added to user collection "${userCollectionName}" successfully.`
    );
    return res.redirect("back");
  } catch (err) {
    console.error("Error in addToCart:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Get user's cart contents route handler
exports.getMyCart = async (req, res) => {
  try {
    // Check if the user is not logged in
    if (!req.session.user) {
      return res.status(401).json({ error: "User is not logged in" });
    }

    const userId = req.session.user.userid;

    // Generate the user-specific collection name
    const userCollectionName = `books_${userId}`;
    const UserBooks = mongoose.model(userCollectionName, UserBook.schema);

    // Find all books in the user's collection
    const books = await UserBooks.find({}).exec();

    // Render the cart page with the user's books
    res.render("cart", { book_list: books });
  } catch (err) {
    console.error("Error in getMyCart:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Delete book from the user's cart route handler
exports.deleteCartBook = async (req, res) => {
  try {
    const { id } = req.query;
    const userId = req.session.user.userid;

    // Validate the provided ID and user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    // Generate the user-specific collection name
    const userCollectionName = `books_${userId}`;
    const UserBooks = mongoose.model(userCollectionName, UserBook.schema);

    // Find and delete the book from the user's collection
    const deleted = await UserBooks.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Book not found in your cart" });
    }

    return res.redirect("back");
  } catch (err) {
    console.error("Error in deleteCartBook:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Admin login route handler
exports.verifyAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const existingEmail = await User.findOne({ email });

    // Check if the user exists and is an admin
    if (!existingEmail || !existingEmail.isAdmin) {
      return res.status(401).json({ error: "Invalid email and password" });
    }

    // Check if the provided password is valid
    const isPasswordValid = await bcrypt.compare(
      password,
      existingEmail.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email and password" });
    }

    // Set the user session and redirect to admin profile
    req.session.user = existingEmail;
    return res.redirect("/admin-profile");
  } catch (err) {
    console.error("Error in verifyAdminLogin:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update adminLogin route handler
exports.adminLogin = async (req, res) => {
  try {
    return res.render("admin", {});
  } catch (err) {
    console.error("Error in adminLogin:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update getAdminProfile route handler
exports.getAdminProfile = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/admin-login");
    }

    // Render the user profile page with user details
    res.render("adminProfile", { user_details: req.session.user });
  } catch (err) {
    console.error("Error in getAdminProfile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update profile route handler
exports.updateProfile = async (req, res) => {
  try {
    // Check if the user is not logged in
    if (!req.session.user) {
      return res.redirect("/");
    }

    const { name, password } = req.body;
    const userId = req.session.user._id;

    // Validate input fields
    if (!name || !password) {
      return res.status(400).json({ error: "Name and password are required" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's profile information
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the session user object
    req.session.user.name = updatedUser.name;
    req.session.user.email = updatedUser.email;

    return res.redirect("/profile");
  } catch (err) {
    console.error("Error in updateProfile:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update quantity in cart route handler
exports.updateQuantity = async (req, res) => {
  try {
    const { book_data, quantity } = req.body;
    const bookData = JSON.parse(book_data);
    const bookId = bookData._id;

    // Validate bookId to ensure it's a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    // Update the quantity in the user's cart collection
    const userCollectionName = `books_${req.session.user.userid}`;
    const UserBooks = mongoose.model(userCollectionName, UserBook.schema);

    const updatedBook = await UserBooks.findByIdAndUpdate(bookId, {
      quantity,
    });

    // Check if the book was not found in the user's cart
    if (!updatedBook) {
      return res.status(404).json({ error: "Book not found in your cart" });
    }

    return res.redirect("/my-cart");
  } catch (err) {
    console.error("Error in updateQuantity:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update book route handler
exports.updateBook = async (req, res) => {
  try {
    const { title, price, bookId } = req.body;

    // Validate bookId to ensure it's a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).send("Invalid book ID");
    }

    // Update the book using findByIdAndUpdate
    const updatedDetails = await Books.findByIdAndUpdate(bookId, {
      title,
      price,
    });

    // Check if the book was not found
    if (!updatedDetails) {
      return res.status(404).send("Book not found");
    }

    // Redirect to the all-books page after a successful update
    return res.redirect("/all-books");
  } catch (err) {
    console.error("Error in updateBook:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.AddReview = async (req, res) => {
  const bookId = req.body.book_id;
  const reviewText = req.body.review;

  // Validate the review data (e.g., check for empty reviewText)
  if (!reviewText) {
    res.status(400).send("Review text cannot be empty");
    return;
  }
  const newReview = new Review({
    bookId: bookId,
    text: reviewText,
  });

  newReview
    .save() // No callback provided, returns a Promise
    .then(() => {
      res.redirect("/my-cart");
    })
    .catch((err) => {
      console.error("Error saving review:", err);
      res.status(500).send("Error saving review");
    });
};