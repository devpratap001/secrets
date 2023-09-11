require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { engine } = require("express-handlebars");
const session = require("express-session");
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")

const app = express();
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    password: String
});

// plugins 

userSchema.plugin(passportLocalMongoose);

// models 
const user = mongoose.model("user", userSchema);

// authentication of model 
passport.use(user.createStrategy())
// searialize and deserialize 
passport.serializeUser(user.serializeUser())
passport.deserializeUser(user.deserializeUser())

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
            passport.authenticate("local", { failureRedirect: "/login" })(req, res, function () {
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
            passport.authenticate("local", { failureRedirect: "/login" })(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
})

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated) {
        res.render("homePage")
    } else {
        res.redirect("/login")
    }
})

app.get("/logout", (req, res) => {
    req.logout(function (err) {
        if (err) {
            console.log(err)
        } else {
            res.redirect("/")
        }
    })
})

app.listen(port, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log(`server started on the port: ${port}`);
    }
});