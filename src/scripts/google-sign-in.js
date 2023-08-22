function setProfile(profileName, profilePicURL){
  // Display profile
  console.log(profileName)
  console.log(profilePicURL)
}

function signIn(){
  const client = google.accounts.oauth2.initCodeClient({
    client_id: '672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/directory.readonly',
    ux_mode: 'popup',
    callback: (response) => {
      fetch("./validate-login", {
        method: "POST",
        body: JSON.stringify({code: response.code}),
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "javascript-fetch"
        }
      })
      .then(res => res.json())
      .then(data => setProfile(data.name, data.photo))
    },
  });

  client.requestCode()
}

// Send custom headers for authentication
fetch("./auto-login", {
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "javascript-fetch"
  }
})
.then(async res => {
  // Switch for error code?
  if (res.status != 200){
    // Display log in button
    let button = document.getElementsByClassName("sign-in")[0]
    button.classList.add("show")
    return button.children[0].addEventListener("click", signIn)
  }

  // Display profile data
  let data = await res.json()
  setProfile(data.name, data.photo)
})
