


var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var leaveSchema = new mongoose.Schema({
    username: String,
    Date : {type: Date, default: Date.now},
    Type : String,
    identity: String,
    email: String,
    startDate : String,
    endDate: String,
    totalDays: String,
    status: String,
    comment: String
});
leaveSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("Leave",leaveSchema);
