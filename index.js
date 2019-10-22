// MODULES REQUIRED FOR PROJECT
const express       = require('express');
const mongoose      = require('mongoose');
const app           = express();
const session       = require('express-session');
const bodyParser    = require('body-parser');
const passport      = require('passport');
const passportLocal = require('passport-local').Strategy;
const cookieParser  = require('cookie-parser');
const bcrypt        = require('bcryptjs');
const saltrounds    = 10;
require('dotenv').config();

// MIDDLEWARES 

app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: "ItIsSecret",
    saveUninitialized: true,
    resave: false
}));
app.use(passport.initialize());
app.use(passport.session());

// URL OF MONGODB ATLAS  

const url = 'mongodb+srv://dev_chauhan_10:mypassword123@myproject-be1gc.mongodb.net/test?retryWrites=true&w=majority';

mongoose.Promise = global.Promise;

// CONNECT MONGOOSE TO MONGODB ATLAS

mongoose.connect(url, {
    useNewUrlParser: true
});
var db = mongoose.connection;
db.on('error', function (err) {
    throw err;
});

// DEFINE SCHEMA FOR CAR

var carSchema = new mongoose.Schema({
    carNumber: {
        type: String,
        required: [true, "Please! provide **Car Number** to add this car into database ?"]
    },
    model: {
        type: String,
        required: [true, "Please! provide **Model** of this car to add into database ?"]
    },
    seatCapacity: {
        type: Number,
        required: [true, "Please! provide **Seat Capacity** to add this car into database ?"]
    },
    rentPerDay: {
        type: Number,
        required: [true, "Please! provide **RentPerDay** to add this car into database ?"]
    },
    currentAvailable: {
        type: String,
        required: [true, "Please! provide **Current Availability** to add this car into database ?"]
    },
    issueDate: Date,
    returnDate: Date
});

// MAKE CAR MODEL BASED ON CAR SCHEMA

var carModel = mongoose.model('car', carSchema);

// DEFINE USER SCHEMA

var userSchema = new mongoose.Schema({
    username: String,
    password: String,
    data: Array
});

// CREATE USER MODEL BASED ON USER SCHEMA

var userModel = mongoose.model('carUser', userSchema);


//   REST APIs


// HOMEPAGE

app.get('/', function (req, res) {
    res.send("WELCOME!!.....TO TEST THE APIs OF THIS APPLICATION YOU SHOULD USE *POSTMAN*");
});


// SIGNUP API FOR USER TO REGISTER ON WEBSITE

app.post('/signup', function (req, res) {
    if (req.body.username) {
        userModel.findOne({
                username: req.body.username
            })
            .exec()
            .then((doc) => {
                if (doc) {
                    res.send("Sorry!!..This **username** is already taken..Try some other");
                } else {
                    if (req.body.password) {
                        bcrypt.hash(req.body.password, saltrounds, function (err, hash) {
                            if (err) {
                                res.send("Some error occurred!!..User not registered");
                            } else {
                                var user = new userModel({
                                    username: req.body.username,
                                    password: hash
                                });
                                user.save(function (err) {
                                    if (err) {
                                        res.send("Some error occurred!!..User not saved");
                                    } else {
                                        res.send("You registered succesfully..for car rental service!");
                                    }
                                });

                            }

                        });
                    } else {
                        res.send("Warning!!..You must provide **password** to register");
                    }
                }
            })
            .catch((err) => {
                res.send("Some error occurred !!.....Please try again after somtime");
            });
    } else {
        res.send("Warning!!..Username cannot be empty");
    }

});


// LOGIN API FOR REGISTERD USERS


app.post('/login', passport.authenticate('local', {
    successRedirect: '/success',
    failureRedirect: '/failed'
}));

// USE LOCAL STRATEGY FOR AUTHENTICATION OF USERS

passport.use(new passportLocal(
    function (username, password, done) {
        userModel.findOne({
            username: username
        }, function (err, doc) {
            if (err)
                throw err;
            if (!doc) {
                return done(null, false, {
                    message: 'User not found'
                });
            } else {
                passw = doc.password;
                bcrypt.compare(password, passw, function (err, res) {
                    if (res) return done(null, username);
                    else return done(null, false, {
                        message: 'Password is incorrect'
                    });
                });
            }
        });
    }));
// SERIALIZE AND DESERIALIZE USER TO MAINTAIN A SESSION FOR THE USER

passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});


// API TO ADD THE CARS IN THE SYSTEM ( SHOULD BE ONLY FOR ADMIN )


app.post('/admin/addCar', passport.authenticate('local'), function (req, res) {
    var car = new carModel(req.body);
    car.save(function (err) {
        if (err) {
            var errorResponse;
            if (err.errors.carNumber != undefined)
                errorResponse = err.errors.carNumber.properties;
            else if (err.errors.model != undefined)
                errorResponse = err.errors.model.properties;
            else if (err.errors.seatCapacity != undefined)
                errorResponse = err.errors.seatCapacity.properties;
            else if (err.errors.rentPerDay != undefined)
                errorResponse = err.errors.rentPerDay.properties;
            else if (err.errors.currentAvailable != undefined)
                errorResponse = err.errors.currentAvailable.properties;
            res.json(errorResponse);
        } else
            res.json({
                "status": "ok",
                "car_id": car._id,
                "result": "Car added into database!"
            });
    });

});


// API TO DELETE THE CARS FROM THE SYSTEM ( SHOULD BE ONLY FOR ADMIN )


app.post('/admin/deleteCar', passport.authenticate('local'), async function (req, res) {
    var deletedCar = await carModel.findById(req.body._id)
        .exec()
        .then((doc) => {
            return doc;
        })
        .catch((err) => {
            res.send("Some error occurred !!.....Please check your **car_id** again");
        });
    if (deletedCar.currentAvailable == "false") {
        res.send("Car cannot be deleted!! This car is currently booked to someuser");
    } else {
        carModel.deleteOne({
                _id: req.body._id
            })
            .exec()
            .then(() => {
                res.json({
                    "status": "ok",
                    "result": "Car is successfully deleted from database!"
                });
            })
            .catch((err) => {
                res.json({
                    "status": "Bad!",
                    "result": "Some error occured! Car is not deleted from database"
                });
            });

    }
});


// API TO UPDATE THE CAR FEATURES MANUALLY IN THE SYSTEM ( SHOULD BE ONLY FOR ADMIN )


app.post('/admin/update', passport.authenticate('local'), async function (req, res) {
    var updatedCar = await carModel.findById(req.body._id)
        .exec()
        .then((doc) => {
            return doc;
        })
        .catch((err) => {
            res.send("Some error occurred !!.....Please check your **car_id** again");
        });
    if (updatedCar.currentAvailable == "false") {
        res.send("Car cannot be updated!! This car is currently booked to someuser");
    } else {
        carModel.updateOne({
                _id: req.body._id
            }, req.body)
            .exec()
            .then(() => {
                res.json({
                    "status": "ok",
                    "result": "Car updated with provided properties!"
                });
            })
            .catch((err) => {
                res.send("Some error occurred!..Car is not updated");
            });
    }


});

// API TO VIEW THE ALL CARS WITH USING FILTERS BASED ON CAR PROPERTIES FOR ANY USER


app.post('/viewCars', async function (req, res) {
    var allCars = await new Promise(function (resolve, reject) {
        var temp = carModel.find({});
        resolve(temp);
    });
    if (req.body.seatCapacity) {
        allCars = allCars.filter(function (car) {
            if (req.body.seatCapacity == car.seatCapacity) {
                return car;
            }
        });
    }

    if (req.body.model) {
        allCars = allCars.filter(function (car) {
            if (req.body.model == car.model) {
                return car;
            }
        });
    }

    if (req.body.rentPerDay) {
        allCars = allCars.filter(function (car) {
            if (req.body.rentPerDay == car.rentPerDay) {
                return car;
            }
        });
    }


    if (req.body.date) {
        allCars = allCars.filter(function (car) {
            if (car.issueDate) {
                var date1 = new Date(req.body.date.issueDate);
                var date2 = new Date(car.issueDate);
                var date3 = new Date(req.body.date.returnDate);
                var date4 = new Date(car.returnDate);
                if ((date1 > date4) || (date3 < date2)) {
                    return car;
                }
            } else
                return car;
        });
    }

    allFilteredCars = allCars.map(function (car) {
        var filteredCar = {
            "carNumber": car.carNumber,
            "model": car.model,
            "currentAvailable": car.currentAvailable
        };
        return filteredCar;
    });
    if (allFilteredCars == null)
        res.send("No such car exists for these filters..!!");
    else
        res.json(allFilteredCars);
});


// API TO BOOK THE CAR FOR REGISTERED USER

app.post('/bookCar', passport.authenticate('local'), async function (req, res) {
    if (req.body._id == null) {
        res.send("Sorry!! Booking process cannot be initialized without **car_id** ");
    } else {
        var bookedCar = await carModel.findById(req.body._id)
            .exec()
            .then((doc) => {
                return doc;
            })
            .catch((err) => {
                res.send("Some error occurred !!.....Please check your **car_id** again");
            });
        if (bookedCar.currentAvailable != "true") {
            res.send("Sorry!!! This car is already booked to someuser");
        } else {
            if (req.body.issueDate == null || req.body.returnDate == null) {
                res.send("Please! provide **issudate** and **return date** to book this car");
            } else {

                // ADD BOOKED CAR TO USER'S ACCOUNT

                userModel.where({
                        username: req.body.username
                    })
                    .updateOne({
                        $push: {
                            data: bookedCar
                        }
                    })
                    .exec(() => {

                        // UPDATE AVAILABILITY STATUS OF BOOKED CAR IN THE SYSTEM

                        carModel.updateOne({
                                _id: req.body._id
                            }, {
                                currentAvailable: "false",
                                issueDate: req.body.issueDate,
                                returnDate: req.body.returnDate
                            })
                            .exec()
                            .then(() => {
                                res.json({
                                    "status": "ok",
                                    "result": "The Car booked for you!.. and system updated!"
                                });
                            })
                            .catch((err) => {
                                res.send("Some error occurred in booking this car!!...Please try after sometime");
                            });

                    });

            }


        }
    }
});


// API TO SHOW ALL DETAILS OF PARTICULAR CAR FOR ANY USER


app.post('/showCarDetails', async function (req, res) {
        var car = await carModel.findById(req.body._id)
            .exec()
            .then((doc) => {
                return doc;
            })
            .catch((err) => {
                res.send("Some error occurred !!.....Please check your **car_id** again");
            });
        let carDetails = {
            "car_id": car._id,
            "carNumber": car.carNumber,
            "model": car.model,
            "seatCapacity": car.seatCapacity,
            "rentPerDay": car.rentPerDay,
            "currentAvailable": car.currentAvailable
        };
        res.json(carDetails);

    }

);

// API TO SHOW ALL BOOKED CARS OF PARTICULAR USER


app.post('/showMyCarBookings', passport.authenticate('local'), async function (req, res) {
    var myUser = await userModel.findOne({
        username: req.body.username
    }, function (err, doc) {
        if (err) {
            res.send("Something went wrong!!..Please try after sometime");
        } else {
            return doc;
        }
    });
    var userHistory = myUser.data.map(function (car) {
        var tempdata = {
            "car_id": car._id,
            "carNumber": car.carNumber,
            "model": car.model,
            "seatCapacity": car.seatCapacity,
            "rentPerDay": car.rentPerDay,
            "issueDate": car.issueDate,
            "returnDate": car.returnDate
        };
        return tempdata;
    });
    if (userHistory == null)
        res.send("No history here..!!");
    else
        res.json(userHistory);
});

app.get('/failed', (req, res) => {
    res.send("Login failed.. username or password incorrect!");
});

app.get('/success', (req, res) => {
    res.send("Login successfully!");
});

app.set('port', process.env.PORT || 5000);

app.listen(app.get('port'), function (err) {
    if (err)
        console.log(err);
    console.log('Running on http://localhost:%s', app.get('port'));
});
