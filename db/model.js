const mongoose= require("mongoose");
const passportLocalMongoose= require("passport-local-mongoose");

const userSchema= new mongoose.Schema({
    username: String,
    password: String
});

// plugins 

userSchema.plugin(passportLocalMongoose);

// models 
const user= mongoose.model("user", userSchema);

module.exports= user