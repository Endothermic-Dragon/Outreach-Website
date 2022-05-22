const { google } = require("googleapis");
const { Pool } = require('pg');
const uuid = require("uuid").v4;
const SqlString = require('sqlstring');
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const port = 80;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function newClient(){
  return new google.auth.OAuth2(
    "672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com",
    "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",
    "http://localhost"
  );
}

const peopleAPI = google.people({
  version: "v1",
});

const externalEmails = ["eshaandebnath@gmail.com", "endothermic.dragon@gmail.com"]
const domains = ["localhost"]


// Replace with database
let token_data = {};

// Database format
// Col 1: cookie ID
// Col 2: tokens required to get data
// Col 3: google ID
// When adding new data, wipe old data with same google ID


// Use pg for database

// Get profile details from ID token
async function getUserDetails(oauth2Client, tokens) {
  oauth2Client.setCredentials(tokens);

  let response = await peopleAPI.people.get({
    resourceName: "people/me",
    personFields: "names,photos,emailAddresses",
    auth: oauth2Client,
  });

  let publicData = {
    name: response.data.names.find((el) => el.metadata.primary).displayName,
    photo: response.data.photos.find((el) => el.metadata.primary).url,
  };

  let privateData = {
    email: response.data.emailAddresses.find((el) => el.metadata.primary).value,
    googleID: response.data.resourceName.slice(7),
  };

  return [publicData, privateData];
}

app.use(express.json());
app.use(cookieParser());

// Serve authentication-related URLs

app.get("/auto-login-user", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send()
  }

  let token = await pool.query(`
  select token from cookie_user_map where cookie_uuid = '${req.cookies.userID}';
  `).then(data => data.rows[0]?.token).catch(err => console.log(err))

  if (!token){
    // Cookie not in database
    return res.status(404).send()
  }

  try {
    // Get user data
    let [publicData] = await getUserDetails(
      newClient(),
      JSON.parse(token.replaceAll("\\", ""))
    )

    // Send profile data
    res.status(200).send(publicData)
  } catch {
    // Invalid tokens
    res.status(401).send()
  }
});

app.post("/validate-login-code", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send()
  }

  // Initialize client
  const oauth2Client = newClient()

  // Get tokens
  let tokenResponse = await oauth2Client.getToken(req.body.code)

  let publicData, privateData

  try {
    // Get user data
    [publicData, privateData] = await getUserDetails(oauth2Client, tokenResponse.tokens)
  } catch {
    // Invalid tokens
    return res.status(401).send()
  }

  // Check if valid email extension
  if (
    !privateData.email.split("@").slice(-1)[0] != "htps.us"
    && !externalEmails.includes(privateData.email)
  ){
    // Unauthorized user
    return res.status(401).send()
  }

  // Compare google ID against database
  let cookieID = await pool.query(`
  select cookie_uuid from cookie_user_map where google_id = '${privateData.googleID}';
  `).then(data => data.rows[0]?.cookie_uuid).catch(err => console.log(err))

  // If uuid exists, reassign, otherwise, generate and remember
  if (cookieID){
    // Send cookie ("remember me")
    res.cookie("userID", cookieID)

    // Send profile data
    res.status(200).send(publicData)
  } else {
    // Get used uuids
    let cookieIDs = await pool.query(`
    select cookie_uuid from cookie_user_map;
    `).then(data => data.rows.map(el => el.cookie_uuid)).catch(err => console.log(err))

    // Generate UNIQUE uuid
    cookieID = uuid();
    while (true) {
      if (!cookieIDs.includes(cookieID)) {
        break;
      }
      cookieID = uuid();
    }

    // Store in database
    await pool.query(`
    insert into cookie_user_map(cookie_uuid, token, google_id)
    values (${
      SqlString.escape(cookieID)
    }, ${
      SqlString.escape(JSON.stringify(tokenResponse.tokens))
    }, ${
      SqlString.escape(privateData.googleID)
    });
    `).catch(err => console.log(err))

    // Send cookie ("remember me")
    res.cookie("userID", cookieID);

    // Send profile data
    res.status(200).send(publicData);
  }
});

// Serve regular files
// Serve static resources, styling, and scripts
app.use("/static", express.static("build/static"));
app.use("/style", express.static("build/style"));
app.use("/scripts", express.static("build/scripts"));

// Redirect ".html"
app.use("/", function (req, res, next) {
  if (req.url.slice(-5) == ".html") {
    // Update later
    res.status(200);
    return res.redirect(req.url.slice(0, -5));
  }
  next();
});

// Serve HTML files
app.use(function (req, res) {
  res.status(200).sendFile(req.url + ".html", { root: __dirname + "/build" });
});

// Start server
app.listen(port, () => console.log(`Server listening on port: ${port}`));
