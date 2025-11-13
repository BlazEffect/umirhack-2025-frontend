(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    MapManager.init();

    UIManager.init();

    AgriManage.init();
  });

  const MapManager = {
    map: null,
    source: null,
    draw: null,
    snap: null,

    init: function() {
      this.createMap();
    },

    createMap: function() {
      const satelliteLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: 'https://sat01.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}',
          attributions: '© Яндекс'
        })
      });

      const russianLabelsLayer = new ol.layer.Tile({
        source: new ol.source.XYZ({
          url: 'https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&x={x}&y={y}&z={z}',
          attributions: '© Яндекс'
        }),
        opacity: 0.8
      });

      this.source = new ol.source.Vector();
      this.source = new ol.source.Vector();
      const vector = new ol.layer.Vector({
        source: this.source,
        style: {
          'fill-color': 'rgba(255, 255, 255, 0.2)',
          'stroke-color': '#ffcc33',
          'stroke-width': 2,
          'circle-radius': 7,
          'circle-fill-color': '#ffcc33',
        },
      });

      const extent = ol.proj.get('EPSG:3857').getExtent().slice();
      extent[0] += extent[0];
      extent[2] += extent[2];

      this.map = new ol.Map({
        layers: [satelliteLayer, russianLabelsLayer, vector],
        target: 'map',
        view: new ol.View({
          center: ol.proj.fromLonLat([37.6173, 55.7558]),
          zoom: 10,
          extent,
        }),
      });
    },

    locateUser: function() {
      if (!navigator.geolocation) {
        AgriManage.showNotification('Геолокация не поддерживается вашим браузером', 'warning');
        return;
      }

      UIManager.showLocationLoading();

      navigator.geolocation.getCurrentPosition(
        function(position) {
          UIManager.hideLocationLoading();

          const coords = ol.proj.fromLonLat([
            position.coords.longitude,
            position.coords.latitude
          ]);

          MapManager.map.getView().animate({
            center: coords,
            zoom: 15,
            duration: 1000
          });

          MapManager.addLocationMarker(coords, position.coords.accuracy);
          AgriManage.showNotification(`Местоположение определено! Точность: ${Math.round(position.coords.accuracy)} метров`);
        },
        function(error) {
          UIManager.hideLocationLoading();
          MapManager.handleGeolocationError(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    },

    addLocationMarker: function(coords, accuracy) {
      const existingFeatures = this.source.getFeatures().filter(feature =>
        feature.get('type') === 'location'
      );
      existingFeatures.forEach(feature => this.source.removeFeature(feature));

      const accuracyCircle = new ol.Feature({
        geometry: new ol.geom.Circle(coords, accuracy),
        type: 'location'
      });

      accuracyCircle.setStyle(new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(66, 133, 244, 0.2)'
        }),
        stroke: new ol.style.Stroke({
          color: 'rgba(66, 133, 244, 0.5)',
          width: 1
        })
      }));

      this.source.addFeature(accuracyCircle);

      const locationMarker = new ol.Feature({
        geometry: new ol.geom.Point(coords),
        type: 'location'
      });

      locationMarker.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,
          fill: new ol.style.Fill({
            color: '#4285F4'
          }),
          stroke: new ol.style.Stroke({
            color: 'white',
            width: 2
          })
        })
      }));

      this.source.addFeature(locationMarker);
    },

    handleGeolocationError: function(error) {
      let errorMessage = 'Не удалось определить местоположение. ';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += 'Доступ к геолокации запрещен.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += 'Информация о местоположении недоступна.';
          break;
        case error.TIMEOUT:
          errorMessage += 'Время ожидания определения местоположения истекло.';
          break;
        default:
          errorMessage += 'Произошла неизвестная ошибка.';
          break;
      }
      AgriManage.showNotification(errorMessage, 'warning');
    }
  };

  const UIManager = {
    init: function() {
      this.createLocationButton();
      this.setupMobileMenu();
      this.setupDropdowns();
      this.setupNavigation();
      this.setupSearch();
      this.setupSeasonSelector();
      this.setupModals();
      this.setupKeyboardShortcuts();
      this.handleResize();
    },

    createLocationButton: function() {
      const locationButton = document.createElement('button');
      locationButton.innerHTML = '📍';
      locationButton.title = 'Определить мое местоположение';
      locationButton.style.position = 'absolute';
      locationButton.style.top = '10px';
      locationButton.style.right = '10px';
      locationButton.style.zIndex = '10';
      locationButton.style.padding = '10px';
      locationButton.style.backgroundColor = 'white';
      locationButton.style.border = '1px solid #ccc';
      locationButton.style.borderRadius = '5px';
      locationButton.style.cursor = 'pointer';
      locationButton.style.fontSize = '16px';

      locationButton.addEventListener('click', MapManager.locateUser.bind(MapManager));
      document.getElementById('map').appendChild(locationButton);
    },

    showLocationLoading: function() {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.innerHTML = 'Определение местоположения...';
      loadingIndicator.style.position = 'absolute';
      loadingIndicator.style.top = '50px';
      loadingIndicator.style.right = '10px';
      loadingIndicator.style.zIndex = '1000';
      loadingIndicator.style.padding = '10px';
      loadingIndicator.style.backgroundColor = 'white';
      loadingIndicator.style.border = '1px solid #ccc';
      loadingIndicator.style.borderRadius = '5px';
      loadingIndicator.id = 'location-loading';
      document.getElementById('map').appendChild(loadingIndicator);
    },

    hideLocationLoading: function() {
      const loadingElement = document.getElementById('location-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
    },

    setupMobileMenu: function() {
      const navbarBurger = document.querySelector('.navbar-burger');
      const navbarMenu = document.querySelector('#mainNavbar');
      const sidebarContainer = document.querySelector('#sidebarContainer');

      if (navbarBurger) {
        navbarBurger.addEventListener('click', () => {
          navbarBurger.classList.toggle('is-active');
          navbarMenu.classList.toggle('is-active');
          sidebarContainer.classList.toggle('is-active');
          document.body.classList.toggle('is-clipped', navbarMenu.classList.contains('is-active'));
        });
      }

      const mapContainer = document.querySelector('#mapContainer');
      if (mapContainer) {
        mapContainer.addEventListener('click', function() {
          if (window.innerWidth <= 1023 && sidebarContainer.classList.contains('is-active')) {
            navbarBurger.click();
          }
        });
      }
    },

    setupDropdowns: function() {
      const dropdowns = document.querySelectorAll('.dropdown');
      dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', () => {
          dropdown.classList.toggle('is-active');
        });
      });
    },

    setupNavigation: function() {
      const navItems = document.querySelectorAll('.sidebar-menu .menu-list a');
      navItems.forEach(item => {
        item.addEventListener('click', function(e) {
          if (this.classList.contains('logout-item')) return;
          if (this.classList.contains('is-active')) {
            e.preventDefault();
            return;
          }

          navItems.forEach(navItem => navItem.classList.remove('is-active'));
          this.classList.add('is-active');

          const pageName = this.querySelector('span:last-child').textContent;
          console.log(`Navigated to: ${pageName}`);

          if (window.innerWidth <= 1023) {
            document.querySelector('.navbar-burger').click();
          }
        });
      });
    },

    setupSearch: function() {
      const fieldSearchInput = document.querySelector('.fields-panel input[type="text"]');
      const navSearchInput = document.querySelector('.navbar input[type="text"]');

      const debouncedFilter = AgriManage.debounce(function(searchTerm) {
        UIManager.filterFields(searchTerm);
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
    },

    filterFields: function(searchTerm) {
      const fieldItems = document.querySelectorAll('.field-item');
      const searchLower = searchTerm.toLowerCase();

      if (searchTerm.length === 0) {
        UIManager.showAllFields();
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

      UIManager.showNoResultsMessage(hasResults);
    },

    showAllFields: function() {
      const fieldItems = document.querySelectorAll('.field-item');
      const noResults = document.querySelector('.no-results');
      if (noResults) noResults.remove();
      fieldItems.forEach(item => item.style.display = 'block');
    },

    showNoResultsMessage: function(hasResults) {
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
    },

    setupSeasonSelector: function() {
      const seasonSelector = document.querySelector('.season-selector');
      if (seasonSelector) {
        seasonSelector.addEventListener('change', function() {
          AgriManage.showNotification(`Данные обновлены для ${this.value}`, 'success');
        });
      }

      const seasonItems = document.querySelectorAll('.dropdown-item:not(.add-season-item)');
      const seasonButton = document.querySelector('.dropdown-trigger .button');

      seasonItems.forEach(item => {
        item.addEventListener('click', function(e) {
          e.preventDefault();
          seasonItems.forEach(season => {
            season.classList.remove('is-active');
            const checkIcon = season.querySelector('.fa-check');
            if (checkIcon) {
              const spanCheckIcon = checkIcon.closest('.icon.is-small');
              spanCheckIcon.remove();
            }
          });

          this.classList.add('is-active');
          const iconContainer = this.querySelector('.icon.is-small');
          if (iconContainer) {
            iconContainer.innerHTML = '<i class="fas fa-check"></i>';
          } else {
            const newIconContainer = document.createElement('span');
            newIconContainer.className = 'icon is-small';
            newIconContainer.innerHTML = '<i class="fas fa-check"></i>';
            this.insertBefore(newIconContainer, this.firstChild);
          }

          const seasonName = this.querySelector('span:last-child').textContent;
          seasonButton.querySelector('span:first-child').textContent = seasonName;
          AgriManage.showNotification(`Сезон изменён на: ${seasonName}`, 'success');
        });
      });
    },

    setupModals: function() {
      const addSeasonItem = document.querySelector('.add-season-item');
      const addSeasonModal = document.querySelector('#add-season-modal');

      if (addSeasonItem && addSeasonModal) {
        addSeasonItem.addEventListener('click', function(e) {
          e.preventDefault();
          UIManager.openSeasonModal();
        });

        UIManager.setupSeasonModalHandlers();
      }
    },

    openSeasonModal: function() {
      const addSeasonModal = document.querySelector('#add-season-modal');
      addSeasonModal.classList.add('is-active');
      document.body.classList.add('is-clipped');

      const today = new Date();
      const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

      document.querySelector('input[name="startDate"]').value = today.toISOString().split('T')[0];
      document.querySelector('input[name="endDate"]').value = nextYear.toISOString().split('T')[0];
      document.querySelector('input[name="seasonYear"]').value = today.getFullYear();
    },

    setupSeasonModalHandlers: function() {
      const addSeasonModal = document.querySelector('#add-season-modal');
      const cancelSeasonBtn = document.querySelector('.cancel-season-btn');
      const modalBackground = document.querySelector('.modal-background');
      const modalDelete = document.querySelector('#add-season-modal .delete');
      const seasonForm = document.getElementById('add-season-form');

      function closeSeasonModal() {
        addSeasonModal.classList.remove('is-active');
        document.body.classList.remove('is-clipped');
        if (seasonForm) seasonForm.reset();
      }

      if (cancelSeasonBtn) cancelSeasonBtn.addEventListener('click', closeSeasonModal);
      if (modalBackground) modalBackground.addEventListener('click', closeSeasonModal);
      if (modalDelete) modalDelete.addEventListener('click', closeSeasonModal);

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && addSeasonModal.classList.contains('is-active')) {
          closeSeasonModal();
        }
      });

      if (seasonForm) {
        seasonForm.addEventListener('submit', function(e) {
          e.preventDefault();
          const formData = new FormData(this);
          const seasonData = {
            name: formData.get('seasonName'),
            year: formData.get('seasonYear'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            description: formData.get('description')
          };

          if (new Date(seasonData.startDate) >= new Date(seasonData.endDate)) {
            AgriManage.showNotification('Дата окончания должна быть позже даты начала', 'warning');
            return;
          }

          console.log('Creating new season:', seasonData);
          AgriManage.showNotification(`Сезон "${seasonData.name}" успешно создан!`, 'success');
          AgriManage.updateSeasonsDropdown(seasonData);
          closeSeasonModal();
        });
      }
    },

    setupKeyboardShortcuts: function() {
      document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          const searchInput = document.querySelector('.navbar input[type="text"]') ||
            document.querySelector('.fields-panel input[type="text"]');
          if (searchInput) searchInput.focus();
        }

        if (e.key === 'Escape') {
          const navbarMenu = document.querySelector('#mainNavbar');
          if (navbarMenu.classList.contains('is-active')) {
            document.querySelector('.navbar-burger').click();
          }
        }
      });
    },

    handleResize: function() {
      function checkResize() {
        const isMobile = window.innerWidth <= 1023;
        if (!isMobile) {
          const sidebarContainer = document.querySelector('#sidebarContainer');
          const navbarMenu = document.querySelector('#mainNavbar');
          const navbarBurger = document.querySelector('.navbar-burger');

          sidebarContainer.classList.remove('is-active');
          navbarMenu.classList.remove('is-active');
          if (navbarBurger) navbarBurger.classList.remove('is-active');
          document.body.classList.remove('is-clipped');
        }
      }

      window.addEventListener('resize', checkResize);
      checkResize();
    }
  };

  const AgriManage = {
    init: function() {
    },

    showNotification: function(message, type = 'success') {
      document.querySelectorAll('.agri-notification').forEach(notif => notif.remove());

      const notification = document.createElement('div');
      notification.className = 'agri-notification notification is-' + type + ' is-light';
      notification.innerHTML = [
        '<div class="notification-content">',
        '    <span class="icon is-small notification-icon">',
        '        <i class="fas ' + this.getNotificationIcon(type) + '"></i>',
        '    </span>',
        '    <div class="notification-text">' + message + '</div>',
        '</div>',
        '<button class="delete"></button>'
      ].join('');

      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);

      notification.querySelector('.delete').addEventListener('click', function() {
        notification.parentNode.removeChild(notification);
      });
    },

    getNotificationIcon: function(type) {
      switch (type) {
        case 'success': return 'fa-check-circle';
        case 'info': return 'fa-info-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
      }
    },

    formatArea: function(area) {
      return `${area} га`;
    },

    debounce: function(func, wait) {
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
    },

    updateSeasonsDropdown: function(newSeason) {
      const dropdownContent = document.querySelector('.dropdown-content');
      const addSeasonItem = document.querySelector('.add-season-item');
      const seasonButton = document.querySelector('.dropdown-trigger .button');

      const existingSeasons = dropdownContent.querySelectorAll('.dropdown-item:not(.add-season-item)');
      existingSeasons.forEach(season => {
        season.classList.remove('is-active');
        const checkIcon = season.querySelector('.fa-check');
        if (checkIcon) {
          const spanCheckIcon = checkIcon.closest('.icon.is-small');
          spanCheckIcon.remove();
        }
      });

      const newSeasonItem = document.createElement('a');
      newSeasonItem.href = '#';
      newSeasonItem.className = 'dropdown-item is-active';
      newSeasonItem.innerHTML = `
                <span class="icon is-small">
                    <i class="fas fa-check"></i>
                </span>
                <span>${newSeason.name}</span>
            `;

      newSeasonItem.addEventListener('click', function(e) {
        e.preventDefault();
        const existingSeasons = dropdownContent.querySelectorAll('.dropdown-item:not(.add-season-item)');
        existingSeasons.forEach(season => {
          season.classList.remove('is-active');
          const checkIcon = season.querySelector('.fa-check');
          if (checkIcon) {
            const spanCheckIcon = checkIcon.closest('.icon.is-small');
            spanCheckIcon.remove();
          }
        });

        this.classList.add('is-active');
        seasonButton.querySelector('span:first-child').textContent = newSeason.name;
      });

      dropdownContent.insertBefore(newSeasonItem, addSeasonItem);
      seasonButton.querySelector('span:first-child').textContent = newSeason.name;
    }
  };
})();