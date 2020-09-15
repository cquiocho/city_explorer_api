'use strict';

// dotenv configuration
require('dotenv').config();

// Application Dependencies
const express = require('express');
const cors = require('cors');
const { response } = require('express');

// Application Setup
const PORT = process.env.PORT;
const app = express();
app.use(cors());

// Proof of Life
app.get('/', (req, res) => {
    res.send('Home Page!');
});

// Create API Routes
app.get('/location', handleLocation);
app.get('/weather', handleWeather);
app.use('*', notFoundHandler);

// Generate Constructor Functions for Helper Functions
function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData[0].display_name;
    this.latitude = geoData[0].lat;
    this.longitude = geoData[0].lon;
}

function Weather(entry) {
    this.forecast = entry.weather.description;
    this.time = entry.datetime;
}

// Create Helper Functions & Include Error Message
function handleLocation(req, res) {
    try {
        const geoData = require('./data/location.json');
        const city = req.query.city;
        const location = new Location(city, geoData);
        res.send(location);
    }
    catch (error) {
        res.status(500).send('Unable to process request, please try again.');
    }
}

function notFoundHandler(req, res) {
    res.status(404).send('Unable to process request, please try again.');
}

function handleWeather(req, res){
    try {
        const skyData = require('./data/weather.json');
        const weatherData = [];
        skyData.data.forEach(entry => {
            weatherData.push(new Weather(entry));
        });
        res.send(weatherData);
    }
    catch (error) {
        res.status(500).send('Unable to process request, please try again.');
    }
}

app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
});