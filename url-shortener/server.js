require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

// set-up body-parser middleware
app.use(bodyParser.urlencoded({extended: false}));


// inititalize mongoDB connection
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useFindAndModify', false);
const Link = mongoose.model('Link', new mongoose.Schema({
  original_url: {
    type: String,
    unique: true,
    required: true
  },
  short_url: {
    type: Number,
    unique: true,
    required: true
  }
}));


// copied from https://www.w3resource.com/javascript-exercises/javascript-regexp-exercise-9.php
function is_url(str)
{regexp =  /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
  if (regexp.test(str)) {return true;}
  else {return false;}
}

app.post('/api/shorturl/new', (req, res) => {
  console.log(req.body.url);
  let url = req.body.url;
  var obj = {}
  if (!is_url(url)) {
    res.send({error: 'Invalid URL'});
  } else {
    obj['original_url'] = url;
    Link.countDocuments({}, (err, count) => {
      if (err) {res.send({error: err});}
      obj['short_url'] = count + 1;
      Link.findOneAndUpdate(
        {original_url: url},
        {$setOnInsert: obj},
        {upsert: true, new: true, runValidators: true},
        (err, doc) => {
          if (err) {res.send({error: err});}
          else {res.send(obj);}
        }
      );
    });
  }
});

app.get('/api/shorturl/:short_url', (req, res) => {
  Link.findOne({short_url: req.params.short_url}, (err, doc) => {
    if (err) {res.send({error: err});}
    else if (doc) {res.redirect(doc.original_url);}
    else {res.send({error: "No short URL found for the given input"});}
  });
})


