DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS weather;

CREATE TABLE locations(
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude decimal,
  longitude decimal
);

CREATE TABLE weather(
    id SERIAL PRIMARY KEY,
    formatted_query VARCHAR(255),
    forecast TEXT,
    date_entered VARCHAR(255)
);
