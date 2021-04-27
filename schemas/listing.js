const mongoose = require('mongoose');


const ListingSchema = mongoose.Schema({
  itemId:{
    type: Number,
    required: true,
  },
  meta:{
    type: Number,
    required: false
  },
  name:{
    type: String,
    required: true
  },
  foreignid:{
    type: String,
    required: true,
  },
  price:{
    type:Number,
    required: true
  },
  amount:{
    type: Number,
    required:true
  },
  seller:{
    type:String,
    required:true,
  }
})

const Listing = module.exports = mongoose.model('Listing', ListingSchema);
