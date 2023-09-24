require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { engine } = require("express-handlebars");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const googleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require('mongoose-findorcreate')
const jwt = require("jsonwebtoken");

const app = express();
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const port = process.env.PORT || 8000
app.use(express.static(__dirname + "/public"));
app.use(passport.initialize());
app.use(passport.session());

// template engines 

app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./views")

// connecting to  the database 

mongoose.connect("mongodb://127.0.0.1:27017/Secret")
    .then(() => { console.log("database connected successfully") })
    .catch((err) => { console.log(err) });

// create schema and model 

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    tokens: [
        { token: String }
    ]
});

userSchema.methods.generateToken = async function () {
    try {
        const token = await jwt.sign({ _id: this._id }, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat([{ token: token }]);
        await this.save();
        return token;
    } catch (error) {
        console.log(error)
    }
}

// plugins 

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// models 
const user = mongoose.model("user", userSchema);
const Secret = require("./db/model");

// authentication of model 
passport.use(user.createStrategy())
// create google  strategy 
passport.use(new googleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/secrets",
    userProfileUrl: "https://googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        user.findOrCreate({ googleId: profile.id, username: profile.emails[0].value }, function (err, user) {
            return cb(err, user);
        });
    }
));
// searialize and deserialize 
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
    try {
        const User = await user.findById(id);
        done(null, User);
    } catch (err) {
        done(err, null)
    }
});

// middlewadre 

async function auth(req, res, next) {
    try {
        const token = req.cookies.jwt;
        const tokenUser = await jwt.verify(token, process.env.SECRET_KEY);
        req.token = token;
        req.user = await user.findOne({ _id: tokenUser._id });
        next()
    } catch (error) {
        res.redirect("/secrets")
    }
}

// routes 

app.get("/", (req, res) => {
    try {
        res.render("home")
    } catch (error) {
        console.log(error);
    }
})

app.get("/register", (req, res) => {
    try {
        res.render("register")
    } catch (error) {
        console.log(error);
    }
})

app.post("/register", (req, res) => {
    user.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            if (err.name === "UserExistsError") {
                res.redirect("/login")
            }
        } else {
            passport.authenticate("local", { failureRedirect: "/login" })(req, res, async function () {
                const token = await user.generateToken();
                res.cookie("jwt", token, { expires: new Date(Date.now() + 30000) })
                res.redirect("/secrets")
            })
        }
    })
})

app.get("/login", (req, res) => {
    try {
        res.render("login")
    } catch (error) {
        console.log(error);
    }
})

app.post("/login", (req, res) => {
    const fillUser = new user(req.body)
    req.login(fillUser, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local", { failureRedirect: "/login" })(req, res, async function () {
                const token = await req.user.generateToken();
                res.cookie("jwt", token, { expires: new Date(Date.now() + 120000), httpOnly: true })
                res.redirect("/secrets")
            })
        }
    })
})

app.get("/secrets", async (req, res) => {
    try {
        if (req.isAuthenticated) {
            if (req.user) {
                let secrets_list = [];
                const secretList = await Secret.find({}, { _id: 0, secret: 1 });
                secretList.forEach((element) => {
                    secrets_list.push(element.secret)
                })
                res.render("homePage", { secretsDoc: secrets_list })
            } else {
                res.redirect("/login")
            }
        } else {
            res.redirect("/login")
        }
    } catch (error) {
        console.log(error)
    }
})

app.get("/secrets/write", auth, async (req, res) => {
    try {
        const secretList = [];
        const secret_list = await Secret.find({ email: req.user.username }, { _id: 0, secret: 1 });
        secret_list.forEach((element) => {
            secretList.push(element.secret)
        });
        res.render("newSecret", { secrets: secretList })
    } catch (error) {
        console.log(error)
    }
})

app.post("/secrets/write", async (req, res) => {
    try {
        if (req.user) {
            const newSec = new Secret({ email: req.user.username, secret: req.body.secret });
            await newSec.save();
            const secret_list = await Secret.find({ email: req.user.username }, { _id: 0, secret: 1 });
            res.send(secret_list)
        }
    } catch (error) {
        console.log(error)
    }
})

app.get("/logout", auth, async (req, res) => {
    req.user.tokens= req.user.tokens.filter((element)=>{
        return element.token !== req.token
    })
    await req.user.save()
    req.logout(function (err) {
        if (err) {
            console.log(err)
        } else {
            res.redirect("/")
        }
    })
})

// now handling the google oauth authentication 

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }))

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.listen(port, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log(`server started on the port: ${port}`);
    }
});