export class DropdownManager {
  static init() {
    this.setupDropdowns();
  }

  static setupDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('is-active');
      });
    });

    document.addEventListener('click', () => {
      dropdowns.forEach(dropdown => {
        dropdown.classList.remove('is-active');
      });
    });
  }
}