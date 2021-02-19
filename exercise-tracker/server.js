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
  exercises: [exerciseSchema]
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

// api to add exercises
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
        exercises: obj
      }},
      {
        fields: 'username _id', // project these fields
        new: true, // return updated object
        runValidators: true, // validify data
      },
      (err, doc) => {
        if (err) {res.send({error: err});}
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

app.get('/api/exercise/log?:userId&:from?&:to?&:limit?', (req, res) => {

});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
