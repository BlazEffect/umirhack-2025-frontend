export class SearchManager {
  static init() {
    this.setupSearch();
  }

  static setupSearch() {
    const fieldSearchInput = document.querySelector('.fields-panel input[type="text"]');
    const navSearchInput = document.querySelector('.navbar input[type="text"]');

    const debouncedFilter = this.debounce((searchTerm) => {
      this.filterFields(searchTerm);
    }, 300);

    if (fieldSearchInput) {
      fieldSearchInput.addEventListener('input', function() {
        debouncedFilter(this.value.trim());
      });
    }

    if (navSearchInput) {
      navSearchInput.addEventListener('input', function() {
        debouncedFilter(this.value.trim());
      });
    }
  }

  static filterFields(searchTerm) {
    const fieldItems = document.querySelectorAll('.field-item');
    const searchLower = searchTerm.toLowerCase();

    if (searchTerm.length === 0) {
      this.showAllFields();
      return;
    }

    let hasResults = false;
    fieldItems.forEach(item => {
      const fieldName = item.querySelector('.field-name').textContent.toLowerCase();
      const fieldCrop = item.querySelector('.field-crop').textContent.toLowerCase();

      if (fieldName.includes(searchLower) || fieldCrop.includes(searchLower)) {
        item.style.display = 'block';
        hasResults = true;
      } else {
        item.style.display = 'none';
      }
    });

    this.showNoResultsMessage(hasResults);
  }

  static showAllFields() {
    const fieldItems = document.querySelectorAll('.field-item');
    const noResults = document.querySelector('.no-results');
    if (noResults) noResults.remove();
    fieldItems.forEach(item => item.style.display = 'block');
  }

  static showNoResultsMessage(hasResults) {
    const fieldsList = document.querySelector('.fields-list');
    let noResults = fieldsList.querySelector('.no-results');

    if (!hasResults && !noResults) {
      noResults = document.createElement('div');
      noResults.className = 'no-results has-text-centered py-4';
      noResults.innerHTML = `
        <div class="content">
          <span class="icon is-large has-text-grey-light mb-2">
            <i class="fas fa-search"></i>
          </span>
          <p class="has-text-grey">Поля не найдены</p>
          <small class="has-text-grey-light">Попробуйте изменить поисковый запрос</small>
        </div>
      `;
      fieldsList.appendChild(noResults);
    } else if (hasResults && noResults) {
      noResults.remove();
    }
  }

  static debounce(func, wait) {
    let timeout;
    return function executedFunction() {
      const context = this;
      const args = arguments;
      const later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  static focusSearch() {
    const searchInput = document.querySelector('.navbar input[type="text"]') ||
      document.querySelector('.fields-panel input[type="text"]');
    if (searchInput) searchInput.focus();
  }
}