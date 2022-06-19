const helpEmail = "studentleadership@roboraiders.com"

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

function handleDatabaseError(err) {
  error = new Error("Unable to fetch data from database.")
  error.name("DatabaseError")
  error.response = err
  throw error
}

const domains = ["localhost"]

// Get profile details from ID token
async function getUserDetails(oauth2Client, tokens) {
  oauth2Client.setCredentials(tokens);

  let response = await peopleAPI.people.get({
    resourceName: "people/me",
    personFields: "names,photos",
    auth: oauth2Client,
  });

  let publicData = {
    name: response.data.names.find((el) => el.metadata.primary).displayName,
    photo: response.data.photos.find((el) => el.metadata.primary).url
  };

  let privateData = {
    googleID: response.data.resourceName.slice(7)
  };

  return [publicData, privateData];
}

async function searchUsers(oauth2Client, tokens, search) {
  oauth2Client.setCredentials(tokens);

  let response = await peopleAPI.people.searchDirectoryPeople({
    query: search,
    readMask: "names,photos,emailAddresses",
    sources: [
      "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT",
      "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"
    ],
    auth: oauth2Client
  }).then(searchResponse => searchResponse.data.people || []);

  return response.map(el => {
    return {
      name: el.names.find(el2 => el2.metadata.primary).displayName,
      photo: el.photos ? el.photos.find(el2 => el2.metadata.primary).url.slice(0,-5) : "",
      email: el.emailAddresses.find(el2 => el2.metadata.primary).value
    }
  })
}

async function findUniqueUser(oauth2Client, tokens, search) {
  oauth2Client.setCredentials(tokens);

  let response = await peopleAPI.people.searchDirectoryPeople({
    query: search,
    readMask: "names,photos,emailAddresses",
    sources: [
      "DIRECTORY_SOURCE_TYPE_DOMAIN_CONTACT",
      "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"
    ],
    auth: oauth2Client
  }).then(searchResponse => searchResponse.data.people);

  if (response.length > 1){
    let error = new Error(`Unexpected response of ${response.length} results.\nTo view the complete response, view the "response" attribute of this error.`)
    error.name = "MultipleResults"
    error.response = response
    throw error
  }

  if (response.length < 1){
    let error = new Error(`Unexpected response of ${response.length} results.\nTo view the complete response, view the "response" attribute of this error.`)
    error.name = "NullResponse"
    throw error
  }

  return response[0].resourceName.slice(7)
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

  try {
    let token = await pool.query(`
    select token from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]?.token).catch(handleDatabaseError)
  
    if (!token){
      // Cookie not in database
      return res.status(404).send({errorMessage:`Unable to sign in automatically.`})
    }

    // Get user data
    let [publicData] = await getUserDetails(
      newClient(),
      JSON.parse(token)
    )

    // Send profile data
    res.status(200).send(publicData)
  } catch {
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }

    res.status(502).send({
      errorMessage: "Unknown error encountered while fetching user's Google data. Try signing out and signing back in.",
      errorData: e
    })
  }
});

// Validate user on sign in, enable automatic login
// TO DO: fix so users aren't added automatically
app.post("/validate-login", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send()
  }

  // Initialize client
  const oauth2Client = newClient()

  let tokenResponse, publicData, privateData;
  try {
    // Get tokens
    tokenResponse = await oauth2Client.getToken(req.body.code);

    // Get user data
    [publicData, privateData] = await getUserDetails(oauth2Client, tokenResponse.tokens)
  } catch (e) {
    // Invalid tokens
    return res.status(502).send({
      errorMessage: "Unknown error encountered while fetching user's Google data. Try signing in again.",
      errorData: e
    })
  }

  try {
    // Compare google ID against database
    let cookieID = await pool.query(`
    select cookie_uuid from cookie_user_map where google_id = E${SqlString.escape(privateData.googleID)};
    `).then(data => data.rows[0]?.cookie_uuid).catch(handleDatabaseError)

    // Replace possibly outdated credentials
    await pool.query(`
    update cookie_user_map set token = E${
      SqlString.escape(JSON.stringify(tokenResponse.tokens))
    } where google_id = E${SqlString.escape(privateData.googleID)};
    `).catch(handleDatabaseError)

    // Send cookie ("remember me")
    res.cookie("userID", cookieID)

    // Send profile data
    res.status(200).send(publicData)

    // } else {
    //   return res.status(401).send()
    // }
  } catch (e) {
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }

    res.status(404).send(`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`)
  }
});

// Search for user - provide live suggessions
// Request body should contain "query"
app.post("/search", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userData;
  try {
    userData = await pool.query(`
    select token, tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]).catch(handleDatabaseError)
  } catch (e) {
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
    })
    }
  }

  if (!userData){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  let token = userData.token;
  let userTags = userData.tags;

  // Validate person has proper credentials
  if (!userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`})
  }

  // Find user in school directory
  let searchResults;
  try {
    searchResults = await searchUsers(
      newClient(),
      JSON.parse(token),
      req.body.query
    );
  } catch (e) {
    console.log(e)
    return res.status(502).send({
      errorMessage: "Unknown error encountered while fetching search results from Google. Try signing out and signing back in.",
      errorData: e
    })
  }

  res.status(200).send(searchResults)
})

// Add user, given valid credentials
// Request body should contain "subteam", "tags", and "email"
app.post("/add-user", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send()
  }

  let userData;
  try {
    userData = await pool.query(`
    select token, tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]).catch(handleDatabaseError)
  } catch (e) {
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  if (!userData){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  let token = userData.token;
  let userTags = userData.tags;

  // Validate person has proper credentials
  if (!userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`})
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

  if (userTags.includes("admin") && (req.body.tags.includes("admin") || req.body.tags.includes("super-admin"))){
    return res.status(403).send({errorMessage:"You do not have the proper credential authority to use this tag."})
  }

  // Find user in school directory
  let userID;
  try {
    userID = await findUniqueUser(
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
    `).then(data => data.rows[0] != undefined).catch(handleDatabaseError)

    if (duplicateID){
      return res.status(405).send({errorMessage: "Invalid user - already exists in database."})
    }
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
    if (e.name == "MultipleResults"){
      return res.status(500).send({
        errorMessage: "Unexpected error - more than one user found.",
        errorData: e
      })
    }
    if (e.name == "NullResponse"){
      return res.status(500).send({errorMessage: "Unexpected error - no users found."})
    }
    return res.status(502).send({
      errorMessage: "Unknown error encountered while fetching user's Google data. Try signing out and signing back in.",
      errorData: e
    })
  }

  try {
    // Get used uuids
    let cookieIDs = await pool.query(`
    select cookie_uuid from cookie_user_map;
    `).then(data => data.rows.map(el => el.cookie_uuid)).catch(handleDatabaseError)

    // Generate UNIQUE uuid
    let cookieID = uuid();
    while (cookieIDs.includes(cookieID)) {
      cookieID = uuid();
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
    `).catch(handleDatabaseError)
  } catch (e) {
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

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
