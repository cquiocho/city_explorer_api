DROP TABLE IF EXISTS city_location;

CREATE TABLE city_data(
  id SERIAL PRIMARY KEY,
  city_name VARCHAR(255),
  lat INT,
  lon INT
)
