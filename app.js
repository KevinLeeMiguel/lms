var express = require("express");
var app = express();
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var nodeMailer = require('nodemailer');

var passport = require("passport");
var localStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var User = require("./models/User");
var methodOverride = require("method-override");
var Leave = require("./models/Leave");

// mongoose.connect("mongodb://localhost/lms",{ autoIndex:false });
mongoose.connect("mongodb://klm:klm91996@ds213199.mlab.com:13199/lms",{ autoIndex: false });
app.use(require("express-session")({
    secret:"leave management system",
    resave: false,
    saveUninitialized: false
}));

app.set("view engine","ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));

//Passport
//========
app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//ROUTE1
//======

app.get("/",function(req,res){

       res.render("index");
});

//Route 2
//=======
app.get("/box",isLoggedIn,function(req,res){
    if(req.user.status == "Approved"){
        User.find({"username" : req.user.username},function(err,user){
            if(err)
           {
               res.send("An Error Occured");
           }else{
               res.render("box",{user:req.user});
           }
        })
    }else{
        res.send("U're not an approved user");
    }
 });
//Route 3
//=======
app.get("/success",isLoggedIn,function(req,res){
  if(req.user.status == "Approved"){
    res.render("success");
  }else{
     res.render("success1");
  }
});

//HISTORY Route
// ============
app.get("/history",isLoggedIn,function(req,res){
  User.findOne({username : req.user.username}).populate("leaves").exec(function(err,user){
    if(err){
      console.log(err);
    }else{
      res.render("history",{user: req.user, requests: user.leaves});
    }
  });

});
//Route 4
//========
app.get("/leaverequest",isLoggedIn,function(req,res){
    res.render("Leave_Request",{user:req.user});
})

//ROUTE 3: CREATE USER
//====================
app.post("/register",function(req,res){
    var newUser = new User({
        username : req.body.username,
        names : req.body.names,
        jobDesc : req.body.jobtitle,
        tel: req.body.Tel,
        status: "Not Approved",
        email: req.body.email,
        isHR: "false",
        department: req.body.department,
        isSup: "false"
    });
    User.register(newUser,req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.send(err.message);
        }else{
            passport.authenticate("local")(req,res, function(){
                if(req.user.isHR === false){
                    res.redirect("/success");
                }else{
                    res.redirect("/hr");
                }

            });
        }
    });
});

//HR ROUTE
//========
// app.get("/hr",isLoggedIn,function(req,res){
//
//     User.find({"status":"Not Approved"},function(err,requests){
//         if(err)
//        {
//            res.send("An Error Occured");
//        }else{
//            if(req.user.isHR === true)
//            {
//             res.render("box",{requests:requests,user:req.user});
//            }else{
//                res.send("You don't have required priviledges");
//            }
//
//        }
//     })
// })

//Approve Users ROUTE
//===================
app.get("/approve",isLoggedIn,function(req,res){

    User.find({"status":"Not Approved"},function(err,requests){
        if(err)
       {
           res.send("An Error Occured");
       }else{
           if(req.user.isHR === true)
           {
            res.render("aproval",{requests:requests,user:req.user});
           }else{
               res.send("You don't have required priviledges");
           }

       }
    })
})

// Reject Route
//==============
app.delete("/reject/:id",isLoggedIn,function(req,res){

    User.findByIdAndRemove(req.params.id,function(err){
        if(err){
            res.send("Not rejected please try again");
        }else{
            res.redirect("/approve");
        }
    });
})

// Approve User Route
//====================

app.put("/approve/:id",isLoggedIn,function(req,res){
    User.findByIdAndUpdate(req.params.id,{$set:{"status":"Approved"}},function(err,doc){
        if(err){
            res.send("Error Occured Please Try again");
            console.log(err);
        }else{
          let transporter = nodeMailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: 'lmsforghi@gmail.com',
              pass: 'lmsghi12'
            }
          });
            let mailOptions = {
                from: '"LMS" <lmsforghi@gmail.com>', // sender address
                to: req.body.email, // list of receivers
                subject: "Approved", // Subject line
                text: "", // plain text body
                html: '<b>Your Account was approved, please login to use the Leave management system </b>' // html body
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.log(error);
                }
                console.log('Message %s sent: %s', info.messageId, info.response);
                    res.redirect('/approve');
                });
        }
    })
})

//LEAVEREQUESTROUTE
//=================

app.post("/req",isLoggedIn,function(req,res){
  var i =0 ;
  var newLeave = new Leave({
        username: req.user.username,
        Date : new Date().toString(),
        Type : req.body.type,
        identity : req.user.names,
        startDate : req.body.startDate,
        endDate: req.body.endDate,
        totalDays: calculateWorkDays(new Date(req.body.startDate),new Date(req.body.endDate)),
        comment : req.body.Comment,
        email : req.user.email,
        status: "not Approved"
  });
  Leave.create(newLeave,function(err,newleave){
    if(err){
      console.log(err);

    }else{
      User.findOne({username : req.user.username},function(err,foundUser){
        if(err){
          console.log(err);
          res.send("Error occured please try again");
        }else{
          foundUser.leaves.push(newleave);
          foundUser.save(function(err,data){
              if(err){
                res.send("Error occured while saving, please try again");
              }else{
                res.redirect("/success");
              }
          })

        }
      })
    }
  })
});
//SUPERVISOR REQUESTS ROUTES
//==========================

app.get("/sap",isLoggedIn,function(req,res){
  Leave.find({"status":"not Approved"},function(err,requests){
      if(err)
     {
         res.send("An Error Occured");
     }else{
         if(req.user.isSup === true)
         {
          res.render("sap",{requests:requests,user:req.user});
         }else{
             res.send("You don't have required priviledges");
         }

     }
  })
});

//SUPERVISOR APPROVING Route
//==========================

app.put("/sap/:id",isLoggedIn,function(req,res){

      Leave.findByIdAndUpdate(req.params.id,{$set:{"status":"Partly Approved"}},function(err,doc){
          if(err){
              res.send("Error Occured Please Try again");
              console.log(err);
          }else{
              res.redirect("/sap");
          }
      })
})

//SUPERVISOR REJECTING Route
// =========================
app.put("/sap/reject/:id",isLoggedIn,function(req,res){
      if(req.user.isSup === true){
        Leave.findByIdAndUpdate(req.params.id,{$set:{"status":"Reject"}},function(err,doc){
            if(err){
                res.send("Error Occured Please Try again");
                console.log(err);
            }else{
              let transporter = nodeMailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                  user: 'lmsforghi@gmail.com',
                  pass: 'lmsghi12'
                }
              });

                let mailOptions = {
                    from: '"LMS" <lmsforghi@gmail.com>', // sender address
                    to: req.body.email, // list of receivers
                    subject: "Leave Request Rejected", // Subject line
                    text:  'hello dear,',// plain text body
                    html: "<h1>Sorry your leave request was denied by the supervisor due to :</h1><p>"+req.body.Comment+"</p> "// html body
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message %s sent: %s', info.messageId, info.response);
                        res.redirect('/sap');
                    });
            }
        })
      }

})
//hr leave REQUESTS ROUTE
//========================
app.get("/hap",isLoggedIn,function(req,res){
  Leave.find({"status":"Partly Approved"},function(err,requests){
      if(err)
     {
         res.send("An Error Occured");
     }else{
         if(req.user.isHR === true)
         {
          res.render("hap",{requests:requests,user:req.user});
         }else{
             res.send("You don't have required priviledges");
         }

     }
  })
});

//hr leave approving route
// =======================
app.put("/hap/:id",isLoggedIn,function(req,res){
      if(req.user.isHR === true){
        Leave.findByIdAndUpdate(req.params.id,{$set:{"status":"Approved"}},function(err,doc){
            if(err){
                res.send("Error Occured Please Try again");
                console.log(err);
            }else{
              let transporter = nodeMailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                  user: 'lmsforghi@gmail.com',
                  pass: 'lmsghi12'
                }
              });

                let mailOptions = {
                    from: '"LMS" <lmsforghi@gmail.com>', // sender address
                    to: req.body.email, // list of receivers
                    subject: "Leave Approved", // Subject line
                    text: '', // plain text body
                    html: '<b>your leave request was Approved</b>' // html body
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message %s sent: %s', info.messageId, info.response);
                        res.redirect('/hap');
                        alert("email sent to employee");
                    });
            }
        })
      }

})

// Reject Leave Route
// ====================
app.put("/hap/reject/:id",isLoggedIn,function(req,res){
      if(req.user.isHR === true){
        Leave.findByIdAndUpdate(req.params.id,{$set:{"status":"Reject"}},function(err,doc){
            if(err){
                res.send("Error Occured Please Try again");
                console.log(err);
            }else{
              let transporter = nodeMailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                  user: 'lmsforghi@gmail.com',
                  pass: 'lmsghi12'
                }
              });

                let mailOptions = {
                    from: '"LMS" <lmsforghi@gmail.com>', // sender address
                    to: req.body.email, // list of receivers
                    subject: "Leave Request Rejected", // Subject line
                    text:  'hello dear,',// plain text body
                    html: "<h1>Sorry your leave request was denied due to :</h1><p>"+req.body.Comment+"</p> "// html body
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error);
                    }
                    console.log('Message %s sent: %s', info.messageId, info.response);
                        res.redirect('/hap');
                        // alert("email sent to employee");
                    });
            }
        })
      }

})

  //LOGIN ROUTE
  //===========

    app.post("/login",passport.authenticate("local",{
      failureRedirect:"/"
  }),(req,res) =>{
      if(req.user.isHR === true){
          res.redirect("/box");
      }else{
          if(req.user.status == "Not Approved"){
              res.redirect("/success");
          }else{
              res.redirect("/box");
          }

      }
    }
);


//LOGOUT ROUTE
//============
app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
});

//MIDDLEWARE
//==========
function isLoggedIn(req,res,next){
     if(req.isAuthenticated()){

            return next();

     }
     res.redirect('/');
}

//Business Days Calculator
// ========================



function calculateWorkDays(first,last) {
  var gon = {};
  gon["holiday"] = "2018-01-01,2018-01-02,2018-02-01,2018-03-30,2018-04-02,2018-04-07,2018-05-01,2018-06-15,2018-07-01,2018-07-02,2018-07-04,2018-08-03,2018-08-15,2018-08-22,2018-12-25,2018-12-26".split(",");

  // 2 helper functions - moment.js is 35K minified so overkill in my opinion
  function pad(num) { return ("0" + num).slice(-2); }
  function formatDate(date) { var d = new Date(date), dArr = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())];return dArr.join('-');}
  var aDay = 24 * 60 * 60 * 1000,
  daysDiff = parseInt((last.getTime()-first.getTime())/aDay,10)+1;

  if (daysDiff>0) {
    for (var i = first.getTime(), lst = last.getTime(); i <= lst; i += aDay) {
      var d = new Date(i);
      if (d.getDay() == 6 || d.getDay() == 0 // weekend
      || gon.holiday.indexOf(formatDate(d)) != -1) {
          daysDiff--;
      }
    }
  }
  return daysDiff;
}



//LITSEN
//======
// app.listen(process.env.PORT,process.env.IP, function(){
//
//     console.log("lms Server Started");
//
//     });
var port = process.env.PORT || 3000;

var server = app.listen(port, function () {
    console.log('Server running at http://127.0.0.1:' + port + '/');
    console.log(new Date().toString())
});
