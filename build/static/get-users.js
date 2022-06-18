fetch("./add-user", {
  method: "POST",
  body: JSON.stringify({
    subteam: "Programming",
    tags: ["student"],
    email: "rajeshad@htps.us"
  }),
  headers: {
    "Content-Type": "text/plain",
    "X-Requested-With": "javascript-fetch"
  }
}).then(async (res) => {
  // Switch for error code?
  if (res.status != 200) {
    console.log(res)
  }

  console.log(res.text())
});
