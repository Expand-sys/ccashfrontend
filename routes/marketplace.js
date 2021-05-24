const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const session = require("express-session");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const got = require("got");
const { ensureAuthenticated } = require("../config/auth.js");
let db;

function mongo() {
  if (process.env.MONGO) {
    console.log(process.env.MONGO);
    mongoose.connect(process.env.MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
    });

    let db = mongoose.connection;
    db.once("open", function () {
      console.log("Connected to MongoDB");
    });

    //check for DB errors
    db.on("error", function (err) {
      console.log(err);
    });
  }
}

mongo();

let Item = require("../schemas/item");
let Listing = require("../schemas/listing");
let Inventory = require("../schemas/inventory");

router.all("*", function (req, res, next) {
  console.log(req.method, req.url);
  next();
});

router.get("/", function (req, res) {
  let columns = [0, 1, 2, 3];
  Item.find({}, function (err, items) {
    if (err) {
      console.log(err);
    } else {
      res.render("marketplace", {
        columns: columns,
        items: items,
        user: req.session.user,
        admin: req.session.admin,
        marketplace: process.env.MARKETPLACE,
        random: papy(),
      });
    }
  });
});

router.get("/marketdash", ensureAuthenticated, function (req, res) {
  Inventory.findOne({ user: req.session.user }, async function (
    err,
    inventory
  ) {
    if (!inventory) {
      let newinv = new Inventory();
      newinv.user = req.session.user;
      newinv.save(function (err) {
        if (err) {
          console.log(err);
          return;
        } else {
          console.log("created new inventory for " + req.session.user);
        }
      });
    }

    res.render("marketdash", {
      user: req.session.user,
      admin: req.session.admin,
      inventory: inventory,
      marketplace: process.env.MARKETPLACE,
      random: papy(),
    });
  });
});

router.get("/:id", function (req, res) {
  Item.findById(req.params.id, function (err, item) {
    Listing.find({ foreignid: req.params.id }, function (err, listings) {
      console.log(listings);

      res.render("item", {
        listings: listings,
        user: req.session.user,
        admin: req.session.admin,
        item: item,
        marketplace: process.env.MARKETPLACE,
        random: papy(),
      });
    });
  });
});

router.get("/:id/list", ensureAuthenticated, function (req, res) {
  Item.findById(req.params.id, function (err, item) {
    res.render("itemlist", {
      user: req.session.user,
      admin: req.session.admin,
      item: item,
      marketplace: process.env.MARKETPLACE,
      random: papy(),
    });
  });
});
router.get("/:id/buy", ensureAuthenticated, function (req, res) {
  Listing.find({ foreignid: req.params.id }, function (err, listings) {
    console.log(listings);

    res.render("itembuy", {
      listings: listings,
      user: req.session.user,
      admin: req.session.admin,
      marketplace: process.env.MARKETPLACE,
      random: papy(),
    });
  });
});

router.post("/:id/list", ensureAuthenticated, async function (req, res) {
  let body = req.body;
  let item = JSON.parse(req.body.item);
  console.log(item);
  let listing = new Listing();
  listing.itemId = item.itemId;
  listing.meta = item.meta;
  listing.name = item.name;
  listing.foreignid = item._id;
  listing.price = body.price;
  listing.amount = body.amount;
  listing.seller = req.session.user;
  listing.save(function (err) {
    if (err) {
      console.log(err);
      return;
    } else {
      console.log("added " + listing.name + " from " + listing.seller);
    }
  });
  let inventory = await Inventory.findOne({ user: req.session.user }).exec();
  if (inventory == null) {
    let newinv = new Inventory();
    newinv.user = req.session.user;
    newinv.listings = listing;
    newinv.save(function (err) {
      if (err) {
        console.log(err);
        return;
      } else {
        console.log("created new inventory for " + req.session.user);
      }
    });
  } else {
    inventory.listings.push(listing);
    inventory.save(function (err) {
      if (err) {
        console.log(err);
        return;
      } else {
        console.log("pushed new listing");
      }
    });
  }
  res.redirect("/marketplace/marketdash");
});
router.post("/:id/buy", async function (req, res) {
  Listing.findOne({ _id: req.params.id }, async function (err, listing) {
    let inventory = await Inventory.findOne({ user: req.session.user }).exec();
    if (inventory == null) {
      let newinv = new Inventory();
      newinv.user = req.session.user;
      newinv.purchases = listing;
      newinv.save(function (err) {
        if (err) {
          console.log(err);
          return;
        } else {
          console.log("created new inventory for " + req.session.user);
        }
      });
    } else {
      inventory.purchases.push(listing);
      inventory.save(function (err) {
        if (err) {
          console.log(err);
          return;
        } else {
          console.log("pushed new purchase");
        }
      });
    }
    Listing.findOneAndRemove({ _id: req.params.id }).exec();
    transfer = got.post(process.env.BANKAPIURL + "BankF/sendfunds", {
      json: {
        a_name: req.session.user,
        b_name: listing.seller,
        amount: parseInt(listing.amount * listing.price),
        attempt: req.session.password,
      },
      responseType: "json",
    });
    res.redirect("/marketplace/marketdash");
  });
});

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
function papy() {
  const rndInt = Math.floor(Math.random() * 1337);
  let random = false;
  if (rndInt == 420) {
    random = true;
  }
  return random;
}
module.exports = router;
