const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  bookId: String, // Store the ID of the book being reviewed
  text: String, // Store the review text
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;