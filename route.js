const { google } = require("googleapis");
const peopleAPI = google.people({
  version: "v1",
});
const uuid = require("uuid").v4;
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const port = 80;

function newClient(){
  return new google.auth.OAuth2(
    "672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com",
    "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",
    "http://localhost"
  );
}

// Replace with database
let token_data = {};

// Database format
// Col 1: cookie ID
// Col 2: tokens required to get data
// Col 3: google ID
// When adding new data, wipe old data with same google ID


// Use pg not sqlite3

// const sqlite3 = require("sqlite3").verbose();
// const userTokensDB = new sqlite3.Database("./user_tokens.db", (err) => {
//   if (err) {
//     console.error(err.message);
//   }
//   console.log("Connected to the user_tokens database.");
// });

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
  // TO DO: Validate origin URL

  if (req.get("X-Requested-With") == "javascript-fetch") {
    if (token_data[req.cookies.userID]) {
      // Initialize client
      const oauth2Client = newClient()

      // TO DO: Handle if error (500)

      // Get user data
      let userData = await getUserDetails(
        oauth2Client,
        JSON.parse(token_data[req.cookies.userID])[0]
      );

      // Send profile data
      res.status(200).send(userData[0]);
    } else {
      // Not in token database
      res.status(400).send();
    }
  } else {
    // Unauthorized request
    res.status(404).send();
  }
});

app.post("/validate-login-code", async function (req, res) {
  // Initialize client
  const oauth2Client = newClient()

  // TO DO: Validate origin URL

  if (req.get("X-Requested-With") == "javascript-fetch") {
    // TO DO: Handle if error (500)

    // Initialize client
    let tokenResponse = await oauth2Client.getToken(req.body.code);

    // Get user data
    let [publicData, privateData] = await getUserDetails(oauth2Client, tokenResponse.tokens);

    // Check if valid email extension
    if (
      !["htps.us", "gmail.com"].includes(
        privateData.email.split("@").slice(-1)[0]
      )
    ){
      // Unauthorized user
      return res.status(404).send()
    }

    // Compare google ID against database
    let userData = Object.entries(token_data).find(el => JSON.parse(el[1])[1] == privateData.googleID)

    // If uuid exists, reassign, otherwise, generate and remember
    if (userData){
      // Send cookie ("remember me")
      res.cookie("userID", userData[0])

      // Send profile data
      res.status(200).send(publicData)
    } else {
      // Generate UNIQUE value to ID user
      let cookieID = uuid();
      while (true) {
        if (!token_data[cookieID]) {
          break;
        }
        cookieID = uuid();
      }

      // Store in database
      token_data[cookieID] = JSON.stringify([
        tokenResponse.tokens,
        privateData.googleID,
      ]);

      // Send cookie ("remember me")
      res.cookie("userID", cookieID);

      // Send profile data
      res.status(200).send(publicData);
    }

  } else {
    // Unauthorized request
    res.status(404).send();
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
    res.status(200);
    return res.redirect(req.url.slice(0, -5));
  }
  next();
});

// Serve HTML files
app.use(function (req, res) {
  res.sendFile(req.url + ".html", { root: __dirname + "/build" });
});

// Start server
app.listen(port, () => console.log(`Server listening on port: ${port}`));
