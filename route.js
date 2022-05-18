const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    "672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com",
    "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",
    "http://localhost"
);

const peopleAPI = google.people({
    version: 'v1'
})

const uuid = require('uuid').v4;
token_data = {}
// var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database('./user_tokens.db', (err) => {
// if (err) {
//     console.error(err.message);
// }
// console.log('Connected to the my database.');
// });

const express = require('express')
const cookieParser = require('cookie-parser')
const app = express()
const port = 80
var queue = []
var running = false

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getUserDetails(tokens){
    while (running){
        await sleep(100)
    }
    running = true

    oauth2Client.setCredentials(tokens)

    let response = await peopleAPI.people.get({
        resourceName: "people/me",
        personFields: "names,photos,emailAddresses",
        auth: oauth2Client
    })

    let publicData = {
        name: response.data.names.find(el => el.metadata.primary).displayName,
        photo: response.data.photos.find(el => el.metadata.primary).url
    }

    let privateData = {
        email: response.data.emailAddresses.find(el => el.metadata.primary).value,
        googleID: response.data.resourceName.slice(7)
    }

    running = false
    return [publicData, privateData]
}

app.use(express.json());
app.use(cookieParser());

app.get("/auto-login-user", async function(req, res){
    if (token_data[req.cookies.userID]){
        let userData = await getUserDetails(JSON.parse(token_data[req.cookies.userID])[0])
        res.status(200).send({data: userData[0]})
        // Handle if error
    } else {
        res.status(404).send()
    }
})

app.post("/validate-login-code", async function(req, res){
    if (req.get("X-Requested-With") == "javascript-fetch"){
        let tokenResponse = await oauth2Client.getToken(req.body.code)

        let userID = uuid()
        while (true){
            if (!token_data[userID]){
                break
            }
            userID = uuid()
        }

        let [publicData, privateData] = await getUserDetails(tokenResponse.tokens)

        token_data[userID] = JSON.stringify([tokenResponse.tokens, privateData])

        console.log(publicData)
        res.cookie("userID", userID)
        res.status(200).send({data: publicData})
    }
})

app.use("/static", express.static('build/static'))
app.use("/style", express.static('build/style'))
app.use("/scripts", express.static('build/scripts'))

app.use('/', function(req, res, next){
    if (req.url.slice(-5) == ".html") {
        res.status(200);
        return res.redirect(req.url.slice(0,-5));
    }
    next()
});

app.use(function(req, res){
    res.sendFile(req.url + ".html", { root: __dirname + "/build" })
})

app.listen(port, () => console.log(`Server listening on port: ${port}`));