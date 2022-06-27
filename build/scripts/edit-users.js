async function addUser(email){
  fetch("./add-user", {
    method: "POST",
    body: JSON.stringify({
      subteam: "Programming",
      tags: ["student"],
      email: email
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "javascript-fetch"
    }
  }).then(async (res) => {
    if (res.status != 200) {
      let error = new Error(`Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`)
      error.name = "InvalidServerResponse"
      error.response = res
      throw error
    }
  })
}

async function search(query){
  return fetch("./search", {
    method: "POST",
    body: JSON.stringify({
      query: query
    }),
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "javascript-fetch"
    }
  }).then(async (res) => {
    // Switch for error code?
    if (res.status != 200) {
      let error = new Error(`Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`)
      error.name = "InvalidServerResponse"
      error.response = res
      throw error
    }

    return res.json()
  })
}