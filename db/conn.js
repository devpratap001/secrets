const mongoose= require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/Secret")
.then(()=>{ console.log("database connected successfully")})
.catch((err)=>{console.log(err)});