// fetch("./delete-event", {
//   method: "POST",
//   body: JSON.stringify({
//     unique_id: "1b8eb08a-8cf0-4ea0-886c-12ce72010d0a"
//   }),
//   headers: {
//     "Content-Type": "application/json",
//     "X-Requested-With": "javascript-fetch",
//   },
// }).then(async (res) => {
//   // Switch for error code?
//   if (res.status != 200) {
//     let error = new Error(
//       `Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`
//     );
//     error.name = "InvalidServerResponse";
//     error.response = res;
//     throw error;
//   }

//   console.log(res.json());
// });

// fetch("./delete-event", {
//   method: "POST",
//   body: JSON.stringify({
//     unique_id: "1b8eb08a-8cf0-4ea0-886c-12ce72010d0a"
//   }),
//   headers: {
//     "Content-Type": "application/json",
//     "X-Requested-With": "javascript-fetch",
//   },
// }).then(async (res) => {
//   // Switch for error code?
//   if (res.status != 200) {
//     let error = new Error(
//       `Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`
//     );
//     error.name = "InvalidServerResponse";
//     error.response = res;
//     throw error;
//   }

//   console.log(res.json());
// });

// fetch("./order-events", {
//   method: "POST",
//   body: JSON.stringify([
//     {
//       unique_id: "1b8eb08a-8cf0-4ea0-886c-12ce72010d0a",
//       old: 1,
//       new: 2
//     },
//     {
//       unique_id: "d65899ef-7e04-4e84-9e60-23cf0e170923",
//       old: 2,
//       new: 1
//     }
//   ]),
//   headers: {
//     "Content-Type": "application/json",
//     "X-Requested-With": "javascript-fetch",
//   },
// }).then(async (res) => {
//   // Switch for error code?
//   if (res.status != 200) {
//     let error = new Error(
//       `Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`
//     );
//     error.name = "InvalidServerResponse";
//     error.response = res;
//     throw error;
//   }

//   console.log(res.json());
// });

// fetch("./edit-event", {
//   method: "POST",
//   body: JSON.stringify({
//     unique_id: "1b8eb08a-8cf0-4ea0-886c-12ce72010d0a",
//     name: "Oops I did it again."
//   }),
//   headers: {
//     "Content-Type": "application/json",
//     "X-Requested-With": "javascript-fetch",
//   },
// }).then(async (res) => {
//   // Switch for error code?
//   if (res.status != 200) {
//     let error = new Error(
//       `Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`
//     );
//     error.name = "InvalidServerResponse";
//     error.response = res;
//     throw error;
//   }

//   console.log(res.json());
// });

fetch("./add-event", {
  method: "POST",
  body: JSON.stringify({
    name: "Test Event",
    description: "Test description. Lorem ipsum."
  }),
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "javascript-fetch",
  },
}).then(async (res) => {
  // Switch for error code?
  if (res.status != 200) {
    let error = new Error(
      `Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`
    );
    error.name = "InvalidServerResponse";
    error.response = res;
    throw error;
  }

  console.log(res.json());
});


// fetch("./add-user", {
//   method: "POST",
//   body: JSON.stringify({
//     subteam: "Programming",
//     tags: ["student", "manager", "admin", "super-admin"],
//     email: "rajeshad@htps.us"
//   }),
//   headers: {
//     "Content-Type": "application/json",
//     "X-Requested-With": "javascript-fetch",
//   },
// }).then(async (res) => {
//   // Switch for error code?
//   if (res.status != 200) {
//     let error = new Error(
//       `Server returned error code ${res.status} with message ${await res.text()}.\nTo view the complete response, view the "response" attribute of this error.`
//     );
//     error.name = "InvalidServerResponse";
//     error.response = res;
//     throw error;
//   }

//   console.log(res.json());
// });