// Princess OS — Search Bar v1
document.addEventListener("submit", (event) => {
  const form = event.target.closest(".search-bar");
  if (!form) return;
  event.preventDefault();

  const input = form.querySelector(".search-input");
  const value = input?.value?.trim();

  if (!value) {
    input?.focus();
    return;
  }

  console.log("[Princess OS Search]", value);
});
