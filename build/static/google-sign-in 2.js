function signIn(){
  // const client = google.accounts.oauth2.initTokenClient({
  //   client_id: '672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com',
  //   scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  //   callback: (tokenResponse) => {
  //     console.log(tokenResponse)
      
  //     fetch('https://people.googleapis.com/v1/people/me?personFields=names,photos,emailAddresses', {
  //       "method": "GET",
  //       "headers": {
  //         "Authorization": "Bearer " + tokenResponse.access_token
  //       }
  //     })
  //     .then(response => response.json())
  //     .then(data => console.log(data))
  //   },
  // });

  // client.requestAccessToken();

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
      .then(response => response.json())
      .then(data => console.log(data))
      // const xhr = new XMLHttpRequest();
      // xhr.open('POST', code_receiver_uri, true);
      // xhr.onload = function() {
      //   console.log('Auth code response: ' + xhr.responseText);
      // };
      // xhr.send('code=' + code);
    },
  });

  client.requestCode()
}

document.getElementsByClassName("sign-in")[0].children[0].addEventListener("click", signIn)