-- users
CREATE SCHEMA IF NOT EXISTS users_schema AUTHORIZATION ndmcadmin;

CREATE TABLE IF NOT EXISTS users_schema.users (
    id SERIAL PRIMARY KEY,
    name  TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);

GRANT ALL PRIVILEGES ON SCHEMA users_schema TO ndmcadmin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA users_schema TO ndmcadmin;

-- products
CREATE SCHEMA IF NOT EXISTS products_schema AUTHORIZATION ndmcadmin;

CREATE TABLE IF NOT EXISTS products_schema.products (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL
);

GRANT ALL PRIVILEGES ON SCHEMA products_schema TO ndmcadmin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA products_schema TO ndmcadmin;