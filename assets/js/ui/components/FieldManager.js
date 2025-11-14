import {EventManager} from '../../core/EventManager.js';
import {Config} from '../../core/Config.js';

export class FieldManager {
  static fieldForms = new Map();
  static nextFieldIndex = 1;
  static currentFields = [];
  static temporaryFeatures = [];

  static async init() {
    let fieldsData = await this.loadFieldsFromAPI();

    if (fieldsData) {
      this.currentFields = fieldsData;
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

    EventManager.on('field:areaUpdated', (data) => {
      this.updateFieldArea(data.fieldIndex, data.area);
    });

    EventManager.on('fields:saveFields', async (fieldsData) => {
      await this.saveFieldsToAPI(fieldsData);
    });

    EventManager.on('field:delete', async (fieldId) => {
      await this.deleteFieldFromAPI(fieldId);
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
    fieldElement.href = '#';
    fieldElement.dataset.fieldId = field.id;

    const cropIcon = this.getCropIcon(field.crop);

    fieldElement.innerHTML = `
      <div class="is-flex is-justify-content-space-between is-align-items-center">
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
        <div class="is-flex is-align-items-end is-flex-direction-column gap-4">
          <button class="delete field-delete" data-field-id="${field.id}"></button>
          <br>
          <span class="tag is-light is-success field-size">${field.area} га</span>
        </div>
      </div>
    `;

    const deleteBtn = fieldElement.querySelector('.field-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteField(field.id);
    });

    fieldElement.addEventListener('click', (e) => {
      e.preventDefault();
      this.focusOnField(field);
    });

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

      const index = this.temporaryFeatures.indexOf(feature);
      if (index > -1) {
        this.temporaryFeatures.splice(index, 1);
      }
    }
  };

  static setupFormHandlers() {
    const saveButton = document.querySelector('.fields-button');
    if (saveButton) {
      saveButton.addEventListener('click', async (e) => {
        e.preventDefault();
        await this.saveAllTemporaryFields();
      });
    }

    document.addEventListener('input', (e) => {
      if (e.target.closest('.add-field-form')) {
        const form = e.target.closest('.add-field-form');
        const formElement = form.closest('[data-field-index]');
        const fieldIndex = formElement.getAttribute('data-field-index');
        this.updateFeatureFromForm(fieldIndex, form);
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.delete-form-btn')) {
        const button = e.target.closest('.delete-form-btn');
        const fieldIndex = button.getAttribute('data-field-index');
        this.deleteSingleForm(fieldIndex);
      }
    });
  };

  static updateFeatureFromForm(fieldIndex, form) {
    let correspondingFeature = null;
    for (let [feature, index] of this.fieldForms) {
      if (index == fieldIndex) {
        correspondingFeature = feature;
        break;
      }
    }

    if (correspondingFeature) {
      const formData = new FormData(form);
      correspondingFeature.set('fieldName', formData.get('fieldName') || '');
      correspondingFeature.set('description', formData.get('description') || '');
      correspondingFeature.set('crop', formData.get('crop') || '');
    }
  }

  static async saveAllTemporaryFields() {
    if (this.temporaryFeatures.length === 0) {
      EventManager.emit('notification:show', {
        message: 'Нет полей для сохранения',
        type: 'warning'
      });
      return;
    }

    const fieldsData = [];
    const errors = [];

    for (const feature of this.temporaryFeatures) {
      const fieldName = feature.get('fieldName');
      const crop = feature.get('crop');
      const description = feature.get('description');

      if (!fieldName || !crop) {
        errors.push(`Поле не заполнено: название или культура`);
        continue;
      }

      try {
        const coordinates = feature.getGeometry().getCoordinates()[0];
        const area = this.getFeatureArea(feature);

        fieldsData.push({
          name: fieldName,
          description: description,
          crop: crop,
          area: area,
          coordinates: coordinates,
        });
      } catch (error) {
        errors.push(`Ошибка обработки поля: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      EventManager.emit('notification:show', {
        message: `Ошибки в данных: ${errors.join(', ')}`,
        type: 'error'
      });
      return;
    }

    if (fieldsData.length === 0) {
      EventManager.emit('notification:show', {
        message: 'Нет корректных данных для сохранения',
        type: 'warning'
      });
      return;
    }

    try {
      const savedFields = await this.saveFieldsToAPI(fieldsData);

      if (savedFields) {
        EventManager.emit('fields:saved', {
          features: this.temporaryFeatures,
          fieldsData: savedFields
        });

        this.temporaryFeatures = [];
        this.fieldForms.clear();

        EventManager.emit('notification:show', {
          message: `Успешно сохранено ${fieldsData.length} полей!`,
          type: 'success'
        });

        this.showFieldsList();

        await this.reloadFieldsList();
      }
    } catch (error) {
      console.error('Ошибка при сохранении полей:', error);
      EventManager.emit('notification:show', {
        message: 'Ошибка при сохранении полей. Попробуйте еще раз.',
        type: 'error'
      });
    }
  }

  static discardAllTemporaryFields() {
    if (this.temporaryFeatures.length > 0) {
      if (confirm('Удалить все несохраненные поля?')) {
        this.temporaryFeatures = [];
        this.fieldForms.clear();

        const formsContainer = document.querySelector('.field-forms-container');
        if (formsContainer) {
          formsContainer.innerHTML = '';
        }

        this.showFieldsList();

        EventManager.emit('notification:show', {
          message: 'Все несохраненные поля удалены',
          type: 'info'
        });
      }
    } else {
      this.showFieldsList();
    }
  }

  static getFeatureArea(feature, callback) {
    if (!feature) {
      if (callback && typeof callback === 'function') {
        callback(0);
      }
      return;
    }

    EventManager.emit('field:requestArea', {
      feature: feature,
      callback: callback
    });
  }

  static updateFieldArea(fieldIndex, area) {
    setTimeout(() => {
      const areaElement = document.querySelector(`[data-field-index="${fieldIndex}"] .field-size`);
      if (areaElement) {
        areaElement.textContent = `${area.toFixed(2)} га`;
      }
    }, 10);
  }

  static async saveFieldsToAPI(fieldsData) {
    try {
      const response = await fetch(Config.api.fields, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_multiple',
          fields: fieldsData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Ошибка при массовом сохранении полей:', error);
      throw error;
    }
  }

  static async deleteFieldFromAPI(fieldId) {
    try {
      const response = await fetch(`${Config.api.fields}/${fieldId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }

      EventManager.emit('notification:show', {
        message: 'Поле успешно удалено',
        type: 'success'
      });

      EventManager.emit('field:deleted', fieldId);
      await this.reloadFieldsList();
      return await response.json();
    } catch (error) {
      console.error('Ошибка при удалении поля:', error);
      EventManager.emit('notification:show', {
        message: 'Ошибка при удалении поля',
        type: 'error'
      });
      throw error;
    }
  }

  static async handleDeleteField(fieldId) {
    if (confirm('Вы уверены, что хотите удалить это поле?')) {
      await this.deleteFieldFromAPI(fieldId);
    }
  }

  static async reloadFieldsList() {
    const fieldsData = await this.loadFieldsFromAPI();
    if (fieldsData) {
      this.currentFields = fieldsData;
      this.renderFieldsList(fieldsData);
      EventManager.emit('map:renderFields', fieldsData);
    }
  }

  static showFieldsList() {
    const fieldsPanels = document.querySelectorAll('.fields-panel');

    fieldsPanels.forEach(panel => {
      if (panel.querySelector('.fields-list')) {
        panel.classList.remove('is-hidden');
      } else {
        panel.classList.add('is-hidden');
      }
    });

    EventManager.emit('map:disableDrawing');
  }

  static showAddFieldPanel() {
    const fieldsPanels = document.querySelectorAll('.fields-panel');

    fieldsPanels.forEach(panel => {
      if (panel.querySelector('.fields-list')) {
        panel.classList.add('is-hidden');
      } else {
        panel.classList.remove('is-hidden');
      }
    });

    EventManager.emit('map:enableDrawing');
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

  static createNewFieldForm(feature) {
    const fieldIndex = this.nextFieldIndex++;

    const formsContainer = document.querySelector('.field-forms-container');
    if (!formsContainer) return;

    const newFormHTML = `
    <div class="panel-block field-form" data-field-index="${fieldIndex}">
      <div class="is-flex is-justify-content-space-between is-align-items-center is-fullwidth mb-3">
        <div class="field mb-0">
          <strong>Площадь:</strong> <span class="field-size">0 га</span>
        </div>
        <button class="button is-danger is-small delete-form-btn" type="button" data-field-index="${fieldIndex}">
          <span class="icon is-small">
            <i class="fas fa-trash"></i>
          </span>
          <span>Удалить</span>
        </button>
      </div>

      <form class="add-field-form">
        <div class="field">
          <label class="label">Название поля *</label>
          <div class="control">
            <input class="input" type="text" placeholder="Введите название поля" name="fieldName" required>
          </div>
        </div>

        <div class="field">
          <label class="label">Культура *</label>
          <div class="control">
            <div class="select is-fullwidth">
              <select name="crop" required>
                <option value="">Выберите культуру</option>
                <option value="Пшеница озимая">Пшеница озимая</option>
                <option value="Кукуруза">Кукуруза</option>
                <option value="Подсолнечник">Подсолнечник</option>
                <option value="Ячмень">Ячмень</option>
                <option value="Рапс">Рапс</option>
                <option value="Соя">Соя</option>
                <option value="Картофель">Картофель</option>
                <option value="Овес">Овес</option>
              </select>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="label">Описание</label>
          <div class="control">
            <textarea class="textarea" placeholder="Дополнительная информация о поле..." name="description" rows="2"></textarea>
          </div>
        </div>
      </form>
    </div>
  `;

    formsContainer.insertAdjacentHTML('beforeend', newFormHTML);

    if (feature) {
      this.fieldForms.set(feature, fieldIndex);
      this.temporaryFeatures.push(feature);
      feature.set('fieldIndex', fieldIndex);
    }

    this.setupDeleteFormHandler(fieldIndex);
  };

  static setupFieldSelection() {
    const addFieldBtn = document.querySelector('.add-field-btn');
    const backBtn = document.querySelector('.back-btn');

    if (addFieldBtn) {
      addFieldBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showAddFieldPanel();
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.discardAllTemporaryFields();
      });
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('.field-item')) {
        const fieldItem = e.target.closest('.field-item');
        const allFieldItems = document.querySelectorAll('.field-item');

        allFieldItems.forEach(item => item.classList.remove('is-active'));

        fieldItem.classList.add('is-active');
      }
    });
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
            [4216783.808550349, 7496047.274228949],
            [4233291.512954693, 7513164.650363283],
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
    const fieldItem = document.querySelector(`.field-item[data-field-id="${fieldId}"]`);

    if (fieldItem) {
      fieldItem.click();
    }
  };

  static setupDeleteFormHandler(fieldIndex) {
    const deleteButton = document.querySelector(`.delete-form-btn[data-field-index="${fieldIndex}"]`);
    if (deleteButton) {
      deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.deleteSingleForm(fieldIndex);
      });
    }
  };

  static deleteSingleForm(fieldIndex) {
    let correspondingFeature = null;
    for (let [feature, index] of this.fieldForms) {
      if (index == fieldIndex) {
        correspondingFeature = feature;
        break;
      }
    }

    if (correspondingFeature) {
      EventManager.emit('map:removeFeature', correspondingFeature);

      const featureIndex = this.temporaryFeatures.indexOf(correspondingFeature);
      if (featureIndex > -1) {
        this.temporaryFeatures.splice(featureIndex, 1);
      }

      this.fieldForms.delete(correspondingFeature);
    }

    const formElement = document.querySelector(`[data-field-index="${fieldIndex}"]`);
    if (formElement) {
      formElement.remove();
    }

    EventManager.emit('notification:show', {
      message: 'Поле удалено',
      type: 'info'
    });
  };

  static focusOnField(field) {
    if (!field || !field.coordinates) {
      console.warn('Нет данных о координатах поля');
      return;
    }

    EventManager.emit('field:focus', field);

    EventManager.emit('field:selected', field.id);
  };
}