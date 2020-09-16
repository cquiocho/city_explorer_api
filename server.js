'use strict';

// dotenv configuration
require('dotenv').config();

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const cors = require('cors');
const { response } = require('express');

// Application Setup
const PORT = process.env.PORT;
const app = express();
app.use(cors());

// Proof of Life
// app.get('/', (req, res) => {
//     res.send('Home Page!');
// });

// Create API Routes
app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.get('/trails', handleHiking);
app.use('*', notFoundHandler);

// Generate Constructor Functions for Helper Functions
function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData.display_name;
    this.latitude = geoData.lat;
    this.longitude = geoData.lon;
}

function Weather(entry) {
    this.forecast = entry.weather.description;
    this.time = entry.datetime;
}

function Hiking(active) {
    this.name = active.name
    this.location = active.location
    this.length = active.length
    this.stars = active.stars
    this.star_votes = active.starVotes
    this.summary = active.summary
    this.trail_url = active.url
    this.conditions = active.conditionDetails
    this.condition_date = active.conditionDate.slice(0,9);
    this.condition_time = active.conditionDate.slice(11,19);
}

// Create Helper Functions & Include Error Message
function handleLocation(req, res) {
    try {
        let city = req.query.city;
        let key = process.env.GEOCODE_API_KEY;
        const url = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json&limit=1`;
        superagent.get(url)
            .then(data => {
                const geoData = data.body[0];
                const locations = new Location(city, geoData);
                res.status(200).send(locations);
            })
            }
            catch (error) {
                res.status(500).send('Unable to process request, please try again.');
            };
    }

function handleWeather(req, res){
    try {
        let city = req.query.search_query;
        let key = process.env.WEATHER_API_KEY;
        const url = `https://api.weatherbit.io/v2.0/forecast/daily?city=${city}&key=${key}&days=8`;
        superagent.get(url)
            .then(value => {
                let weatherData = value.body.data.map(entry => {
                return new Weather(entry);
                })
                res.status(200).send(weatherData);
            })
            }
            catch (error) {
                console.log(error);
                res.status(500).send('Unable to process request, please try again.');
            };
}

function handleHiking(req, res){
    try {
        const lat = req.query.latitude;
        const lon = req.query.longitude;
        let key = process.env.TRAIL_API_KEY;
        const url = `https://www.hikingproject.com/data/get-trails?lat=40.0274&lon=-105.2519&maxDistance=10&key=${key}`;
        superagent.get(url)
            .then(hike => {
                // console.log(hike);
                const hikingData = hike.body.trails;
                console.log(hike.body.trails);
                const hikeArray = [];
                hikingData.forEach(active => {
                    hikeArray.push(new Hiking(active));
                })
            //     // let hikingData = hike.body.trails.map(active => {
            //     // return new Hiking(active);
            //     // })
                res.status(200).send(hikeArray);
            })
            }
            catch (error) {
                console.log(error);
                res.status(500).send('Unable to process request, please try again.');
            };
    }

function notFoundHandler(req, res) {
    res.status(404).send('Unable to process request, please try again.');
}

app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
});