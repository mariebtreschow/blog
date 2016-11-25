const express = require('express'),
      pug = require('pug'),
      bodyParser = require('body-parser'),
      methodOverride = require('method-override'),
      displayRoutes = require('express-routemap'),
      session = require('express-session'),
      bcrypt = require('bcrypt');
      morgan = require('morgan');

var app = express(),
    db = require('./models');

var adminRouter = require('./routes/admin');

app.use(express.static('public'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false}));

app.use(methodOverride((req, res) => {
   if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      var method = req.body._method;

      delete req.body._method;
      return method;
   }})
);

app.use(session({
   name: 'maries-session-cookie',
   secret: 'secret key',
   resave: true,
   saveUninitialized: true
 }));

app.set('view engine', 'pug');

app.use('/admin', adminRouter);


app.post('/comments/:id', (req, res) => {
   var incomingComent = req.body;
   incomingComent.PostId = req.params.id;

   db.Comment.create(incomingComent).then((comment) => {
      return comment.getPost().then((post) => {
         res.redirect('/' + post.slug);
      });
   });
});

app.get('/', (req, res) => {
   console.log(req.session);
   db.Post.findAll({ order: 'id DESC' }).then((post) => {
     res.render('index', { posts: post });
  });
});

app.get('/register', (req, res) => {
   res.render('users/new');
});

app.post('/user', (req, res) => {
   db.User.create(req.body).then((user) => {
      res.redirect('/');
   }).catch((error) => {
      console.log(error);
      res.render('users/new', { errors: error.errors });
   });
});

app.get('/login', (req, res) => {
   res.render('login');
});

app.post('/login', (req, res) => {
   db.User.findOne({
      where: {
         email: req.body.email
      }
   }).then((userInDB) => {
      bcrypt.compare(req.body.password, userInDB.passwordDigest , (error, result) => {
         if (result) {
            req.session.user = userInDB;
            res.redirect('/admin/posts');
         } else {
            res.render('login', { error: { message: 'Password is not correct' } });
         }
      });
   }).catch((error) => {
      res.render('login', { error: { message: 'User not found in the database' } });
   });
});

app.get('/logout', (req, res) => {
   req.session.user = undefined;
   res.redirect('/');
});

app.get('/:slug', (req, res) => {
   db.Post.findOne({
       where: {
          slug: req.params.slug
      }
   }).then((post) => {
      post.getComments().then((comments) => {
         res.render('posts/show', {
            post: post,
            comments: comments,
            user: req.session.user
         });
      });
   });
});

db.sequelize.sync({force:false}).then(() => {
   app.listen(3000, (req, res) => {
      console.log('App listening on 3000!');
      displayRoutes(app);
   });
});
