const helpEmail = "studentleadership@roboraiders.com"

const subteams = require("./dynamic_data/subteams.json")
const tags = require("./dynamic_data/tags.json")
const { google } = require("googleapis");
const { Pool } = require('pg');
const {v4: uuid} = require('uuid');
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
  if (err.name == "DatabaseError"){
    throw err
  }
  error = new Error("Unable to fetch data from database.")
  error.name = "DatabaseError"
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

// Implement the last activity feature throughout, using minutes - helps when deleting user


// ---------- Serve communication URLs ----------

// ----- Sign in -----

// Automatically log in user if valid cookie
app.get("/auto-login", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
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
  } catch (e) {
    console.log(e)
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
app.post("/validate-login", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
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
    console.log(e)
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
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }

    res.status(500).send({
      errorMessage: "Unknown error encountered.",
      errorData: e
    })
  }
});

// ----- Deal with users -----
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
    console.log(e)
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

  if (!req.body.query){
    return res.status(400).send({errorMessage:"Recieved empty query."})
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
    return res.status(400).send({})
  }

  let userData;
  try {
    userData = await pool.query(`
    select token, tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
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
    return res.status(400).send({errorMessage:"You must specify a subteam."})
  }

  // Check if tags valid
  let validTags = req.body.tags.every(tag => tags.includes(tag)) && req.body.tags.length != 0
  if (!validTags){
    return res.status(400).send({errorMessage:"You must specify at least one tag, or you have entered an invalid tag."})
  }

  if (!userTags.includes("super-admin") && (req.body.tags.includes("admin") || req.body.tags.includes("super-admin"))){
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
      return res.status(400).send({
        errorMessage: "Error: unable to find person in directory."
      })
    } else if (userID == "Not specific enough"){
      return res.status(400).send({
        errorMessage: "Error: found multiple people in directory."
      })
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
    insert into cookie_user_map(cookie_uuid, token, google_id, subteam, tags, last_activity)
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
    }], ${Math.floor(new Date().getTime() / 60000)});
    `).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  // Send OK
  return res.status(200).send({});
});

// Modify a user
// Request body should contain "user_id", "subteam", and "tags"
app.post("/edit-user", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userTags;
  try {
    userTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  if (!userTags){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  // Validate person has proper credentials
  if (!userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`})
  }

  if (!userTags.includes("super-admin") && (req.body.tags.includes("admin") || req.body.tags.includes("super-admin"))){
    return res.status(403).send({errorMessage:"You do not have the proper credential authority to use this tag."})
  }

  let modifiedUserTags;
  try {
    modifiedUserTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.body.user_id)};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  if (!userTags.includes("super-admin") && (modifiedUserTags.includes("admin") || modifiedUserTags.includes("super-admin"))){
    return res.status(403).send({errorMessage:"You do not have the proper credential authority to modify this user."})
  }

  // Check subteam valid
  if (!subteams.includes(req.body.subteam)){
    return res.status(400).send({errorMessage: "You must specify a subteam."})
  }

  // Check if tags valid
  let validTags = req.body.tags.every(tag => tags.includes(tag)) && req.body.tags.length != 0
  if (!validTags){
    return res.status(400).send({errorMessage:"You must specify at least one tag, or you have entered an invalid tag."})
  }

  // Modify data appropriately
  try {
    await pool.query(`
    update cookie_user_map set
    tags = ARRAY[${
      req.body.tags.map(tag => "E" + SqlString.escape(tag)).join(", ")
    }],
    subteam = E${SqlString.escape(req.body.subteam)}
    where cookie_uuid = E${SqlString.escape(req.body.user_id)};
    `).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  // Send OK
  return res.status(200).send({});
});

// Delete a user
// Request body should contain "user_id"
app.post("/delete-user", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userTags;
  try {
    userTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  if (!userTags){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  // Validate person has proper credentials
  if (!userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`})
  }

  let modifiedUserTags;
  try {
    modifiedUserTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.body.user_id)};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  if (!userTags.includes("super-admin") && (modifiedUserTags.includes("admin") || modifiedUserTags.includes("super-admin"))){
    return res.status(403).send({errorMessage:"You do not have the proper credential authority to delete this user."})
  }

  // Delete user
  try {
    await pool.query(`
    delete from cookie_user_map where cookie_uuid = E${SqlString.escape(req.body.user_id)};
    `).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
  }

  // Send OK
  return res.status(200).send({});
});

// ----- Deal with events -----

// Add an event
// Request body should contain "name" and "description"
// TO DO: add other parameters
app.post("/add-event", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userTags;
  try {
    userTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
    })
    }
  }

  if (!userTags){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  // Validate person has proper credentials
  if (!userTags.includes("manager") && !userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({
      errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`
    })
  }

  // Check if all the required data present
  if (!req.body.name || !req.body.description){
    return res.status(400).send({errorMessage: "Please set both a name and a description."})
  }

  if (req.body.name.lenth > 200){
    return res.status(400).send({errorMessage: "The name cannot be greater than 200 characters."})
  }

  if (req.body.description.lenth > 5000){
    return res.status(400).send({errorMessage: "The description cannot be greater than 5000 characters."})
  }

  try {
    // Get used IDs
    let uniqueIDs = await pool.query(`
    select unique_id from initiatives;
    `).then(data => data.rows.map(el => el.unique_id)).catch(handleDatabaseError)

    // Generate UNIQUE ID for initiative
    let uniqueID = uuid();
    while (uniqueIDs.includes(uniqueID)) {
      uniqueID = uuid();
    }

    // Get the max order_id, increment by 1 for the new initiative
    let maxID = await pool.query(`
    select max(order_id) from initiatives;
    `).then(data => {
      if (data.rows.length > 1){
        error = new Error("Multiple items found with same order_id.")
        error.name = "DatabaseError"
        error.response = data.rows
        throw error
      }
      return data.rows[0]?.max || 0
    }).catch(handleDatabaseError)

    let newID = maxID + 1;

    // Store in database
    await pool.query(`
    insert into initiatives(unique_id, order_id, name, description, participants, engagement, hide_log, hide_public)
    values (E${
      SqlString.escape(uniqueID)
    }, ${newID}, E${
      SqlString.escape(req.body.name)
    }, E${
      SqlString.escape(req.body.description)
    }, 0, 0, false, false);
    `).catch(handleDatabaseError)

  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
    return res.status(500).send({
      errorMessage: "Unknown error encountered.",
      errorData: e
    })
  }

  res.status(200).send({unique_id: uniqueID})
})

// Modify an event
// Request body should contain "unique_id"
// Request body should contain at least one of the following: "name", "description", "lead", "regular", "hide_log", or "hide_public"
app.post("/edit-event", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userTags;
  try {
    userTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
    })
    }
  }

  if (!userTags){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  // Validate person has proper credentials
  if (!userTags.includes("manager") && !userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({
      errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`
    })
  }

  if (!req.body.unique_id){
    return res.status(400).send({
      errorMessage: "Unique initiative ID not present."
    })
  }

  if (!req.body.name && !req.body.description && req.body.lead == undefined && req.body.regular == undefined && req.body.hide_log == undefined && req.body.hide_public == undefined){
    return res.status(400).send({
      errorMessage: "You need to update at least one parameter of the intiative."
    })
  }

  if (req.body.name && req.body.name.lenth > 200){
    return res.status(400).send({errorMessage: "The name cannot be greater than 200 characters."})
  }

  if (req.body.description && req.body.description.lenth > 5000){
    return res.status(400).send({errorMessage: "The description cannot be greater than 5000 characters."})
  }

  try {
    let updateQuery = []
    if (req.body.name){
      updateQuery.push(`name = E${SqlString.escape(req.body.name)}`)
    }
    if (req.body.description){
      updateQuery.push(`description = E${SqlString.escape(req.body.description)}`)
    }
    if (req.body.lead != undefined){
      updateQuery.push(`lead = ${req.body.lead ? "true" : "false"}`)
    }
    if (req.body.regular != undefined){
      updateQuery.push(`regular = ${req.body.regular ? "true" : "false"}`)
    }
    if (req.body.hide_log != undefined){
      updateQuery.push(`hide_log = ${req.body.hide_log ? "true" : "false"}`)
    }
    if (req.body.hide_public != undefined){
      updateQuery.push(`hide_public = ${req.body.hide_public ? "true" : "false"}`)
    }

    await pool.query(`
    update initiatives
    set ${updateQuery.join(", ")}
    where unique_id = E${
      SqlString.escape(req.body.unique_id)
    };`).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
    return res.status(500).send({
      errorMessage: "Unknown error encountered.",
      errorData: e
    })
  }

  res.status(200).send({})
})

// Update the order of events
// Request body should contain a list of elements with attributes "unique_id", "old", and "new"
app.post("/order-events", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userTags;
  try {
    userTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
    })
    }
  }

  if (!userTags){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  // Validate person has proper credentials
  if (!userTags.includes("manager") && !userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({
      errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`
    })
  }

  if ((req.body || []).length < 2){
    return res.status(400).send({
      errorMessage: "Invalid update request - must contain at least two elements.",
      errorData: req.body
    })
  }

  // Check to make sure each has both old and new and unique_id
  if (!req.body.every(el => el.unique_id && el.old && el.new)){
    return res.status(400).send({
      errorMessage: "Invalid update request - each element must contain an initiative's unique ID, old ID, and new ID."
    })
  }

  // Make sure new IDs are unique
  let oldOrder = req.body.map(el => el.old)
  if (oldOrder.length != new Set(oldOrder).size){
    return res.status(400).send({
      errorMessage: "Invalid update request - old IDs must be unique.",
      errorData: req.body
    })
  }

  // Make sure old IDs are unique
  let newOrder = req.body.map(el => el.new)
  if (newOrder.length != new Set(newOrder).size){
    return res.status(400).send({
      errorMessage: "Invalid update request - new IDs must be unique.",
      errorData: req.body
    })
  }

  // Make sure old and new IDs have the same elements
  if (!oldOrder.every(el => newOrder.includes(el))){
    return res.status(400).send({
      errorMessage: "Invalid update request - old IDs and new IDs do not contain the same set of values.",
      errorData: req.body
    })
  }

  // Check that old IDs match
  try {
    // Fix old and new 
    await pool.query(`
      select unique_id, order_id from initiatives where unique_id in ${
        "(" + req.body.map(el => "E" + SqlString.escape(el.unique_id)).join(",") + ")"
      };
    `).then(data => {
      if (data.rows.length != req.body.length){
        error = new Error("Unable to find all initiatives in database.")
        error.name = "DatabaseError"
        error.response = data.rows
        throw error
      }

      if (!req.body.every(el => {
        return (data.rows.find(el2 => el.unique_id == el2.unique_id) || []).order_id == el.old
      })){
        error = new Error("Mismatched unique_id and order_id.")
        error.name = "DatabaseError"
        error.response = data.rows
        throw error
      }
    }).catch(handleDatabaseError)

    // Update with new IDs
    await pool.query(`
    update initiatives set order_id = case unique_id
    ${
      req.body.map(el => {
        return `when E${SqlString.escape(el.unique_id)} then ${el.new}`
      }).join("\n") + "\nend"
    }
    where unique_id in ${
      "(" + req.body.map(el => "E" + SqlString.escape(el.unique_id)).join(",") + ")"
    };
    `).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
    return res.status(500).send({
      errorMessage: "Unknown error encountered.",
      errorData: e
    })
  }
  res.status(200).send({})
})

// Delete event
// Request body should contain "unique_id"
app.post("/delete-event", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userTags;
  try {
    userTags = await pool.query(`
    select tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]?.tags).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
    })
    }
  }

  if (!userTags){
    // Cookie not in database
    return res.status(404).send({errorMessage:`You are not a registered user. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> to be added to the database, or for additional help.`})
  }

  // Validate person has proper credentials
  if (!userTags.includes("manager") && !userTags.includes("admin") && !userTags.includes("super-admin")){
    return res.status(403).send({
      errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`
    })
  }

  if (!req.body.unique_id){
    return res.status(400).send({errorMessage: "Please include the initiative's unique ID."})
  }

  try {
    // Delete by unique ID
    await pool.query(`
    delete from initiatives where unique_id = E${SqlString.escape(req.body.unique_id)};
    `).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
    return res.status(500).send({
      errorMessage: "Unknown error encountered.",
      errorData: e
    })
  }

  res.status(200).send({})
})

// ----- Logging hours -----

// Add hours
// Update their JSON data
// Update engagement stats for event
// Update participant stats for event
// Update last_activity
// Deal with engagement carefully - JS number overflow?

// Request body should contain "unique_id", "time", and "lead"
app.post("/add-hours", async function (req, res) {
  if (!domains.includes(req.get("host")) || req.get("X-Requested-With") != "javascript-fetch"){
    // Unauthorized request origin
    return res.status(400).send({})
  }

  let userData;
  try {
    userData = await pool.query(`
    select googleID, tags from cookie_user_map where cookie_uuid = E${SqlString.escape(req.cookies.userID || "")};
    `).then(data => data.rows[0]).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
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

  let userTags = userData.tags
  let googleID = userData.google_id

  // Validate person has proper credentials
  if (!userTags.includes("student")){
    return res.status(403).send({
      errorMessage:`You do not have access to this resource. Please contact <a href="mailto:${helpEmail}">${helpEmail}</a> if you think this is a mistake.`
    })
  }

  if (!req.body.unique_id){
    return res.status(400).send({errorMessage: "You must specify an initiative ID."})
  }

  if (!req.body.time){
    return res.status(400).send({errorMessage: "You must specify the amount of volunteering time."})
  }

  if (req.body.time > 600 || req.body.time <= 0){
    return res.status(400).send({errorMessage: "Your volunteering hours must be between 0 and 10 hours."})
  }

  if (req.body.lead){
    return res.status(400).send({errorMessage: "You must specify whether the time are for lead or regular."})
  }

  // Get initiative name
  // Check if lead or regular is an option
  let timeTypeValid, initiativeName, oldData;
  try {
    await pool.query(`
    select name, lead, regular from initiatives where unique_id = ${req.body.unique_id};
    `).then(data => {
      if (data.rows.length > 1){
        error = new Error("Multiple items found with same unique_id.")
        error.name = "DatabaseError"
        error.response = data.rows
        throw error
      }
      if (data.rows.length == 0){
        error = new Error("Could not find initiative in database.")
        error.name = "DatabaseError"
        error.response = data.rows
        throw error
      }

      if (req.body.lead){
        timeTypeValid = data.rows[0].lead
      } else {
        timeTypeValid = data.rows[0].regular
      }

      initiativeName = data.rows[0].name
    }).catch(handleDatabaseError)

    await pool.query(`
    select initiative_data from outreach where google_id = E${SqlString.escape(googleID)};
    `).then(async data => {
      if (data.rows.length > 1){
        error = new Error("Multiple users found with same google_id.")
        error.name = "DatabaseError"
        error.response = data.rows
        throw error
      }
      if (data.rows.length == 0){
        await pool.query(`
        insert into outreach (google_id, initiative_data) values (E${SqlString.escape(googleID)}, E${SqlString.escape([])});
        `)
        oldData = []
      } else {
        oldData = JSON.parse(data.rows[0].initiative_data)
      }
    }).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
    return res.status(500).send({
      errorMessage: "Unknown error encountered.",
      errorData: e
    })
  }

  if (!timeTypeValid){
    return res.status(400).send({errorMessage: `${req.body.lead ? "Lead" : "Regular"} volunteering hours are not available for this initiative.`})
  }

  // Update last_activity and use as time
  let timestamp = Math.floor(new Date().getTime() / 60000)

  // Add initiativeName, timestamp, and time to oldData (account for lead)

  // Update with oldData
  try {
    await pool.query(`
    update outreach set initiative_data = ${JSON.stringify(oldData)} where google_id = E${SqlString.escape(googleID)};
    `).catch(handleDatabaseError)
  } catch (e) {
    console.log(e)
    if (e.name == "DatabaseError"){
      return res.status(502).send({
        errorMessage:"Unable to fetch data from database.",
        errorData: e
      })
    }
    return res.status(500).send({
      errorMessage: "Unknown error encountered.",
      errorData: e
    })
  }
})


// Remove hours



// ---------- Serve website-related URLs ----------
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
