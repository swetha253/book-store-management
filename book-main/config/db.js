const mongoose = require("mongoose");

mongoose.connect(
  "mongodb+srv://admin:8500659446@cluster0.klpqpzl.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp"
);

const db = mongoose.connection;

db.on("error", (error) => {
  console.log("error to connecting with database");
});

db.once("open", function () {
  console.log("Successfully connected to database");
});