const mongoose = require('mongoose');
const Listing = require("./listing.js")


const InventorySchema = mongoose.Schema({
  user:{
    type: String,
    required: true,
  },
  listings:[{
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
  }],
  purchases:[{
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
  }],
})

const Inventory = module.exports = mongoose.model('Inventory', InventorySchema);
