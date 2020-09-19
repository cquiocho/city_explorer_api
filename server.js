'use strict';

// dotenv configuration
require('dotenv').config();

// Application Dependencies
const express = require('express');
const superagent = require('superagent');
const pg = require('pg');
const cors = require('cors');

// Application Setup
const PORT = process.env.PORT || 3001;
const app = express();
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', (error) => {
    console.error(error);
});

app.use(cors());

app.get('/location', handleLocation);
app.get('/weather', handleWeather);
// app.get('/trails', handleHiking);
app.use('*', notFoundHandler);

function handleLocation(req, res) {
    const city = req.query.city;

    // check for data on this city in the database
    const sql = `SELECT * FROM locations WHERE search_query=$1;`;
    const safeValues = [city];

    client.query(sql, safeValues)
    .then (resultsFromSql => {
        // if city is in database, send database information
        if (resultsFromSql.rowCount) {
            const chosenCity = resultsFromSql.rows[0];
            // console.log('this is what is in the database');
            res.status(200).send(chosenCity);
        } else {
            // console.log('unable to find this city, need info from API');
            const url = 'https://us1.locationiq.com/v1/search.php';
            const queryObject = {
                key: process.env.GEOCODE_API_KEY,
                city,
                format: 'JSON',
                limit: 1
            }
            superagent.get(url)
            .query(queryObject)
            .then(data => {
                // console.log(data.body);
                const place = new Location(city, data.body[0]);
                // FIRST: save new API information 
                // SECOND: send new API information to user
                const sql = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3, $4);';
                const safeValues = [city, place.formatted_query, place.latitude, place.longitude];
                // console.log(safeValues);
                client.query(sql, safeValues);
                res.status(200).send(place);
            })
            .catch (error => 
                res.status(500).send('Unable to process request, please try again.'));
        }
    })
}

function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData.display_name;
    this.latitude = geoData.lat;
    this.longitude = geoData.lon;
}

function handleWeather(req, res) {
    console.log(req.query);
    let {search_query, formatted_query, latitude, longitude} = req.query;

    let sql = 'SELECT * FROM weather WHERE search_query=$1;';
    let safeValues = [search_query];

    client.query(sql, safeValues)
        .then(data => {
            if (data.rowCount) {
                let newWeatherData = Date.parse(new Date().toLocaleDateString()) - Date.parse(data.rows[0].date_entered) < 86400000;

                if (newWeatherData) {
                    console.log('this is our data.rows[0]', data.rows);
                    console.log('found weather in the database');
                    console.log('weather was less than 24 hours');
                    res.status(200).send(data.rows);
                } else {
                    let key = process.env.WEATHER_API_KEY
                    const url = `http://api.weatherbit.io/v2.0/forecast/daily?lat=${latitude}&lon=${longitude}&key=${key}`;
                    superagent.get(url)
                    .then(data => {
                        var weatherUpdate = data.body.data;
                        let allWeather = weatherUpdate.map(weather => {
                            let newWeather = new Weather(weather);
                            let sql = 'INSERT INTO weather (search_query, forecast, time, date_entered) VALUES ($1, $2, $3, $4);';
                            let safeValues = [search_query, newWeather.forecast, newWeather.time, new Date()];
                            client.query(sql, safeValues);
                        })
                        res.status(200).send(newWeather);
                    })
                    .catch (error => 
                        res.status(500).send('Unable to process request, please try again.'));                    
                }
            }
        })
}

function Weather(day) {
    this.forecast = day.weather.description;
    this.time = day.valid_date;
}
// function handleWeather(req, res) {
//     const city = req.query.search_query;
//     const date = new Date();
//     // check for data on this city in the database
//     const sql = `SELECT * FROM weather WHERE search_query=$1;`;
//     const delSql = `DELETE FROM weatherdata WHERE search_query = $1;`;
//     const safeValues = [city];
    
//     client.query(sql, safeValues)
//     .then (weatherFromSql => {
//         if (weatherFromSql.rowCount > 0 && Date.parse(today) - Date.parse(weatherFromSql.rows[0].time) < 86400000) {
//             const cityWeather = weatherFromSql.rows[0];
//             console.log('weather found in database')
//             res.status(200).send(cityWeather);
//         } else {
//             if (weatherFromSql.rowCount > 0 && Date.parse(today) - Date.parse(weatherFromSql.rows[0].time) >= 86400000) {
//                 console.log('invalid time, please delete');
//                 client.query(delSql, safeValues)
//             }
//             const url = `https://api.weatherbit.io/v2.0/forecast/daily`;
//             let queryWeather = {
//                 key: process.env.WEATHER_API_KEY,
//                 lat,
//                 lon
//             }
//             superagent.get(url)
//             .query(queryWeather)
//             .then (weather => {
//                 let forecast = weather.body.data;
//                 let forecastSlice = forecast.slice(0, 8);
//                 let newWeather = forecastSlice.map(value => new Weather(value.weather.description, value.datetime));
//                 newWeather.forEach((data) => {
//                     let sql = 'INSERT INTO weather (search_query, forecast, time_stamp) VALUES ($1, $2, $3);';
//                     const safeValues = [city, forecast.forecast, forecast.time_stamp];
//                     console.log(safeValues);
//                     client.query(sql, safeValues);
//                 })
//                 res.status(200).send(forecast);
//             })
//             .catch (error => 
//                 res.status(500).send('Unable to process request, please try again.'));
//         }
//     })
    
// function Weather(description, time) {
//     this.search_query = city;
//     this.forecast = description;
//     this.time_stamp = time;
// }

// function handleHiking(req, res){
//     try {
//         const lat = req.query.latitude;
//         const lon = req.query.longitude;
//         let key = process.env.TRAIL_API_KEY;
//         const url = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=10&key=${key}`;
//         superagent.get(url)
//             .then(hike => {
//                 // console.log(hike);
//                 const hikingData = hike.body.trails;
//                 console.log(hike.body.trails);
//                 const hikeArray = [];
//                 hikingData.forEach(active => {
//                     hikeArray.push(new Hiking(active));
//                 })
//                 res.status(200).send(hikeArray);
//             })
//             }
//             catch (error) {
//                 console.log(error);
//                 res.status(500).send('Unable to process request, please try again.');
//             };
// }

// function Hiking(active) {
//     this.name = active.name
//     this.location = active.location
//     this.length = active.length
//     this.stars = active.stars
//     this.star_votes = active.starVotes
//     this.summary = active.summary
//     this.trail_url = active.url
//     this.conditions = active.conditionDetails
//     this.condition_date = active.conditionDate.slice(0, 10);
//     this.condition_time = active.conditionDate.slice(11, 19);
// }

function notFoundHandler(req, res) {
    res.status(404).send('Unable to process request, please try again.');
}


client.connect()
  .then(() => {
    app.listen(PORT, ()=> {
      console.log(`listening on ${PORT}`);
    })
  })
  .catch(error => console.error(error));
