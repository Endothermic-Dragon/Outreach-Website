function signIn(){
  const client = google.accounts.oauth2.initTokenClient({
    client_id: '672955273389-bc25j23ds73qgp7ukroaloutv2a22qjv.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    callback: (tokenResponse) => {
      console.log(tokenResponse)
      
      fetch('https://people.googleapis.com/v1/people/me?personFields=names,photos,emailAddresses', {
        "method": "GET",
        "headers": {
          "Authorization": "Bearer " + tokenResponse.access_token
        }
      })
      .then(response => response.json())
      .then(data => console.log(data))
    },
  });

  client.requestAccessToken();
}

//window.signIn = signIn