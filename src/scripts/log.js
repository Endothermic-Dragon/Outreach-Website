var formInputs = document.getElementsByClassName("outreach-hours")
var submitButton = document.getElementsByClassName("submit-hours")[0]

submitButton.addEventListener("click", () => {
  let outreachMins = (parseInt(formInputs[0].value) || 0) * 60 + (parseInt(formInputs[1].value) || 0)
  if (outreachMins > 600 || outreachMins <= 0){
    formInputs[0].setCustomValidity("Please enter a value between 0 to 10 hours.")
  }
});

[...formInputs].forEach(el => {
  el.addEventListener("input", () => {
    formInputs[0].setCustomValidity("")
  })
});