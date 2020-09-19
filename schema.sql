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
    search_query VARCHAR(255),
    forecast VARCHAR(255),
    time VARCHAR(255),
    date_entered VARCHAR(255)
);
