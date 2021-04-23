const express = require('express');
const open = require('open');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const authTokens = {};
app.use(cors());
app.use(express.static('docs'));

const users = [
    // This user is added to the array to avoid creating a new user on each restart
    {
        firstName: 'John',
        lastName: 'Doe',
        email: 'johndoe@email.com',
        // This is the SHA256 hash for value of `password`
        password: 'XohImNooBHFR0OVvjcYpJ3NgPQ1qq73WKhHvch0VQtg=',
    },
];

const getHashedPassword = (password) => {
    const sha256 = crypto.createHash('sha256');
    const hash = sha256.update(password).digest('base64');
    return hash;
};

const generateAuthToken = () => {
    return crypto.randomBytes(30).toString('hex');
};

// create express app

app.use(cookieParser());

app.use((req, res, next) => {
    // Get auth token from the cookies
    const authToken = req.cookies['AuthToken'];

    // Inject the user to the request
    req.user = authTokens[authToken];

    next();
});

app.engine('hbs', exphbs({
    extname: '.hbs',
}));
app.set('view engine', 'hbs');

// Setup server port
// const port = process.env.PORT || 5000;

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

// parse requests of content-type - application/json
app.use(bodyParser.json());

// define a root route

// Require employee routes
const citiesRoutes = require('./routes/cities.routes');

// using as middleware
app.use('/api/v1/cities', citiesRoutes);

app.get('/home', (req, res) => {
    res.render('home');
});

app.get('/register', (req, res) => {
    res.render('register');
});
app.post('/register', (req, res) => {
    const {
        email, firstName, lastName, password, confirmPassword,
    } = req.body;

    // Check if the password and confirm password fields match
    if (password === confirmPassword) {
        // Check if user with the same email is also registered
        if (users.find((user) => user.email === email)) {
            res.render('register', {
                message: 'User already registered.',
                messageClass: 'alert-danger',
            });

            return;
        }

        const hashedPassword = getHashedPassword(password);

        // Store user into the database if you are using one
        users.push({
            firstName,
            lastName,
            email,
            password: hashedPassword,
        });

        res.render('login', {
            message: 'Registration Complete. Please login to continue.',
            messageClass: 'alert-success',
        });
    } else {
        res.render('register', {
            message: 'Password does not match.',
            messageClass: 'alert-danger',
        });
    }
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = getHashedPassword(password);

    const user = users.find((u) => {
        return u.email === email && hashedPassword === u.password;
    });

    if (user) {
        const authToken = generateAuthToken();

        // Store authentication token
        authTokens[authToken] = user;

        // Setting the auth token in cookies
        res.cookie('AuthToken', authToken);

        // Redirect user to the protected page
        res.redirect('/protected');
    } else {
        res.render('login', {
            message: 'Invalid username or password',
            messageClass: 'alert-danger',
        });
    }
});

app.get('/protected', (req, res) => {
    if (req.user) {
        res.render('protected');
    } else {
        res.render('login', {
            message: 'Please login to continue',
            messageClass: 'alert-danger',
        });
    }
});

app.set('port', process.env.PORT || 8000);
app.set('ip', process.env.NODEJS_IP || '127.0.0.1');

app.listen(app.get('port'), () => {
    console.log('%s: Node server started on %s ...', Date(Date.now()), app.get('port'));
    open('http://localhost:8000/home');
});
