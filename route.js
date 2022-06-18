const subteams = require("./dynamic_data/subteams.json")
const tags = require("./dynamic_data/tags.json")
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

async function searchUsers(oauth2Client, tokens, search) {
  oauth2Client.setCredentials(tokens);
  // let responseContacts = await peopleAPI.people.searchContacts({
  //   query: "Macdonald",
  //   readMask: "names,photos,emailAddresses",
  //   auth: oauth2Client
  // });
  // console.log(responseContacts.data)

  let response = await peopleAPI.people.searchDirectoryPeople({
    query: search,
    readMask: "names,photos,emailAddresses",
    sources: [
      "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT",
      "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"
    ],
    auth: oauth2Client
  });

  let resultLength = response.data.people.length
  if (resultLength == 1){
    return response.data.people[0].resourceName.slice(7)
  } else if (resultLength == 0){
    return "Not found"
  } else {
    return "Not specific enough"
  }
}

app.use(express.json());
app.use(cookieParser());

// Serve authentication-related URLs

// Automatically log in user if valid cookie
app.get("/auto-login", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send()
  }

  let token = await pool.query(`
  select token from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
  `).then(data => data.rows[0]?.token).catch(err => console.log(err))

  if (!token){
    // Cookie not in database
    return res.status(404).send()
  }

  try {
    // Get user data
    let [publicData] = await getUserDetails(
      newClient(),
      JSON.parse(token)
    )

    // Send profile data
    res.status(200).send(publicData)
  } catch {
    // Invalid tokens
    res.status(401).send()
  }
});

// Validate user on sign in, enable automatic login
app.post("/validate-login", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send()
  }

  // Initialize client
  const oauth2Client = newClient()

  // Get tokens
  let tokenResponse = await oauth2Client.getToken(req.body.code)

  let publicData, privateData;

  try {
    // Get user data
    [publicData, privateData] = await getUserDetails(oauth2Client, tokenResponse.tokens)
  } catch {
    // Invalid tokens
    return res.status(401).send()
  }

  // Check if valid email extension
  if (
    privateData.email.split("@").slice(-1)[0] != "htps.us"
    && !externalEmails.includes(privateData.email)
  ){
    // Unauthorized user
    return res.status(401).send()
  }

  // Compare google ID against database
  let cookieID = await pool.query(`
  select cookie_uuid from cookie_user_map where google_id = E${SqlString.escape(privateData.googleID)};
  `).then(data => data.rows[0]?.cookie_uuid).catch(err => console.log(err))

  // If uuid exists, reassign, otherwise, generate and remember
  if (cookieID){
    // Replace possibly outdated credentials
    await pool.query(`
    update cookie_user_map set token = E${
      SqlString.escape(JSON.stringify(tokenResponse.tokens))
    } where google_id = E${SqlString.escape(privateData.googleID)};
    `).catch(err => console.log(err))

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
    values (E${
      SqlString.escape(cookieID)
    }, E${
      SqlString.escape(JSON.stringify(tokenResponse.tokens))
    }, E${
      SqlString.escape(privateData.googleID)
    });
    `).catch(err => console.log(err))

    // Send cookie ("remember me")
    res.cookie("userID", cookieID);

    // Send profile data
    res.status(200).send(publicData);
  }
});

// Add user, given valid credentials
// Request body should contain "subteam", "tags", and "email"
app.post("/add-user", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send()
  }

  let userData = await pool.query(`
  select token, tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
  `).then(data => data.rows[0]).catch(err => console.log(err))

  if (!userData){
    // Cookie not in database
    return res.status(404).send()
  }

  let token = userData.token;
  let userTags = userData.tags;

  // Validate person has proper credentials
  if (!userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send()
  }

  // Find user in school directory
  let userID;
  try {
    userID = await searchUsers(
      newClient(),
      JSON.parse(token),
      req.body.email
    );

    // Handle cases without one result
    if (userID == "Not found"){
      return res.status(400).send("Error: unable to find person in directory.")
    } else if (userID == "Not specific enough"){
      return res.status(400).send("Error: found multiple people in directory.")
    }

    // Make sure user ID not already in database
    let duplicateID = await pool.query(`
    select google_id from cookie_user_map where google_id = E${SqlString.escape(userID)};
    `).then(data => data.rows[0] != undefined).catch(err => console.log(err))

    if (duplicateID){
      return res.status(405).send()
    }
  } catch {
    return res.status(401).send()
  }

  // Get used uuids
  let cookieIDs = await pool.query(`
  select cookie_uuid from cookie_user_map;
  `).then(data => data.rows.map(el => el.cookie_uuid)).catch(err => console.log(err))

  // Generate UNIQUE uuid
  let cookieID = uuid();
  while (cookieIDs.includes(cookieID)) {
    cookieID = uuid();
  }

  // Check subteam valid
  if (!subteams.includes(req.body.subteam)){
    return res.status(400).send()
  }

  // Check if tags valid
  let validTags = req.body.tags.every(tag => tags.includes(tag))
  if (!validTags){
    return res.status(400).send()
  }

  // Store in database
  await pool.query(`
  insert into cookie_user_map(cookie_uuid, token, google_id, subteam, tags)
  values (E${
    SqlString.escape(cookieID)
  }, E${
    SqlString.escape(JSON.stringify({}))
  }, E${
    SqlString.escape(userID)
  }, E${
    SqlString.escape(req.body.subteam)
  }, ARRAY[${
    req.body.tags.map(tag => "E" + SqlString.escape(tag)).join(", ")
  }]);
  `).catch(err => console.log(err))

  // Send OK
  return res.status(200).send();
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
