const button = document.getElementById("testButton");
const status = document.getElementById("status");

button.addEventListener("click", () => {
  status.textContent = "Appen virker. Neste steg er filopplasting.";
});
