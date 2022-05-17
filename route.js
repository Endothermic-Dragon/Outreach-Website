const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    "672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com",
    "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",
    "http://localhost"
);

const peopleAPI = google.people({
    version: 'v1',
    auth: oauth2Client
})

const express = require('express')
const app = express()
const port = 80

app.use(express.json());

app.post("/validate-login-code", async function(req, res){
    if (req.get("X-Requested-With") == "javascript-fetch"){
        let tokenResponse = await oauth2Client.getToken(req.body.code)

        oauth2Client.setCredentials(tokenResponse.tokens)

        let response = await peopleAPI.people.get({
            resourceName: "people/me",
            personFields: "names,photos,emailAddresses"
        })

        let data = response.data

        console.log(data)
        res.status(200).send({data: data})
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