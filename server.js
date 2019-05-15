'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var dns = require('dns');
var url = require("url");
var bodyParser = require('body-parser');

var cors = require('cors');

var app = express();
// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useNewUrlParser: true});

app.use(cors());
var URLSchema = new Schema({
  original_URL : {
    type: String,
    unique: true
  },
  shorten_URL : { 
    type: Number,
    default: 0,
    unique : true
  }
});

var URL = mongoose.model('URL', URLSchema);
/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});



app.post("/api/shorturl/new",async function (req, res) {
  console.log('Mongo state: ' + mongoose.connection.readyState);
  let reqURL = req.body.url;
  var urlParse = url.parse(reqURL);
  var host = urlParse.hostname;
  var lookupResult = await lookup(host);
  console.log(findURL(reqURL));
  if(lookupResult != null) {
    var findURLResult = await findURL(reqURL);
    console.log('Find' + findURLResult);
    if(findURLResult != null) res.json({"original_url":findURLResult.original_URL,"short_url":findURLResult.shorten_URL});
    else {
      var lastData = await getLastElement();
      var newData = new URL({original_URL: reqURL, shorten_URL: lastData[0].shorten_URL + 1});
      URL.create(newData, (error, data) => {
        if(error) console.log('Error ' + error);
        res.json({"original_url":data.original_URL,"short_url":data.shorten_URL});
      });
    }
  }
  else res.json({"error":"invalid URL"});
});

async function findURL(url) {
  return new Promise((resolve, reject) => {
    URL.findOne({original_URL : url}, (error, data) => {
      if(error) reject(error);
      resolve(data);
    });
  });

}


async function getLastElement() {
  return new Promise((resolve, reject) => {
    URL.find().sort({_id: -1}).limit(1).exec((error, data) => {
      if(error) reject(error);
      resolve(data);
    });
  });
}



async function lookup(host) {
  return new Promise((resolve, reject) => {
    dns.lookup(host, (error, address) => {
      if(error) reject(error);
      resolve(address);
    });
  });
}


app.listen(port, function () {
  console.log('Mongo state: ' + mongoose.connection.readyState);
  console.log('Node.js listening on ' + port);
});