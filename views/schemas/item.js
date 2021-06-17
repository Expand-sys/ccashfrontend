const mongoose = require("mongoose");

const ItemSchema = mongoose.Schema({
  itemId: {
    type: Number,
    required: true,
  },
  meta: {
    type: Number,
    required: false,
  },
  name: {
    type: String,
    required: true,
  },
  text_type: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: false,
  },
});

const Item = (module.exports = mongoose.model("Item", ItemSchema));
