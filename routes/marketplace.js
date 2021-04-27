const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const session = require('express-session');
const mongoose = require('mongoose')
const dotenv = require('dotenv');
const got = require('got');
const {ensureAuthenticated} = require("../config/auth.js")


mongoose.connect(process.env.MONGO,{
  useNewUrlParser: true,
  useUnifiedTopology: true
});

let db = mongoose.connection;

//check connection
db.once('open', function(){
  console.log('Connected to MongoDB');
})

//check for DB errors
db.on('error', function(err){
  console.log(err);
});

let Item = require('../schemas/item')
let Listing = require('../schemas/listing')


router.all('*', function(req, res, next) {
    console.log(req.method, req.url);
    next();
});

router.get('/', function(req, res) {
  let columns = [0,1,2,3]
  Item.find({}, function(err, items){
    if(err){
      console.log(err);
    } else {
      res.render('marketplace', {
        columns:columns,
        items: items,
        user: req.session.user,
        admin: req.session.admin,
      });
    }


  })
});
router.get('/listings', ensureAuthenticated, function(req,res){
  res.render('listings')
})
router.get('/:id',function(req, res){
  Item.findById(req.params.id, function(err, item){
    Listing.find({foreignid: req.params.id}, function(err, listings){
      console.log(listings)


      res.render('item', {
        listings: listings,
        user:req.session.user,
        admin:req.session.admin,
        item:item,
      });
    })
  });
})

router.get('/:id/list',ensureAuthenticated, function(req,res){
  Item.findById(req.params.id, function(err, item){
    Listing.find({foreignid: req.params.id}, function(err, listing){
      console.log(listing)


      res.render('itemlist', {
        user:req.session.user,
        admin:req.session.admin,
        item:item,
      });
    })
  });
})
router.get('/:id/buy',ensureAuthenticated, function(req,res){
  Item.findById(req.params.id, function(err, item){
    Listing.find({foreignid: req.params.id}, function(err, listings){
      console.log(listings)


      res.render('itembuy', {
        listings:listings,
        user:req.session.user,
        admin:req.session.admin,
        item:item,
      });
    })
  });
})
router.post('/:id/list',ensureAuthenticated, function(req,res){
  let body = req.body
  let item = JSON.parse(req.body.item)
  console.log(item)
  let listing = new Listing();
  listing.itemId = item.itemId
  listing.meta = item.meta
  listing.name = item.name
  listing.foreignid = item._id
  listing.price = body.price
  listing.amount = body.amount
  listing.seller = req.session.user
  listing.save(function(err){
    if(err){
      console.log(err);
      return;
    } else{
      console.log("added "+ listing.name+" from "+listing.seller)
    }
  })
  res.redirect('/marketplace/listings')
})
router.post('/:id',function(req, res){
  Listing.find({_id: req.params.id}, function(err, listings){
    console.log(listings)


    res.render('item', {
      listings: listings,
      user:req.session.user,
      admin:req.session.admin,
    });
  })
})

// this thingy here populates the database with minecraft items only use once otherwise you are gonna flood your database
/*router.get('/populatedb', async function(req,res){
  let response = await got('http://minecraft-ids.grahamedgecombe.com/items.json')
  let json = JSON.parse(response.body)
  console.log(json[1].name)
  for(i in json){
    let item = new Item();
    item.name = json[i].name
    item.meta = json[i].meta
    item.itemId = json[i].type
    item.text_type = json[i].text_type
    item.save(function(err){
      if(err){
        console.log(err);
        return;
      } else{
        console.log("added "+ json[i].name)
      }
    })
  }
})*/




module.exports = router
