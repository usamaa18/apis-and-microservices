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
const User = mongoose.model('User', new mongoose.Schema({
  username: {
    type: String,
    require: true,
    unique: true
  },
  exercises: [{
    description: {
      type: String,
      require: true
    },
    duration: {
      type: Number,
      require: true
    },
    date: Date
  }]
}));

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
          res.send(doc);
        }
      }
    );
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
