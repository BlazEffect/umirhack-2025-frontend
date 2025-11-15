import {EventManager} from '../../core/EventManager.js';
import {Config} from '../../core/Config.js';

export class FieldManager {
  static fieldForms = new Map();
  static nextFieldIndex = 1;
  static currentFields = [];
  static temporaryFeatures = [];

  static sampleRecommendations = [
    {
      id: 1,
      crop_name: "Горох",
      family_name: "Бобовые",
      score: 95,
      compatibility: "excellent",
      reasons: [
        "Бобовые обогащают почву азотом",
        "Хороший предшественник для текущей культуры (пшеница)",
        "Соответствует кислотности почвы (pH 6.2)"
      ],
      rotation_interval: 2,
      nutrient_demand: "low",
      water_demand: "medium"
    },
    {
      id: 2,
      crop_name: "Огурец",
      family_name: "Тыквенные",
      score: 82,
      compatibility: "good",
      reasons: [
        "Разные типы корневых систем с предшественником",
        "Подходит для суглинистой почвы",
        "Хорошая диверсификация севооборота"
      ],
      rotation_interval: 2,
      nutrient_demand: "high",
      water_demand: "high"
    },
    {
      id: 3,
      crop_name: "Морковь",
      family_name: "Зонтичные",
      score: 78,
      compatibility: "good",
      reasons: [
        "Нейтральная культура для севооборота",
        "Не требовательна к питательным веществам",
        "Хорошо растет после злаковых"
      ],
      rotation_interval: 3,
      nutrient_demand: "medium",
      water_demand: "medium"
    },
    {
      id: 4,
      crop_name: "Картофель",
      family_name: "Пасленовые",
      score: 45,
      compatibility: "poor",
      reasons: [
        "Нарушен интервал севооборота (2 года вместо 4)",
        "Высокая потребность в питательных веществах",
        "Риск накопления болезней"
      ],
      rotation_interval: 4,
      nutrient_demand: "high",
      water_demand: "medium"
    }
  ];

  static sampleCrops = [
    { id: 1, name: "Пшеница", family: "Злаки" },
    { id: 2, name: "Кукуруза", family: "Злаки" },
    { id: 3, name: "Картофель", family: "Пасленовые" },
    { id: 4, name: "Горох", family: "Бобовые" },
    { id: 5, name: "Огурец", family: "Тыквенные" },
    { id: 6, name: "Томат", family: "Пасленовые" },
    { id: 7, name: "Морковь", family: "Зонтичные" },
    { id: 8, name: "Свекла", family: "Амарантовые" },
    { id: 9, name: "Лук", family: "Луковые" },
    { id: 10, name: "Капуста", family: "Капустные" }
  ];

  static currentFieldId = null;
  static currentPlantingId = null;

  static config = {
    focusOnMap: true,
    drawFieldsOnMap: true,
    showDetails: true,
    showRecommendations: true
  }

  static async init(userConfig = {}) {
    this.config = { ...this.config, ...userConfig };

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

    const cropIcon = this.getCropIcon(field.crop || '');

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
            ${field.crop || 'Нет культуры'}
          </small>
        </div>
        <div class="is-flex is-align-items-end is-flex-direction-column gap-4">
          <button class="delete field-delete" data-field-id="${field.id}"></button>
          <br>
          <span class="tag is-light is-success field-size">${field.area_ha} га</span>
        </div>
      </div>
    `;

    const deleteBtn = fieldElement.querySelector('.field-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteField(field.id);
    });

    if (this.config.focusOnMap) {
      fieldElement.addEventListener('click', (e) => {
        e.preventDefault();
        this.focusOnField(field);
      });
    }

    if (this.config.showDetails && isActive) {
      this.displayFieldDetails(field.id);
    }

    if (this.config.showRecommendations && isActive) {
      this.displayRecommendations(this.sampleRecommendations);
    }

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

      if (!fieldName || !crop) {
        errors.push(`Поле не заполнено: название или культура`);
        continue;
      }

      try {
        const coordinates = feature.getGeometry().getCoordinates()[0];
        let area = 0;

        this.getFeatureArea(feature, (mapArea) => {
          area = mapArea;
        });

        fieldsData.push({
          name: fieldName,
          area_ha: area,
          coordinates: coordinates,
          soil_type: ''
        });
      } catch (error) {
        errors.push(`Ошибка обработки поля`);
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
      for (const fieldData of fieldsData) {
        await this.saveFieldsToAPI(fieldData);
      }

      EventManager.emit('notification:show', {
        message: `Успешно сохранено ${fieldsData.length} полей!`,
        type: 'success'
      });

      this.showFieldsList();

      await this.reloadFieldsList();

      this.temporaryFeatures = [];
      this.fieldForms.clear();
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

  static async saveFieldsToAPI(fieldData) {
    try {
      const response = await fetch(Config.api.fields, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(fieldData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }
    } catch (error) {
      console.error('Ошибка при массовом сохранении полей:', error);
      throw error;
    }
  }

  static async updateFieldsToAPI(fieldData) {
    try {
      const response = await fetch(Config.api.fields + `/${fieldData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(fieldData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }
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
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }

      EventManager.emit('notification:show', {
        message: 'Поле успешно удалено',
        type: 'success'
      });

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

      if (this.config.drawFieldsOnMap) {
        EventManager.emit('map:renderFields', fieldsData);
      }
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

        if (this.config.showDetails) {
          this.displayFieldDetails(parseInt(fieldItem.dataset.fieldId));
        }

        if (this.config.showRecommendations) {
          this.displayRecommendations(this.sampleRecommendations);
        }
      }
    });
  }

  static async loadFieldsFromAPI() {
    try {
      const response = await fetch(Config.api.fields + '/with/plantings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ошибка! статус: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Ошибка при загрузке полей из API:', error);
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
  };

  static displayFieldDetails(fieldId) {
    const field = this.currentFields.find(f => f.id === fieldId);
    const container = document.getElementById('field-edit-content');

    if (!field) return;

    const plantingCount = field.plantings ? field.plantings.length : 0;
    const currentYear = new Date().getFullYear();
    const currentYearPlantings = field.plantings ? field.plantings.filter(p => p.year === currentYear).length : 0;

    let html = `
            <div class="edit-form-container">
                <div class="stats-cards">
                    <div class="stat-card">
                        <div class="stat-number">${field.area_ha}</div>
                        <div class="stat-label">Гектаров</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${plantingCount}</div>
                        <div class="stat-label">Посадок всего</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${currentYearPlantings}</div>
                        <div class="stat-label">Посадок в ${currentYear}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${field.soil_type}</div>
                        <div class="stat-label">Тип почвы</div>
                    </div>
                </div>

                <!-- Информация о поле -->
                <div class="form-section">
                    <h3 class="section-title">
                        <i class="fas fa-info-circle"></i>
                        Основная информация
                    </h3>
                    <div class="field-details-actions">
                        <h4 class="is-size-5 has-text-weight-semibold">${field.name}</h4>
                        <button class="button is-small is-outlined edit-field-btn" data-field-id="${field.id}">
                            <span class="icon is-small">
                                <i class="fas fa-edit"></i>
                            </span>
                            <span>Редактировать</span>
                        </button>
                    </div>
                    
                    <div class="content">
                        <p><strong>Площадь:</strong> ${field.area_ha} гектаров</p>
                        <p><strong>Тип почвы:</strong> ${field.soil_type}</p>
                        ${field.coordinates ? `
                            <div class="map-preview">
                                <i class="fas fa-map-marker-alt mr-2"></i>
                                Координаты заданы
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- История посадок -->
                <div class="form-section">
                    <div class="is-flex is-justify-content-space-between is-align-items-center mb-3">
                        <h3 class="section-title">
                            <i class="fas fa-history"></i>
                            История посадок
                        </h3>
                        <button class="button is-primary is-small add-planting-btn">
                            <span class="icon">
                                <i class="fas fa-plus"></i>
                            </span>
                            <span>Добавить посадку</span>
                        </button>
                    </div>

                    ${field.plantings && field.plantings.length > 0 ? `
                        <table class="planting-table">
                            <thead>
                                <tr>
                                    <th>Год</th>
                                    <th>Культура</th>
                                    <th>Сезон</th>
                                    <th>Урожайность</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${field.plantings.map(planting => `
                                    <tr>
                                        <td>${planting.year}</td>
                                        <td>
                                            <span class="crop-badge">
                                                <i class="fas fa-seedling"></i>
                                                ${planting.crop_name}
                                            </span>
                                        </td>
                                        <td>${planting.season}</td>
                                        <td>
                                            ${planting.yield_amount ? `
                                                <span class="has-text-weight-semibold">${planting.yield_amount} т/га</span>
                                                ${planting.yield_quality ? `<span class="tag is-light is-capitalized ml-1">${planting.yield_quality}</span>` : ''}
                                            ` : 'Не указано'}
                                        </td>
                                        <td>
                                            <div class="action-buttons">
                                                <button class="edit-btn edit-planting-btn" data-planting-id="${planting.id}">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="delete-btn delete-planting-btn" data-planting-id="${planting.id}">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="empty-state">
                            <div class="icon">
                                <i class="fas fa-seedling"></i>
                            </div>
                            <h3 class="is-size-5 has-text-weight-semibold">Нет данных о посадках</h3>
                            <p>Добавьте первую посадку для этого поля</p>
                        </div>
                    `}
                </div>
            </div>
        `;

    container.innerHTML = html;

    document.querySelector('.edit-field-btn').addEventListener('click', function() {
      const fieldId = parseInt(this.getAttribute('data-field-id'));
      FieldManager.openFieldModal(fieldId);
    });

    document.querySelector('.add-planting-btn').addEventListener('click', function() {
      FieldManager.openPlantingModal(null);
    });

    document.querySelectorAll('.edit-planting-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const plantingId = parseInt(this.getAttribute('data-planting-id'));
        FieldManager.openPlantingModal(plantingId);
      });
    });

    document.querySelectorAll('.delete-planting-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const plantingId = parseInt(this.getAttribute('data-planting-id'));
        FieldManager.deletePlanting(plantingId);
      });
    });
  };

  static openFieldModal(fieldId = null) {
    const modal = document.getElementById('field-modal');
    const form = document.getElementById('field-form');

    if (fieldId) {
      const field = this.currentFields.find(f => f.id === fieldId);
      if (field) {
        form.name.value = field.name;
        form.area.value = field.area_ha;
        form.soil_type.value = field.soil_type;
      }
    } else {
      form.reset();
    }

    modal.classList.add('is-active');
    modal.setAttribute('data-field-id', fieldId);

    document.querySelector('.modal-background').addEventListener('click', this.closeFieldModal);
    document.querySelector('.delete').addEventListener('click', this.closeFieldModal);
    document.querySelector('.cancel-field-btn').addEventListener('click', this.closeFieldModal);
    document.querySelector('#save-field-btn').addEventListener('click', this.saveFieldBtn);
  };

  static closeFieldModal() {
    document.getElementById('field-modal').classList.remove('is-active');
  };

  static openPlantingModal(plantingId = null) {
    const modal = document.getElementById('planting-modal');
    const title = document.getElementById('planting-modal-title');
    const form = document.getElementById('planting-form');
    const cropSelect = form.crop_id;

    cropSelect.innerHTML = '<option value="">Выберите культуру</option>' +
      this.sampleCrops.map(crop => `<option value="${crop.id}">${crop.name} (${crop.family})</option>`).join('');

    if (plantingId) {
      title.textContent = 'Редактировать посадку';
      this.currentPlantingId = plantingId;
      const field = this.sampleFields.find(f => f.plantings.some(p => p.id === plantingId));
      if (field) {
        const planting = field.plantings.find(p => p.id === plantingId);
        const crop = this.sampleCrops.find(c => c.name === planting.crop_name);
        if (crop) form.crop_id.value = crop.id;
        form.year.value = planting.year;
        form.season.value = planting.season;
        form.planting_date.value = planting.planting_date || '';
        form.harvest_date.value = planting.harvest_date || '';
        form.yield_amount.value = planting.yield_amount || '';
        form.yield_quality.value = planting.yield_quality || '';
        form.notes.value = planting.notes || '';
      }
    } else {
      title.textContent = 'Добавить посадку';
      this.currentPlantingId = null;
      form.reset();
      form.year.value = new Date().getFullYear();
    }

    modal.classList.add('is-active');

    document.querySelector('.modal-background').addEventListener('click', this.closePlantingModal);
    document.querySelector('.delete').addEventListener('click', this.closePlantingModal);
    document.querySelector('.cancel-planting-btn').addEventListener('click', this.closePlantingModal);
  };

  static closePlantingModal() {
    document.getElementById('planting-modal').classList.remove('is-active');
  };

  static saveField() {
    const form = document.getElementById('field-form');
    const formData = new FormData(form);

    console.log('Сохранение поля:', {
      name: formData.get('name'),
      area: formData.get('area'),
      soil_type: formData.get('soil_type'),
      coordinates: formData.get('coordinates'),
      description: formData.get('description')
    });

    EventManager.emit('notification:show', {
      message: 'Поле успешно сохранено!',
      type: 'success'
    });

    this.closeFieldModal();

    if (this.currentFieldId) {
      this.displayFieldDetails(this.currentFieldId);
    }
  };

  static savePlanting() {
    const form = document.getElementById('planting-form');
    const formData = new FormData(form);
    const cropId = formData.get('crop_id');
    const crop = this.sampleCrops.find(c => c.id === parseInt(cropId));

    console.log('Сохранение посадки:', {
      field_id: this.currentFieldId,
      crop_id: cropId,
      crop_name: crop ? crop.name : '',
      year: formData.get('year'),
      season: formData.get('season'),
      planting_date: formData.get('planting_date'),
      harvest_date: formData.get('harvest_date'),
      yield_amount: formData.get('yield_amount'),
      yield_quality: formData.get('yield_quality'),
      notes: formData.get('notes')
    });

    EventManager.emit('notification:show', {
      message: 'Посадка успешно сохранена!',
      type: 'success'
    });

    this.closePlantingModal();

    if (this.currentFieldId) {
      this.displayFieldDetails(this.currentFieldId);
    }
  };

  static deletePlanting(plantingId) {
    if (confirm('Вы уверены, что хотите удалить эту посадку?')) {
      console.log('Удаление посадки:', plantingId);

      EventManager.emit('notification:show', {
        message: 'Посадка успешно удалена!',
        type: 'success'
      });

      if (this.currentFieldId) {
        this.displayFieldDetails(this.currentFieldId);
      }
    }
  };

  static displayRecommendations(recommendations) {
    const container = document.getElementById('recommendations-content');
    const loadingIndicator = document.getElementById('loading-indicator');
    const emptyState = document.getElementById('empty-state');

    loadingIndicator.classList.add('is-hidden');

    if (recommendations.length === 0) {
      emptyState.classList.remove('is-hidden');
      return;
    }

    recommendations.sort((a, b) => b.score - a.score);

    let html = '';

    recommendations.forEach(rec => {
      const compatibilityText = {
        'excellent': 'Отлично',
        'good': 'Хорошо',
        'fair': 'Удовлетворительно',
        'poor': 'Не рекомендуется'
      };

      const compatibilityIcons = {
        'excellent': 'fa-star',
        'good': 'fa-thumbs-up',
        'fair': 'fa-check',
        'poor': 'fa-exclamation-triangle'
      };

      html += `
                <div class="card recommendation-card">
                    <header class="card-header">
                        <div class="is-flex is-align-items-center crop-info">
                            <div class="crop-icon ${rec.compatibility}">
                                <i class="fas fa-seedling"></i>
                            </div>
                            <div class="is-flex-grow-1">
                                <h3 class="is-size-5 has-text-weight-bold">${rec.crop_name}</h3>
                                <p class="has-text-grey">${rec.family_name}</p>
                            </div>
                            <div class="is-flex is-align-items-center">
                                <span class="score-badge ${rec.compatibility} mr-3">
                                    ${rec.score}/100
                                </span>
                                <span class="compatibility-tag has-background-${rec.compatibility === 'excellent' ? 'success' : rec.compatibility === 'good' ? 'info' : rec.compatibility === 'fair' ? 'warning' : 'danger'}-light has-text-${rec.compatibility === 'excellent' ? 'success' : rec.compatibility === 'good' ? 'info' : rec.compatibility === 'fair' ? 'warning' : 'danger'}">
                                    <i class="fas ${compatibilityIcons[rec.compatibility]} mr-1"></i>
                                    ${compatibilityText[rec.compatibility]}
                                </span>
                            </div>
                        </div>
                    </header>
                    <div class="card-content">
                        <div class="content">
                            <div class="columns">
                                <div class="column is-8">
                                    <h4 class="is-size-6 has-text-weight-semibold mb-3">Причины рекомендации:</h4>
                                    <ul class="reasons-list">
                                        ${rec.reasons.map(reason => `
                                            <li>
                                                <span class="reason-icon">
                                                    <i class="fas fa-check-circle"></i>
                                                </span>
                                                <span>${reason}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                                <div class="column is-4">
                                    <div class="box is-shadowless has-background-light">
                                        <h5 class="is-size-6 has-text-weight-semibold mb-3">Характеристики:</h5>
                                        <div class="mb-2">
                                            <strong>Интервал:</strong> ${rec.rotation_interval} года
                                        </div>
                                        <div class="mb-2">
                                            <strong>Питание:</strong>
                                            <span class="tag is-light is-capitalized">${rec.nutrient_demand}</span>
                                        </div>
                                        <div class="mb-3">
                                            <strong>Полив:</strong>
                                            <span class="tag is-light is-capitalized">${rec.water_demand}</span>
                                        </div>
                                        <div class="progress-bar">
                                            <div class="progress-fill ${rec.compatibility}" style="width: ${rec.score}%"></div>
                                        </div>
                                        <small class="has-text-grey">Оценка пригодности</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <footer class="card-footer">
                        <button class="card-footer-item apply-btn" data-crop-id="${rec.id}" data-crop-name="${rec.crop_name}">
                            <i class="fas fa-check-circle mr-2"></i>
                            Применить
                        </button>
                        <button class="card-footer-item details-btn">
                            <i class="fas fa-info-circle mr-2"></i>
                            Подробнее
                        </button>
                    </footer>
                </div>
            `;
    });

    container.innerHTML = html;

    document.querySelectorAll('.apply-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const cropId = this.getAttribute('data-crop-id');
        const cropName = this.getAttribute('data-crop-name');
        this.openApplyModal(cropId, cropName);
      });
    });
  };

  static openApplyModal(cropId, cropName) {
    const modal = document.getElementById('apply-modal');
    const targetYear = document.getElementById('target-year').value;

    document.getElementById('modal-crop-name').textContent = cropName;
    document.getElementById('modal-target-year').textContent = targetYear;

    modal.classList.add('is-active');

    document.querySelector('.modal-background').addEventListener('click', this.closeApplyModal);
    document.querySelector('.delete').addEventListener('click', this.closeApplyModal);
    document.querySelector('.cancel-apply').addEventListener('click', this.closeApplyModal);

    document.getElementById('confirm-apply').addEventListener('click', function() {
      FieldManager.applyRecommendation(cropId, cropName, targetYear);
    });
  };

  static closeApplyModal() {
    document.getElementById('apply-modal').classList.remove('is-active');
  };

  static applyRecommendation(cropId, cropName, targetYear) {
    console.log(`Применяем рекомендацию: ${cropName} для ${targetYear} года`);

    EventManager.emit('notification:show', {
      message: `Рекомендация "${cropName}" успешно применена для ${targetYear} года!`,
      type: 'success'
    });

    this.closeApplyModal();
  };

  static async saveFieldBtn(event) {
    event.preventDefault();

    const form = document.getElementById('field-modal');
    const name = form.querySelector('input[name="name"]').value;
    const area = form.querySelector('input[name="area"]').value;
    const soilType = form.querySelector('select[name="soil_type"]').value;
    const fieldId = form.getAttribute('data-field-id');

    if (!form) return;

    const fieldsData = {
      id: fieldId,
      name: name,
      area_ha: area,
      soil_type: soilType,
    };

    try {
      await FieldManager.updateFieldsToAPI(fieldsData);

      EventManager.emit('notification:show', {
        message: `Успешно сохранено 1 поля!`,
        type: 'success'
      });

      FieldManager.showFieldsList();

      await FieldManager.reloadFieldsList();

      FieldManager.closeFieldModal();
    } catch (error) {
      console.error('Ошибка при сохранении полей:', error);
      EventManager.emit('notification:show', {
        message: 'Ошибка при сохранении полей. Попробуйте еще раз.',
        type: 'error'
      });
    }
  }
}