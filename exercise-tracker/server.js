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
app.post('/api/users', (req, res) => {
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
app.post('/api/users/:_id/exercises', (req, res) => {
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
app.get('/api/users', (req, res) => {
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
app.get('/api/users/:_id/logs', (req, res) => {
  if (!req.params._id) {res.send("Query parameter 'userId' is required");}
  else if(!req.params._id.match(/^[0-9a-fA-F]{24}$/)) {res.send("Invalid 'userId'");}
  // else if (req.query.from && !isValidDateString(req.query.from)) {res.send("Invalid 'from' date");}
  // else if (req.query.to && !isValidDateString(req.query.to)) {res.send("Invalid 'to' date");}
  // else if (req.query.limit && isNaN(req.query.limit)) {res.send("Invalid 'limit'");}
  else {
    // Using $slice does not seem to work.
    // Reason: https://docs.mongodb.com/manual/reference/operator/projection/slice/#path-collision---slice-of-an-array-and-embedded-fields
    let query = User.findById(mongoose.Types.ObjectId(req.params._id), '-__v -log._id');

    // used to append to doc before sending to user
    var dateRange = {};

    // conditional date range
    query.elemMatch('log', function (elem) {
      var tempDate;
      if (req.query.from && isValidDateString(req.query.from)) {
        tempDate = new Date(req.query.from);
        elem.where('date').gte(tempDate);
        dateRange['from'] = tempDate.toDateString();
      }
      if (req.query.to && isValidDateString(req.query.to)) {
        tempDate = new Date(req.query.to);
        elem.where('date').lte(tempDate);
        dateRange['to'] = tempDate.toDateString();
      }      
    });


    query.exec((err, doc) => {
      if (err) {res.send({error: err});}
      else if (doc == null) {res.send("Unknown userId");}
      else {
        let docJson = doc.toObject();
        // conditional limit
        // not the best implementation as all exercises are downloaded anyway
        if (req.query.limit && !isNaN(req.query.limit)) {
          docJson.log = docJson.log.slice(0, new Number(req.query.limit));
        }
        // format date of each exercise
        docJson.log.forEach(val => {val["date"] = val['date'].toDateString();});
        // add count and send
        res.send(Object.assign(docJson, {count: docJson.log.length}, dateRange));
      }
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
