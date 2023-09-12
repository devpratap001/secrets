const mongoose= require("mongoose");

const secretSchema= new mongoose.Schema({
    email: String,
    secret: String
});

const Secret= mongoose.model("Secret", secretSchema);
module.exports= Secret