const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(express.urlencoded({extended: false}));

mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const exerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    require: true
  },
  duration: {
    type: Number,
    require: true
  },
  date: Date
});
const User = mongoose.model('User', new mongoose.Schema({
  username: {
    type: String,
    require: true,
    unique: true
  },
  log: [exerciseSchema]
}));


// api to create new user
app.post('/api/exercise/new-user', (req, res) => {
  console.log(req.body.username);
  uname = req.body.username;
  if (uname === "") {
    res.send("Path `username` is required.")
  }
  else {        
    let obj = {username: uname};
    User.findOneAndUpdate(
      obj,
      {$setOnInsert: obj}, // only update if object is not found (i.e only insert)
      {
        fields: 'username _id', // project these fields
        upsert: true, // insert if not found
        new: true, // return updated object
        runValidators: true, // validify data
        rawResult: true // to access lastErrorObject.updatedExisting
      },
      (err, doc) => {
        if (err) {res.send({error: err});}

        // indicates that the username was found in the db
        else if (doc.lastErrorObject.updatedExisting) {
          res.send("Username already taken");
        }

        else {
          res.send(doc.value);
        }
      }
    );
  }
});

// api to add log
app.post('/api/exercise/add', (req, res) => {
  // set date object based on whether user passed any date
  var date = !req.body.date ? new Date() : new Date(req.body.date);

  if (Number.isNaN(date.getTime())) {res.send("Invalid date");}
  else if (!req.body.userId.match(/^[0-9a-fA-F]{24}$/)) {res.send('Invalid userId');}
  else if (req.body.description === "") {res.send("Path `description` is required.");}
  else if (req.body.duration === "") {res.send("Path `duration` is required.");}
  else if (isNaN(req.body.duration)) {res.send('Invalid duration');}

  else {
    var userId = mongoose.Types.ObjectId(req.body.userId);
    var obj = {
      description: req.body.description,
      duration: new Number(req.body.duration),
      date: date
    };    
    User.findByIdAndUpdate(
      userId,
      {$push: {
        log: obj
      }},
      {
        fields: 'username _id', // project these fields
        new: true, // return updated object
        runValidators: true, // validify data
      },
      (err, doc) => {
        if (err) {res.send({error: err});}
        else if (doc == null) {res.send("Unknown userId");}
        else if (doc) {
          res.send(Object.assign(doc.toObject(), obj, {date: date.toDateString()}));
        }
      }
    );
  }
});

// api to list all users
app.get('/api/exercise/users', (req, res) => {
  User.find({}, '_id username' , (err, doc) => {
    if (err) {res.send({error: err});}
    else {res.send(doc);}
  })
});

function isValidDateString(dateString) {
  let date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? false : true;
}

// api to get exercise logs of given user (using query string)
app.get('/api/exercise/log', (req, res) => {
  if (!req.query.userId) {res.send("Query parameter 'userId' is required");}
  else if(!req.query.userId.match(/^[0-9a-fA-F]{24}$/)) {res.send("Invalid 'userId'");}
  else if (req.query.from && !isValidDateString(req.query.from)) {res.send("Invalid 'from' date");}
  else if (req.query.to && !isValidDateString(req.query.to)) {res.send("Invalid 'to' date");}
  else if (req.query.limit && isNaN(req.query.limit)) {res.send("Invalid 'limit'");}
  else {
    // ignore __v and log._id
    let query = User.findById(mongoose.Types.ObjectId(req.query.userId), '-__v -log._id');

    // used to append to doc before sending to user
    var dateRange = {};

    // conditional date range
    query.elemMatch('log', function (elem) {
      if (req.query.from) {
        elem.where('date').gte(new Date(req.query.from));
        dateRange['from'] = req.query.from;
      }
      if (req.query.to) {
        elem.where('date').lte(new Date(req.query.to));
        dateRange['to'] = req.query.to;
      }      
    });

    // conditional limit
    if (req.query.limit) {
      query.limit(new Number(req.query.limit));
    }
    query.exec((err, doc) => {
      if (err) {res.send({error: err});}
      else if (doc == null) {res.send("Unknown userId");}
      else {
        // add count and send
        res.send(Object.assign(doc.toObject(), {count: doc.log.length}, dateRange));
      }
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
