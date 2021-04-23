const express = require('express');
const router = express.Router();
const path = require('path');
const {ensureAuthenticated} = require("../config/auth.js")
const {checkAdmin} = require ("../config/admin.js")
var pug = require('pug');
const flash = require ('connect-flash');
const expressValidator = require('express-validator');
const session = require('express-session');
const {postUser} = require('../helpers/functions.js')
const got = require('got')
const MemoryStore = require('memorystore')(session)
console.log('Sen was here')


router.get('/', checkAdmin, function(req, res){
  res.render('adminsettings', {
    user: req.session.user,
    admin: req.session.admin,
  })

});


router.post('/user',checkAdmin , async function(req,res){
  let {name, init_pass, init_bal, password2} = req.body
  let contains = await got(process.env.BANKAPIURL+'BankF/contains/'+name)
  contains = JSON.parse(contains.body).value
  let errors = [];
  let successes = [];
  if(contains == true){
    errors.push({msg: 'User already exists'})
    res.render('adminsettings',{
      errors:errors
    })
  }else {
    if(!name || !init_pass || !init_bal || !password2) {
        errors.push({msg : "please fill in all fields"});
    }
    //check if match
    if(init_pass !== password2) {
        errors.push({msg : "Passwords don't match"});
    }

    //check if password is more than 6 characters
    if(init_pass.length < 6 ) {
        errors.push({msg : 'Password must be at least 6 characters'})
    }
    let post;
    let successes = [];
    try{
      post = await got.post(process.env.BANKAPIURL+'BankF/admin/user',{
        json:{
          name: name,
          attempt: req.session.adminp,
          init_bal: parseInt(init_bal),
          init_pass: init_pass,
        },
        responseType:'json'
      })
    } catch(err){
      console.log(err)
    }
    if(post.body.value == true){
      successes.push({msg: "Account Creation Successful"})
    }
  }
  res.render('adminsettings',{
    user: req.session.user,
    admin: req.session.admin,
    successes: successes,
  })
})


router.post('/baluser',checkAdmin , async function(req,res){
  let {name} = req.body
  let balance;
  let successes = [];
  let errors = [];
  try{
    balance = await got(process.env.BANKAPIURL+'BankF/'+name+'/bal')
    balance = JSON.parse(balance.body)
  } catch(err){
    console.log(err)
  }
  if(balance.value == -1 || balance.value == undefined){
    errors.push({msg: "User not found"})
  }else{
    successes.push({msg: "User: "+name+" has "+balance.value+" monies"})
  }
  res.render('adminsettings',{
    user: req.session.user,
    admin: req.session.admin,
    successes: successes,
    errors: errors,
  })
})


router.post('/bal',checkAdmin , async function(req,res){
  let {name, amount} = req.body
  let patch;
  let successes = [];
  try{
    patch = await got.patch(process.env.BANKAPIURL+'BankF/admin/'+name+'/bal',{
      json:{
        name: name,
        attempt: req.session.adminp,
        amount: parseInt(amount),
      },
      responseType:'json'
    })
  } catch(err){
    console.log(err)
  }
  if(patch.body.value == true){
    successes.push({msg: "Change Funds Successful"})
  }
  res.render('adminsettings',{
    user: req.session.user,
    admin: req.session.admin,
    successes: successes,
  })
})
router.post('/userdelete', checkAdmin, async function(req,res){
  let {name, attempt} = req.body
  console.log(name)
  let contains = await got(process.env.BANKAPIURL+'BankF/contains/'+name)
  contains = JSON.parse(contains.body).value
  let deleteUser;
  let successes = [];
  let errors = [];
  if(attempt != req.session.adminp){
    errors.push({msg:"Wrong Admin Password"})
  }
  console.log(contains)
  if(contains == true){
    deleteUser = got.delete(process.env.BANKAPIURL+'BankF/admin/user',{
      json:{
        name: name,
        attempt: attempt,
      },
      responseType:'json'
    })
    successes.push({msg: "User Deletion Successful"})
  } else{
    errors.push({msg: "User Deletion Failed, User Not Found"})
  }
  res.render('adminsettings',{
    user: req.session.user,
    admin: req.session.admin,
    successes: successes,
    errors: errors,
  })
})
router.post('/destroyallsessions', checkAdmin, async function(req,res) {
  let {attempt} = req.body;
  let adminTest
  let errors = []
  try{
    adminTest = await got.post(process.env.BANKAPIURL+'BankF/admin/vpass',{
      json:{
        attempt: attempt,
      },
      responseType:'json'
    })
  } catch(err){
    console.log(err)
  }
  console.log(adminTest.body.value)
  if(adminTest){
    req.sessionStore.clear(function(err){
      console.log(err)
    })
    res.redirect('/')
  }else{
    errors.push({msg: "failed admin password check"})
    res.render("adminsettings",{
      user: req.session.user,
      admin: req.session.admin,
      errors: errors,
    })
  }

})
router.post('/close', checkAdmin, async function(req,res){
  let {attempt} = req.body;
  let close;
  close = got.post(process.env.BANKAPIURL+'BankF/admin/close', {
    json:{
      attempt: attempt,
    },
    responseType:'json'
  })
  res.redirect('../')
})



module.exports = router;
