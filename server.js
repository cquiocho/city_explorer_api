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
app.get('/trails', handleHiking);
app.use('*', notFoundHandler);

function Location(city, geoData) {
    this.search_query = city;
    this.formatted_query = geoData.display_name;
    this.latitude = geoData.lat;
    this.longitude = geoData.lon;
}

function Weather(description, time) {
    this.forecast = description;
    this.time = time;
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
    this.condition_date = active.conditionDate.slice(0, 10);
    this.condition_time = active.conditionDate.slice(11, 19);
}

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

function handleWeather(req, res) {
    const formatted_query = req.query.formatted_query;
    const lat = req.query.latitude;
    const lon = req.query.longitude;
    
    let key = process.env.WEATHER_API_KEY;
    const url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${key}`;
    const sql = `SELECT * FROM weather WHERE formatted_query=$1;`;
    const safeValues = [formatted_query];
  
    client.query(sql, safeValues)
      .then((resultsFromSql) => {
        const newWeather = resultsFromSql[0];
        console.log(resultsFromSql)
  
        if (resultsFromSql.rows.length === 0) {
          superagent.get(url)
            .then((results) => {
                console.log(results.body);
              let weatherData = results.body.data;
              let dataOne = weatherData.slice(0, 8);
              let timeOfDay = Date.now();
              const sql = `INSERT INTO weather (formatted_query, forecast, date_entered) VALUES ($1, $2, $3)`;
              const safeValues = [formatted_query, JSON.stringify(dataOne), timeOfDay];
              
              client.query(sql, safeValues)
                .then(() => {
                  res.send(dataOne.map((value) => new Weather(value.weather.description, value.datetime)
                  )
                );
            });
            })
            .catch((error) => {
            res.status(500).send('Unable to process request, please try again.');
            });
        }
        else if (resultsFromSql.rowCount > 0 && Date.parse(new Date(Date.now())) - Date.parse(resultsFromSql.rows[0].date_entered) < 86400000) {
        res.status(200).send(newWeather);
        } else {
        superagent.get(url)
        .then((results) => {
          let weatherData = results.body.data;
          let dataOne = weatherData.slice(0, 8);
          let timeOfDay = Date.now();
          const sql = `INSERT INTO weather (formatted_query, forecast, date_entered) VALUES ($1, $2, $3)`;
          const safeValues = [formatted_query, JSON.stringify(dataOne), timeOfDay];
  
          client.query(sql, safeValues)
          .then(() => {
            res.send(dataOne.map((value) => new Weather(value.weather.description, value.datetime)
            )
          );
        });
      })
      .catch((error) => {
        res.status(500).send('Unable to process request, please try again.');
      });
    }
});
}

function handleHiking(req, res){
    try {
        const lat = req.query.latitude;
        const lon = req.query.longitude;
        let key = process.env.TRAIL_API_KEY;
        const url = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&maxDistance=10&key=${key}`;
        superagent.get(url)
            .then(hike => {
                // console.log(hike);
                const hikingData = hike.body.trails;
                console.log(hike.body.trails);
                const hikeArray = [];
                hikingData.forEach(active => {
                    hikeArray.push(new Hiking(active));
                })
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

client.connect()
  .then(() => {
    app.listen(PORT, ()=> {
      console.log(`listening on ${PORT}`);
    })
  })
  .catch(error => console.error(error));
