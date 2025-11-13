import { EventManager } from '../../core/EventManager.js';
import { Config } from '../../core/Config.js';

export class SeasonManager {
  static config = {
    enableCropsUpdate: true,
  };

  static init(userConfig = {}) {
    this.config = { ...this.config, ...userConfig };

    this.setupEventListeners();
    this.initializeSeasons();
  }

  static setupEventListeners() {
    EventManager.on('season:changed', (seasonId) => {
      this.onSeasonChange(seasonId);
    });

    EventManager.on('seasons:needRefresh', () => {
      this.initializeSeasons();
    });

    EventManager.on('seasons:dropdownUpdated', () => {
      this.bindSeasonEvents();
    });
  }

  static bindSeasonEvents() {
    const dropdownContent = document.querySelector('.dropdown-content');
    if (!dropdownContent) {
      return;
    }

    const seasonItems = dropdownContent.querySelectorAll('.dropdown-item[data-season-id]');
    seasonItems.forEach(item => {
      item.addEventListener('click', this.handleSeasonClick.bind(this));
    });

    const addButton = dropdownContent.querySelector('.add-season-item');
    if (addButton) {
      addButton.addEventListener('click', this.handleAddSeasonClick.bind(this));
    }
  }

  static handleSeasonClick(event) {
    event.preventDefault();

    const seasonItem = event.target.closest('.dropdown-item');
    const seasonId = seasonItem.dataset.seasonId;
    const seasonName = seasonItem.querySelector('span:last-child').textContent;

    if (seasonId) {
      this.setActiveSeason(seasonId, seasonName);
    }
  }

  static handleAddSeasonClick(event) {
    event.preventDefault();
    EventManager.emit('modal:open', 'add-season-modal');
  }

  static async initializeSeasons() {
    let seasons = await this.loadSeasonsFromAPI();

    if (!seasons || seasons.length === 0) {
      seasons = [
        { id: '2024', name: 'Сезон 2024' },
        { id: '2023', name: 'Сезон 2023' },
        { id: '2022', name: 'Сезон 2022' }
      ];
    }

    this.updateSeasonsDropdown(seasons);

    if (!this.getActiveSeasonFromStorage() && seasons.length > 0) {
      this.setActiveSeason(seasons[0].id, seasons[0].name, false);
    }

    if (this.config.enableCropsUpdate) {
      EventManager.emit('season:changed', this.getActiveSeasonFromStorage());
    }
    EventManager.emit('seasons:dropdownUpdated');
  }

  static setActiveSeason(seasonId, seasonName, showNotification = true) {
    this.saveActiveSeasonToStorage(seasonId);

    if (showNotification) {
      EventManager.emit('notification:show', {
        message: `Сезон изменён на: ${seasonName}`,
        type: 'success'
      });
    }

    this.updateSeasonsDropdown();

    if (this.config.enableCropsUpdate) {
      EventManager.emit('season:changed', seasonId);
    }
  }

  static onSeasonChange(seasonId) {
    this.loadCropsForSeason(seasonId).then(cropsData => {
      if (cropsData) {
        EventManager.emit('fields:cropsUpdate', cropsData);
      }
    });
  }

  static updateSeasonsDropdown(seasons = null) {
    const dropdownContent = document.querySelector('.dropdown-content');
    const addSeasonItem = document.querySelector('.add-season-item');

    if (!dropdownContent) return;

    if (!seasons) {
      seasons = Array.from(document.querySelectorAll('.dropdown-item[data-season-id]'))
        .map(item => ({
          id: item.dataset.seasonId,
          name: item.querySelector('span:last-child').textContent
        }));
    }

    const activeSeasonId = this.getActiveSeasonFromStorage();

    dropdownContent.innerHTML = '';

    seasons.forEach(season => {
      const seasonElement = document.createElement('a');
      seasonElement.href = '#';
      seasonElement.className = `dropdown-item ${season.id === activeSeasonId ? 'is-active' : ''}`;
      seasonElement.dataset.seasonId = season.id;

      if (season.id === activeSeasonId) {
        seasonElement.innerHTML = `
          <span class="icon is-small">
            <i class="fas fa-check"></i>
          </span>
          <span>${season.name}</span>
        `;
      } else {
        seasonElement.innerHTML = `<span>${season.name}</span>`;
      }

      dropdownContent.appendChild(seasonElement);

      seasonElement.addEventListener('click', this.handleSeasonClick.bind(this));
    });

    const divider = document.createElement('hr');
    divider.className = 'dropdown-divider';
    dropdownContent.appendChild(divider);

    if (addSeasonItem) {
      dropdownContent.appendChild(addSeasonItem);
    } else {
      const newAddSeasonItem = document.createElement('a');
      newAddSeasonItem.href = '#';
      newAddSeasonItem.className = 'dropdown-item add-season-item';
      newAddSeasonItem.dataset.target = 'add-season-modal';
      newAddSeasonItem.innerHTML = `
        <span class="icon is-small">
          <i class="fas fa-plus"></i>
        </span>
        <span>Создать новый сезон</span>
      `;
      dropdownContent.appendChild(newAddSeasonItem);
    }

    const activeSeason = seasons.find(season => season.id === activeSeasonId);
    const seasonButton = document.querySelector('.dropdown-trigger .button span:first-child');
    if (seasonButton && activeSeason) {
      seasonButton.textContent = activeSeason.name;
    } else if (seasonButton && seasons.length > 0) {
      seasonButton.textContent = seasons[0].name;
    }
  }

  static getActiveSeasonFromStorage() {
    try {
      return localStorage.getItem(Config.storage.activeSeasonKey);
    } catch (error) {
      console.error('Ошибка при чтении активного сезона из localStorage:', error);
      return null;
    }
  }

  static saveActiveSeasonToStorage(seasonId) {
    try {
      localStorage.setItem(Config.storage.activeSeasonKey, seasonId);
    } catch (error) {
      console.error('Ошибка при сохранении активного сезона в localStorage:', error);
    }
  }

  static async loadSeasonsFromAPI() {
    try {
      const response = await fetch(Config.api.seasons, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при загрузке сезонов из API:', error);
      EventManager.emit('notification:show', {
        message: 'Ошибка при загрузке сезонов',
        type: 'error'
      });
      return null;
    }
  }

  static async loadCropsForSeason(seasonId) {
    try {
      const response = await fetch(Config.api.crops.replace('{seasonId}', seasonId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при загрузке культур для сезона:', error);
      return null;
    }
  }
}