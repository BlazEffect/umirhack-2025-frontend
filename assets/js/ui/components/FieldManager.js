import {EventManager} from '../../core/EventManager.js';
import {Config} from '../../core/Config.js';

export class FieldManager {
  static async init() {
    let fieldsData = await this.loadFieldsFromAPI();

    if (fieldsData) {
      this.renderFieldsList(fieldsData);
    }

    this.setupFieldSelection();
    this.setupEventListeners();
  }

  static setupEventListeners() {
    EventManager.on('fields:cropsUpdate', (cropsData) => {
      this.updateFieldsCrops(cropsData);
    });
  }

  static renderFieldsList(fieldsData) {
    const fieldsList = document.querySelector('.fields-list');
    if (!fieldsList) return;

    fieldsList.innerHTML = '';

    fieldsData.forEach((field, index) => {
      const fieldElement = this.createFieldElement(field, index === 0);
      fieldsList.appendChild(fieldElement);
    });

    this.setupFieldSelection();
  }

  static createFieldElement(field, isActive = false) {
    const fieldElement = document.createElement('a');
    fieldElement.className = `panel-block field-item ${isActive ? 'is-active' : ''}`;
    fieldElement.dataset.fieldId = field.id;

    const cropIcon = this.getCropIcon(field.crop);

    fieldElement.innerHTML = `
      <div class="is-flex is-justify-content-space-between is-flex-grow-1 is-align-items-center">
        <div>
          <span class="field-name has-text-weight-semibold">${field.name}</span>
          <br>
          <small class="field-crop">
            ${cropIcon ? `
            <span class="icon is-small mr-1">
              <i class="${cropIcon}"></i>
            </span>
            ` : ''}
            ${field.crop}
          </small>
        </div>
        <span class="tag is-light is-success field-size">${field.area} га</span>
      </div>
    `;

    return fieldElement;
  }

  static getCropIcon(cropName) {
    const cropIcons = {
      'Пшеница озимая': 'fas fa-wheat',
      'Пшеница': 'fas fa-wheat',
      'Кукуруза': 'fas fa-corn',
      'Подсолнечник': 'fas fa-sun',
      'Ячмень': 'fas fa-seedling',
      'Рапс': 'fas fa-leaf',
      'Соя': 'fas fa-seedling',
      'Сояс': 'fas fa-seedling',
      'Рожь': 'fas fa-wheat',
      'Овес': 'fas fa-seedling',
      'Гречиха': 'fas fa-seedling',
      'Лен': 'fas fa-seedling',
      'Картофель': 'fas fa-potato',
      'Морковь': 'fas fa-carrot',
      'Свекла': 'fas fa-seedling'
    };

    for (const [crop, icon] of Object.entries(cropIcons)) {
      if (cropName.toLowerCase().includes(crop.toLowerCase()) ||
        crop.toLowerCase().includes(cropName.toLowerCase())) {
        return icon;
      }
    }

    return 'fas fa-seedling';
  }

  static setupFieldSelection() {
    const fieldItems = document.querySelectorAll('.field-item');
    const addFieldBtn = document.querySelector('.add-field-btn');
    const backBtn = document.querySelector('.back-btn');

    const fieldsListPanel = document.querySelector('.fields-panel');
    const addFieldPanel = document.querySelector('.field-form').closest('.fields-panel');

    fieldItems.forEach(item => {
      item.addEventListener('click', function (e) {
        e.preventDefault();
        fieldItems.forEach(field => field.classList.remove('is-active'));
        this.classList.add('is-active');

        const fieldName = this.querySelector('.field-name').textContent;
        const fieldId = this.dataset.fieldId;
      });
    });

    if (addFieldBtn) {
      addFieldBtn.addEventListener('click', function (e) {
        e.preventDefault();

        fieldsListPanel.classList.add('is-hidden');
        addFieldPanel.classList.remove('is-hidden');

        EventManager.emit('map:enableDrawing');
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', function() {
        addFieldPanel.classList.add('is-hidden');
        fieldsListPanel.classList.remove('is-hidden');

        EventManager.emit('map:disableDrawing');
      });
    }
  }

  static async loadFieldsFromAPI() {
    try {
      const response = await fetch(Config.api.fields, {
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
      console.error('Ошибка при загрузке полей из API:', error);

      return [
        {
          "id": 1,
          "name": "Поле №1",
          "area": 45.2,
          "crop": "Пшеница озимая"
        },
        {
          "id": 2,
          "name": "Поле №2",
          "area": 32.7,
          "crop": "Кукуруза"
        },
        {
          "id": 3,
          "name": "Поле №3",
          "area": 28.5,
          "crop": "Подсолнечник"
        },
        {
          "id": 4,
          "name": "Поле \"Северное\"",
          "area": 56.3,
          "crop": "Ячмень"
        },
        {
          "id": 5,
          "name": "Поле \"Южное\"",
          "area": 41.8,
          "crop": "Рапс"
        },
        {
          "id": 6,
          "name": "Поле \"Западное\"",
          "area": 37.4,
          "crop": "Соя"
        }
      ];
    }
  }

  static updateFieldsCrops(cropsData) {
    const fieldItems = document.querySelectorAll('.field-item');

    fieldItems.forEach((fieldItem) => {
      const cropElement = fieldItem.querySelector('.field-crop');
      const fieldId = fieldItem.dataset.fieldId;
      const cropData = cropsData[fieldId] || cropsData.find(crop => crop.fieldId == fieldId);

      if (cropElement && cropData) {
        const cropName = typeof cropData === 'string' ? cropData : cropData.crop;
        const cropIcon = this.getCropIcon(cropName);

        cropElement.innerHTML = `
          ${cropIcon ? `
          <span class="icon is-small mr-1">
            <i class="${cropIcon}"></i>
          </span>
          ` : ''}
          ${cropName}
        `;
      }
    });
  }
}