// MODULES REQUIRED FOR PROJECT
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const session = require('express-session');
const bodyParser = require('body-parser');
require('dotenv').config();
const passport = require('passport');
const passportLocal = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const saltrounds = 10;

// MIDDLEWARES 

app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({secret: "ItIsSecret", saveUninitialized: true, resave: false}));
app.use(passport.initialize());
app.use(passport.session());

// URL OF MONGODB ATLAS  

const url = 'mongodb+srv://dev_chauhan_10:mypassword123@myproject-be1gc.mongodb.net/test?retryWrites=true&w=majority';

mongoose.Promise = global.Promise;

// CONNECT MONGOOSE TO MONGODB ATLAS

mongoose.connect(url, { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', function (err) {
    throw err; 
});

// DEFINE SCHEMA FOR CAR

var carSchema = new mongoose.Schema({
    carNumber : String,
    model : String,
    seatCapacity : Number,
    rentPerDay : Number,
    currentAvailable : String,
    issueDate : Date,
    returnDate : Date
});

// MAKE CAR MODEL BASED ON CAR SCHEMA

var carModel = mongoose.model('car', carSchema);

// DEFINE USER SCHEMA

var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    data: Array
})

// CREATE USER MODEL BASED ON USER SCHEMA

var userModel =  mongoose.model('carUser', userSchema);


//   REST APIs


// SIGNUP API FOR USER TO REGISTER ON WEBSITE

app.post('/signup',function(req,res){

    let name = req.body.username;
    let password = req.body.password;
    bcrypt.hash(password, saltrounds, function(err, hash){
        if(err) throw err;
        var user = new userModel({
            username: req.body.username,
            password: hash
        });
        user.save(function(err){
            if(err)
                throw err;
        });
        res.send("you registered succesfully..for car rental service!");
    })  
})


// LOGIN API FOR REGISTERD USERS


app.post('/login', passport.authenticate('local', 
    {
        successRedirect: '/success',
        failureRedirect: '/failed'
    }
))

// USE LOCAL STRATEGY FOR AUTHENTICATION OF USERS

passport.use(new passportLocal(
    function(username, password, done){
    userModel.find({username: username},function(err,doc){
    console.log(doc)
    if(err)
        throw err;
    if(!doc){
        res.render('login',{message: 'User not found!'});
    }
    else{
        passw = doc[0].password;
        bcrypt.compare(password, passw, function(err, res) {
            if(res)  return done(null, username)
            else  return done(null, false, {message: 'Password is incorrect'})
        });   
        }
    })
}))


// SERIALIZE AND DESERIALIZE USER TO MAINTAIN A SESSION FOR THE USER

passport.serializeUser(function(user, done){
    done(null, user)
})
passport.deserializeUser(function(user, done){
    done(null, user)
})


// API TO ADD THE CARS IN THE SYSTEM ( SHOULD BE ONLY FOR ADMIN )


app.post('/admin/addCar',passport.authenticate('local'),(req,res)=>{
    //console.log(req.body);
    var car = new carModel(req.body);
    car.save(function(){
        console.log('Car added!');
    })
    res.json({
        "status":"ok",
        "result":"car added into database!"
    });
})


// API TO DELETE THE CARS FROM THE SYSTEM ( SHOULD BE ONLY FOR ADMIN )


app.post('/admin/deleteCar',passport.authenticate('local'),(req,res)=>{
    carModel.deleteOne({carNumber : req.body.carNumber},function(){
        console.log("car deleted");
    }).exec();
    res.json({
        "status":"ok",
        "result":"car deleted from database!"
    });
})


// API TO UPDATE THE CAR FEATURES MANUALLY IN THE SYSTEM ( SHOULD BE ONLY FOR ADMIN )


app.post('/admin/update',passport.authenticate('local'),(req,res)=>{
    carModel.updateOne({carNumber : req.body.carNumber},{
                                                         currentAvailable : req.body.currentAvailable,
                                                         issueDate : req.body.issueDate,
                                                         returnDate : req.body.returnDate,
                                                         rentPerDay : req.body.rentPerDay
                                                        }).exec(()=>console.log("car updated"))
       res.json({
           "status" : "ok",
           "result" : "car updated with provided properties!"
       })                                                 
})

// API TO VIEW THE ALL CARS WITH USING FILTERS BASED ON CAR PROPERTIES FOR ANY USER


app.post('/viewCars',async function(req,res){ 
    var obj = await new Promise(function(resolve,reject){
        var temp = carModel.find({});
        resolve(temp);
    })
    if(req.body.seatCapacity){
        obj = obj.filter(function(val){
            if(req.body.seatCapacity == val.seatCapacity){
                return val;
            }
        })
    }

    if(req.body.model){
        obj = obj.filter(function(val){
            if(req.body.model == val.model){
                return val;
            }
        })
    }

    if(req.body.rentPerDay){
        obj = obj.filter((val)=>{
                if(req.body.rentPerDay == val.rentPerDay){
                return val;
                }
        })
    }


    if(req.body.date){ 
        obj = obj.filter(function(val){
            if(val.issueDate){
                var date1 = new Date(req.body.date.issueDate);
                var date2 = new Date(val.issueDate);
                var date3 = new Date(req.body.date.returnDate);
                var date4 = new Date(val.returnDate);
            if((date1 > date4) || (date3 < date2)){
                return val;
            }}
            else 
            return val;
        })
    }  

    data = obj.map(function(val){
        var temp = {
            "carNumber" : val.carNumber,
            "model" : val.model,
            "seatCapacity" : val.seatCapacity,
            "rentPerDay" : val.rentPerDay
        };
        return temp;
    })
    if(data == "")
    res.send("No car exists for these filters..!!") ;
    else   
    res.json(data);
})


// API TO BOOK THE CAR FOR REGISTERED USER

app.post('/bookCar',passport.authenticate('local'),async function(req,res){
        let bookedCar = await carModel.find({carNumber: req.body.carNumber});

        // ADD BOOKED CAR TO USER'S ACCOUNT

        userModel.where({username: req.body.username}).updateOne({$push:{data: bookedCar}},function(){
            console.log("car booked!");
        }).exec(()=>{

            // UPDATE AVAILABILITY STATUS OF BOOKED CAR IN THE SYSTEM

            carModel.updateOne({carNumber : req.body.carNumber},{currentAvailable : "false",
                issueDate : req.body.issueDate,
                returnDate : req.body.returnDate
               }).exec(()=>console.log("car updated"));
                res.json({
                        "status" : "ok",
                        "result" : "car booked and system updated!"
                })     
        })
                       
})


// API TO SHOW ALL DETAILS OF PARTICULAR CAR FOR ANY USER


app.post('/showCarDetails',async function(req,res){
    var obj = await new Promise(function(resolve,reject){
           var temp = carModel.find({});
           resolve(temp);
       })
       if(req.body.carNumber){
           obj = obj.filter(function(val){
               if(req.body.carNumber == val.carNumber){
                   return val;
               } 
           })
       }
       
       data = obj.map(function(val){
        var temp = {
            "carNumber" : val.carNumber,
            "model" : val.model,
            "seatCapacity" : val.seatCapacity,
            "rentPerDay" : val.rentPerDay,
            "issueDate" :  val.issueDate,
            "returnDate" : val.returnDate,
            "currentAvailable" : val.currentAvailable
         }
        return temp;
    }) 
    if(data == "")
    res.send("No such car exists..!!");  
    else    
    res.json(data);}

)

// API TO SHOW ALL BOOKED CARS OF PARTICULAR USER


app.post('/showMyCarBookings',passport.authenticate('local'),async function(req,res){
    var myData =await userModel.find({ username : req.body.username},function(err,doc){
        if(err) throw err;
        return doc;
    })
    var myData = myData.filter(function(item){
        if(item.data.length != 0)
            return item;
    })
    var myData = myData.map(function(val){
        var data = val.data.map(function(item){
                console.log(item);
                var tempdata = {
                    "carNumber" : item.carNumber,
                    "model" : item.model,
                    "seatCapacity" : item.seatCapacity,
                    "rentPerDay" : item.rentPerDay,
                    "issueDate" : item.issueDate,
                    "returnDate" : item.returnDate
                    };
                    return tempdata;
            })
            return data;
    })
    if(myData == "")
    res.send("No history here..!!");  
    else    
    res.json(myData);
})

app.get('/failed',(req,res)=>{
    res.send("Login failed.. username or password incorrect!");
})

app.get('/success',(req,res)=>{
    res.send("Login successfully!");
})

app.set('port', process.env.PORT || 3000);

app.listen(app.get('port'), function (err) {
    if (err)
        console.log(err);
    console.log('Running on http://localhost:%s', app.get('port'));
})