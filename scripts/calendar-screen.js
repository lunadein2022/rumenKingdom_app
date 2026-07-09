
document.querySelectorAll('.calendar-day').forEach(day => {
  day.addEventListener('click', () => {
    document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
    day.classList.add('selected');
  });
});
