import { EventManager } from '../../core/EventManager.js';
import { Config } from '../../core/Config.js';

export class ModalManager {
  static init() {
    this.setupModalHandlers();
    this.setupSeasonModal();
    this.setupEventListeners();
  }

  static setupModalHandlers() {
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('modal-background') ||
        event.target.classList.contains('modal-close') ||
        event.target.classList.contains('delete')) {
        this.closeAllModals();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.closeAllModals();
      }
    });
  }

  static setupSeasonModal() {
    const addSeasonModal = document.querySelector('#add-season-modal');
    if (!addSeasonModal) return;

    const cancelSeasonBtn = addSeasonModal.querySelector('.cancel-season-btn');
    const modalBackground = addSeasonModal.querySelector('.modal-background');
    const modalDelete = addSeasonModal.querySelector('.delete');
    const seasonForm = document.getElementById('add-season-form');

    [cancelSeasonBtn, modalBackground, modalDelete].forEach(element => {
      if (element) {
        element.addEventListener('click', () => this.closeModal('add-season-modal'));
      }
    });

    if (seasonForm) {
      seasonForm.addEventListener('submit', this.handleSeasonFormSubmit.bind(this));
    }

    EventManager.on('modal:opening:add-season-modal', () => {
      this.prefillSeasonDates();
    });
  }

  static setupEventListeners() {
    EventManager.on('modal:open', (modalId) => {
      this.openModal(modalId);
    });

    EventManager.on('modal:close', (modalId) => {
      this.closeModal(modalId);
    });
  }

  static openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      EventManager.emit(`modal:opening:${modalId}`);
      modal.classList.add('is-active');
      document.body.classList.add('is-clipped');
      EventManager.emit(`modal:opened:${modalId}`);
    }
  }

  static closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      EventManager.emit(`modal:closing:${modalId}`);
      modal.classList.remove('is-active');
      document.body.classList.remove('is-clipped');
      EventManager.emit(`modal:closed:${modalId}`);

      const form = modal.querySelector('form');
      if (form) form.reset();
    }
  }

  static closeAllModals() {
    document.querySelectorAll('.modal.is-active').forEach(modal => {
      modal.classList.remove('is-active');
    });
    document.body.classList.remove('is-clipped');
  }

  static prefillSeasonDates() {
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

    const startDateInput = document.querySelector('#add-season-modal input[name="startDate"]');
    const endDateInput = document.querySelector('#add-season-modal input[name="endDate"]');

    if (startDateInput) {
      startDateInput.value = today.toISOString().split('T')[0];
    }
    if (endDateInput) {
      endDateInput.value = nextYear.toISOString().split('T')[0];
    }
  }

  static async handleSeasonFormSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const seasonData = {
      name: formData.get('seasonName'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      description: formData.get('description')
    };

    if (new Date(seasonData.startDate) >= new Date(seasonData.endDate)) {
      EventManager.emit('notification:show', {
        message: 'Дата окончания должна быть позже даты начала',
        type: 'warning'
      });
      return;
    }

    try {
      const newSeason = await this.createSeasonInAPI(seasonData);
      EventManager.emit('notification:show', {
        message: `Сезон "${seasonData.name}" успешно создан!`,
        type: 'success'
      });

      EventManager.emit('seasons:needRefresh');

      this.closeModal('add-season-modal');

    } catch (error) {
      console.error('Ошибка при создании сезона:', error);
      EventManager.emit('notification:show', {
        message: 'Ошибка при создании сезона',
        type: 'error'
      });
    }
  }

  static async createSeasonInAPI(seasonData) {
    try {
      const response = await fetch(Config.api.seasons, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seasonData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при создании сезона:', error);
      throw error;
    }
  }
}