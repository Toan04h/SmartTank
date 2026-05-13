DROP TABLE IF EXISTS "trips";
DROP TABLE IF EXISTS "vehicles";
DROP TABLE IF EXISTS "users";

CREATE TABLE "users" (
  "userId" integer PRIMARY KEY,
  "firstName" varchar(255),
  "lastName" varchar(255),
  "email" varchar(255),
  "password" varchar(255),
  "createdAt" timestamp
);

CREATE TABLE "vehicles" (
  "vehicleId" integer PRIMARY KEY,
  "vin" varchar(17),
  "make" varchar(100),
  "model" varchar(100),
  "year" integer,
  "mpg" float,
  "fuelType" varchar(20),
  "engineSize" varchar(4),
  "userId" integer
);

CREATE TABLE "trips" (
  "tripId" integer PRIMARY KEY,
  "startTime" timestamp,
  "endTime" timestamp,
  "startLocation" varchar(255),
  "endLocation" varchar(255),
  "distanceTraveled" float,
  "fuelUsed" float,
  "cost" float,
  "co2" float,
  "userId" integer,
  "vehicleId" integer
);

ALTER TABLE "trips" ADD FOREIGN KEY ("userId") REFERENCES "users" ("userId") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "trips" ADD FOREIGN KEY ("vehicleId") REFERENCES "vehicles" ("vehicleId") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "vehicles" ADD FOREIGN KEY ("userId") REFERENCES "users" ("userId") DEFERRABLE INITIALLY IMMEDIATE;