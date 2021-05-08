var express = require('express');
var cors = require('cors');
var multer = require('multer');
var upload = multer({storage: multer.memoryStorage()})
require('dotenv').config()

var app = express();

app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});


app.post('/api/fileanalyse', upload.single('upfile'), function (req, res) {
  console.log(req.file);
  var response = {};
  response["name"] = req.file.originalname;
  response["type"] = req.file.mimetype;
  response["size"] = req.file.size;
  res.send(response);
})


const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Your app is listening on port ' + port)
});
