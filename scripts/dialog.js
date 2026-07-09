// Princess OS — Dialog v1
document.addEventListener("click", (event) => {
  const closeButton = event.target.closest(".dialog-close");
  if (!closeButton) return;

  const dialog = closeButton.closest(".dialog");
  if (!dialog) return;

  dialog.animate(
    [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 0, transform: "translateY(10px) scale(.96)" }
    ],
    {
      duration: 180,
      easing: "cubic-bezier(.22,1,.36,1)",
      fill: "forwards"
    }
  );
});
