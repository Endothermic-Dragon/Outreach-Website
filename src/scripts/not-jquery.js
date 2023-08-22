const $ = (tag) => {
  let res = [...document.querySelectorAll(tag)];
  res.forEach(
    (el) => (el.on = (e, func) => el.addEventListener(e, (e) => func(e, el)))
  );
  res.length == 1
  ? (res = res[0], res.length = 1)
  : (res.onAll = (e, func) => res.map((el) => el.on(e, func)),
    res.on = () => {throw new TypeError(
      'Cannot add event listener on multiple elements using "on". ' +
      'Use "onAll" to add to multiple elements, or select one element.'
    )})
  return res;
};

module.exports = {"$": $, "abcd": () => {return "abcdef"}}