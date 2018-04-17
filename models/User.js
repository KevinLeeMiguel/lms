var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var userSchema = new mongoose.Schema({
    username : String,
    names : String,
    jobDesc : String,
    password: String,
    tel: String,
    status: String,
    email: String,
    isHR : Boolean,
    department : String,
    isSup : Boolean,
    leaves: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Leave"
                }
            ]

});
userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User",userSchema);
