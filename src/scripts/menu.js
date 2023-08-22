import { $ } from "./not-jquery.js";

$(".menu-bars").on("click", (e, el) => {
  $(".menu-bars").classList.toggle("open");
  $(".sidebar").classList.toggle("open");
});

$(".sidebar").on("mouseenter", () => $(".sidebar-shadow").classList.add("open"));
$(".sidebar").on("mouseleave", () => $(".sidebar-shadow").classList.remove("open"));