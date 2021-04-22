const express = require('express');
const path = require('path');
const https = require('https')
const got = require('got')
const bodyParser = require('body-parser')
const expressValidator = require('express-validator');
const flash = require ('connect-flash');
const session = require('express-session');
const {postUser} = require('./helpers/functions.js')
const {ensureAuthenticated} = require("./config/auth.js")
const app = express();
const MemoryStore = require('memorystore')(session)
const url = require('url')
const dotenv = require('dotenv');
const fs = require('fs');
const mongoose = require('mongoose')
let Log = require('./schemas/log.js');

dotenv.config();
//mongodb connection
const connectionString = process.env.MONGO

mongoose.connect(connectionString,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
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



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(flash());
app.use(require('connect-flash')());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json())
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(function(req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});
app.set('trust proxy', 1) // trust first proxy
let secure = false
if(process.env.SECURE=='true'||process.env.SECURE=='True'||process.env.SECURE=='TRUE'){secure = true}
let setup = false
if(process.env.SETUP=='true'||process.env.SETUP=='True'||process.env.SETUP=='TRUE'){setup=true}
app.use(session({
  secret: 'fuck shit cunt',
  resave: true,
  store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
  saveUninitialized: true,
  cookie: { secure: secure, maxAge: 86400000 },
}))
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
    var namespace = param.split('.')
    , root    = namespace.shift()
    , formParam = root;

    while(namespace.length){
      formParam += '[' + namespace.shift() + ']';
    }
    return{
      param : formParam,
      msg   : msg,
      value : value
      };
  }
}));
app.post('/setup', async function(req, res){
  console.log(req.body)
  let mongo = req.body.mongo;
  process.env.MONGO = mongo
  let apiurl = 'BANKAPIURL='+req.body.url
  process.env.BANKAPIURL = req.body.url
  let banksecure = 'SECURE=false'
  process.env.SECURE = false
  if(req.body.secure){
    banksecure = 'SECURE=true'
    process.env.SECURE = true
  }
  process.env.SETUP = true
  fs.writeFileSync('.env', apiurl+'\n'+banksecure+'\n'+mongo+'\nSETUP=true')
  dotenv.config();

  res.redirect('/')
})
app.get('/', async function(req, res){
  if(setup==false){
    res.render('setup')
  }else{

    let checkalive;
    try{
      checkalive = await got(process.env.BANKAPIURL+'BankF/help')
    } catch(err){
      console.log(err)

    }
    let alive = false;
    try{
      if(checkalive.body){
        alive = true
      }
    }catch(err){
      console.log(err)
    }

    res.render('index', {
      user: req.session.user,
      admin: req.session.admin,
      alive: alive
    })
  }
});
app.get('/BankF', ensureAuthenticated, async function(req, res){
  let successes = [];
  if(req.session.sucess == true){
    successes.push({ msg: "Transfer successful"})
  }
  let admin
  try{
    admin = req.session.admin;
  }catch(err){
    console.log(err)
  }
  let balance = 0
  try{
    balance = await got(process.env.BANKAPIURL+'BankF/'+req.session.user+'/bal')
    balance = JSON.parse(balance.body)
  } catch(err){
    console.log(err)
  }
  console.log('mongologs '+Date.now())
  let logsent = await Log.find({sender:req.session.user}).exec()
  let logrec = await Log.find({receiver:req.session.user}).exec()
  console.log('mongologs '+Date.now())




  try{
    console.log('twixlogs '+Date.now())
    logstwix = await got.post(process.env.BANKAPIURL+'BankF/'+req.session.user+'/log',{
      json:{
        attempt: 'test123'
      },
      responseType:'json'
    })
    console.log('twixlogs '+Date.now())
  } catch(e) {
      console.log(e)
  }




  res.render('bankf',{
    logrec:logrec,
    logsent:logsent,
    user: req.session.user,
    balance: balance.value,
    user: req.session.user,
    admin: req.session.admin,
    sucesses: successes,
  })
});


app.post('/sendfunds', async function(req, res){
  let balance = 0;
  try{
    balance = await got(process.env.BANKAPIURL+'BankF/'+req.session.user+'/bal')
    balance = JSON.parse(balance.body)
  } catch(err){
    console.log(err)
  }
  let {amount, name, senderpass} = req.body
  let a_name = req.session.user
  let successes = [];
  let errors = [];
  let result = {}
  result = await got.post(process.env.BANKAPIURL+'BankF/sendfunds',{
    json:{
      a_name: a_name,
      b_name: name,
      amount: parseInt(amount),
      attempt: senderpass
    },
    responseType:'json'
  })
  if(result.body.value == true || result.body.value){
    req.session.success = true;
    let log = new Log();
    //post details
    log.sender = a_name;
    log.receiver = name;
    log.amount = parseInt(amount);
    log.date = new Date();
    log.save(function(err){
      if(err){
        console.log(err);
        return;
      }
    })
    res.redirect('/BankF')
  } else {
    errors.push({msg: "Transfer Unsuccessful"})
    let logsent = await Log.find({sender:req.session.user}).sort({date: -1}).exec()
    let logrec = await Log.find({receiver:req.session.user}).sort({date: -1}).exec()



    res.render("bankf",{
      logsent:logsent,
      logrec:logrec,
      errors:errors,
      successes: successes,
      balance:balance.value,
      user: req.session.user,
      admin: req.session.admin,
    })
  }
})

app.post('/register', async function(req, res){
  var {name, password, password2} = req.body;
  let checkuser = await got(process.env.BANKAPIURL+'BankF/contains/'+name)
  checkuser = JSON.parse(checkuser.body).value
  let errors = [];
  let successes = [];
  if(checkuser == false){
    if(!name || !password || !password2) {
        errors.push({msg : "please fill in all fields"});
    }
    if(password !== password2) {
        errors.push({msg : "Passwords don't match"});
    }
    if(password.length < 6 ) {
        errors.push({msg : 'Password must be at least 6 characters'})
    }
    if(errors[0]){
      res.render('register', {
        errors:errors
      })
    } else {
      if(postUser(name, password)){
        successes.push({msg:"User Registered Please Log In"})
        res.render('login',{
          errors:errors,
          successes: successes,
        })
      }
    }
  } else {
    errors.push({msg: "User already exists"})
    res.render('register',{
      errors:errors,
    })
  }
})

app.post('/login', async function(req, res){
  if(req.session.user){
    res.redirect("/")
  }
  let {name,password} = req.body
  let adminTest;
  let errors = [];
  try{
    adminTest = await got.post(process.env.BANKAPIURL+'BankF/admin/vpass',{
      json:{
        attempt: password,
      },
      responseType:'json'
    })
  } catch(err){
    console.log(err)
  }
  req.session.admin = adminTest.body.value
  req.session.adminp = password
  let verified
  try{
    verified = await got.post(process.env.BANKAPIURL+'BankF/vpass', {
      json:{
        name: name,
        attempt: password
      },
      responseType:'json'

    })


  } catch(err){
    console.log(err)
  } finally {
    console.log(verified.body.value)
    if(verified.body.value == 0){
      errors.push({msg: 'Password wrong'})
      res.render('login',{
        errors:errors
      })
    }else if(verified.body.value == 1){
      req.session.user = name;
      console.log(req.session.user)
      res.redirect('/BankF')
    } else {
      errors.push({msg: 'User not found'})
      res.render('login',{
        errors:errors
      })
    }
  }

  //res.redirect('/login')
})


let admin = require('./routes/admin');
app.use('/admin', admin);

let settings = require('./routes/settings');
app.use('/settings', settings)





app.get('/logout', function(req, res){
  req.session.regenerate(function(err) {
    res.render('login', {
    })
  })
});


app.get('/login', function(req, res){
  req.session.regenerate(function(err) {
    res.render('login', {
      user: req.session.user,
    })
  })
});

app.get('/register', function(req, res){
  res.render('register', {
    user: req.session.user,
    admin: req.session.admin,
  })

});



app.listen(process.env.PORT || 3000, function(){
  console.log('Server started on port 3000...');
});
