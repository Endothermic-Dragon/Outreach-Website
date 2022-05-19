function signIn(){
  const client = google.accounts.oauth2.initCodeClient({
    client_id: '672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    ux_mode: 'popup',
    callback: (response) => {
      console.log(response)
      fetch("./validate-login-code", {
        method: "POST",
        body: JSON.stringify({code: response.code}),
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "javascript-fetch"
        }
      })
      .then(res => res.json())
      .then(data => console.log(data))
    },
  });

  client.requestCode()
}

// Send custom headers for authentication
fetch("./auto-login-user", {
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "javascript-fetch"
  }
})
.then(async res => {
  if (res.status == 400){
    // Display log in button
    let button = document.getElementsByClassName("sign-in")[0]
    button.classList.add("show")
    button.children[0].addEventListener("click", signIn)
  } else if (res.status == 200) {
    // Display profile data
    let data = await res.json()
    console.log(data)
  } else {
    // Other error
  }
})