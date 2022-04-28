const express = require("express");
const app = express();

// app.use(function (request, response, next) {
// 	console.log(1)
//   response.writeHead(200, {
//     "Content-Type": "text/html",
//   });
//   next();
// });

app.get("/", function (request, response) {
	console.log(1)
  // response.writeHead(200, {
  //   "Content-Type": "text/html",
  // });
  response.sendFile("./Website Code/home/index.html", {root: ".", "Content-Type": "text/html"});
});

app.get("/home", function (request, response) {
	console.log(1)
  // response.writeHead(200, {
  //   "Content-Type": "text/html",
  // });
  response.sendFile("./Website Code/home/index.html", {root: ".", "Content-Type": "text/html"});
});

app.use("/login", function (request, response) {
	console.log(1)
  // response.writeHead(200, {
  //   "Content-Type": "text/html",
  // });
  response.sendFile("./Website Code/login/index.html", {root: ".", "Content-Type": "text/html"});
});

// Start that server
app.listen(1337);
