const mongoose = require('mongoose');


const LogSchema = mongoose.Schema({
  sender:{
    type: String,
    required: true,
  },
  receiver:{
    type: String,
    required: true
  },
  amount:{
    type: Number,
    required: true
  },
  date:{
    type:Date,
    default: Date(),
    required: true
  }
})

const Log = module.exports = mongoose.model('Log', LogSchema);
