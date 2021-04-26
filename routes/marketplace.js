const express = require('express')
const router = express.Router()
const bodyParser = require('body-parser')
const session = require('express-session');
const mongoose = require('mongoose')
const dotenv = require('dotenv');
const got = require('got');


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

router.get('/:id',function(req, res, next){
  Item.findById(req.params.id, function(err, item){
    res.render('item', {
      user:req.session.user,
      admin:req.session.admin,
      item:item,
    });
  });


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
