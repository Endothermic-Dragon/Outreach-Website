const express = require('express')
const app = express()
const port = 8080

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