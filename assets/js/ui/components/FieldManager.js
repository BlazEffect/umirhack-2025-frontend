import {EventManager} from '../../core/EventManager.js';
import {Config} from '../../core/Config.js';

export class FieldManager {
  static fieldForms = new Map();
  static nextFieldIndex = 1;

  static async init() {
    let fieldsData = await this.loadFieldsFromAPI();

    if (fieldsData) {
      this.renderFieldsList(fieldsData);
    }

    this.setupFieldSelection();
    this.setupEventListeners();

    this.setupFormHandlers();

    EventManager.emit('map:renderFields', fieldsData);
  }

  static setupEventListeners() {
    EventManager.on('fields:cropsUpdate', (cropsData) => {
      this.updateFieldsCrops(cropsData);
    });

    EventManager.on('fields:newFieldForm', (feature) => {
      this.createNewFieldForm(feature);
    });

    EventManager.on('fields:removeFieldForm', (feature) => {
      this.removeFieldForm(feature);
    });

    EventManager.on('field:select', (fieldId) => {
      this.selectField(fieldId);
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

  static removeFieldForm(feature) {
    const fieldIndex = this.fieldForms.get(feature);
    if (fieldIndex !== undefined) {
      const formElement = document.querySelector(`[data-field-index="${fieldIndex}"]`);
      if (formElement) {
        formElement.remove();
      }
      this.fieldForms.delete(feature);
    }
  };

  static setupFormHandlers(specificIndex = null) {
    const selectors = specificIndex
      ? [`[data-field-index="${specificIndex}"]`]
      : ['[data-field-index]'];

    selectors.forEach(selector => {
      const formElements = document.querySelectorAll(selector);

      formElements.forEach(formElement => {
        const form = formElement.querySelector('.add-field-form');
        const fieldIndex = formElement.getAttribute('data-field-index');

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.handleFormSubmit(form, fieldIndex);
        });
      });
    });
  };

  static handleFormSubmit(form, fieldIndex) {
    const formData = new FormData(form);
    const fieldName = formData.get('fieldName');
    const description = formData.get('description');

    let correspondingFeature = null;
    for (let [feature, index] of this.fieldForms) {
      if (index == fieldIndex) {
        correspondingFeature = feature;
        break;
      }
    }

    if (correspondingFeature) {
      correspondingFeature.set('fieldName', fieldName);
      correspondingFeature.set('description', description);
      correspondingFeature.set('submitted', true);

      EventManager.emit('field:added', {
        feature: correspondingFeature,
        fieldName,
        description,
        area: EventManager.emit('map:calculateArea', correspondingFeature.getGeometry()),
      });

      EventManager.emit('notification:show', {
        message: `Поле "${fieldName}" успешно добавлено!`,
        type: 'success'
      });

      form.closest('.field-form').classList.add('is-submitted');
    }
  };

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

  static createNewFieldForm(feature) {
    const fieldIndex = this.nextFieldIndex++;

    const formsContainer = document.querySelector('.field-forms-container');

    const newFormHTML = `
      <div class="panel-block field-form" data-field-index="${fieldIndex}">
        <div class="field">
          Площадь:
          <span class="field-size">0 га</span>
        </div>

        <form class="add-field-form">
          <div class="field">
            <label class="label">Название поля</label>
            <div class="control">
              <input class="input" type="text" placeholder="Название поля" name="fieldName" required>
            </div>
          </div>

          <div class="field">
            <label class="label">Описание (необязательно)</label>
            <div class="control">
              <textarea class="textarea" placeholder="Дополнительная информация о поле..."
                        name="description" rows="2"></textarea>
            </div>
          </div>
        </form>
      </div>
    `;

    formsContainer.insertAdjacentHTML('beforeend', newFormHTML);

    if (feature) {
      this.fieldForms.set(feature, fieldIndex);
      feature.set('fieldIndex', fieldIndex);
    }

    this.setupFormHandlers(fieldIndex);
  };

  static setupFieldSelection() {
    const fieldItems = document.querySelectorAll('.field-item');
    const addFieldBtn = document.querySelector('.add-field-btn');
    const backBtn = document.querySelector('.back-btn');

    const fieldsListPanel = document.querySelector('.fields-panel');
    const addFieldPanel = document.querySelector('.field-forms-container').closest('.fields-panel');

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

        FieldManager.fieldForms = new Map();
        FieldManager.nextFieldIndex = 1;
        const formsContainer = document.querySelector('.field-forms-container');
        formsContainer.innerHTML = '';

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
          "crop": "Пшеница озимая",
          "coordinates": [
            [4151670.0856221057, 7513470.317794253],
            [4147492.222254961, 7494824.604505069],
            [4163490.423390341, 7499205.840791718],
            [4151670.0856221057, 7513470.317794253]
          ]
        },
        {
          "id": 2,
          "name": "Поле №2",
          "area": 32.7,
          "crop": "Кукуруза",
          "coordinates": [
            [4200785.607414969, 7543425.726029336],
            [4184889.2994700456, 7495639.714544913],
            [4216783.808550349,7496047.274228949],
            [4233291.512954693,7513164.650363283],
            [4200785.607414969, 7543425.726029336]
          ]
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

  static selectField(fieldId) {
    const fieldItem = document.querySelector('.field-item[data-field-id="' + fieldId + '"]');

    if (fieldItem) {
      fieldItem.click();
    }
  }
}