const express = require('express');
const bodyParser = require('body-parser');
const shortid = require('shortid');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('./config')

app.use(bodyParser.json());
app.use(cors());

mongoose.connect(config.MONGOURI, { useNewUrlParser: true });

const linkSchema = new mongoose.Schema({
  id: { type: String, required: true},
  url: { type: String, required: true },
  expiration: { type: Date, required: true }
});

const Link = mongoose.model('Link', linkSchema);

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.sendStatus(401);
    return;
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      console.error(err);
      res.sendStatus(403);
      return;
    }

    req.user = user;
    next();
  });
};

app.post('/link', authenticate, (req, res) => {
  const { url } = req.body;
  const id = shortid.generate();
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 30);

  const link = new Link({ id, url, expiration });
  link.save((err) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      res.send({ id });
    }
  });
});

app.get('/:id', authenticate, (req, res) => {
  const { id } = req.params;

  Link.findOne({ id, expiration: { $gt: new Date() } }, (err, link) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else if (link) {
      res.redirect(link.url);
    } else {
      res.sendStatus(404);
    }
  });
});

app.listen(3000, () => {
  console.log('Link shortener service listening on port 3000');
});
