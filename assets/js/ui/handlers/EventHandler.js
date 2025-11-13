import { EventManager } from '../../core/EventManager.js';
import { LocationButton } from '../components/LocationButton.js';
import { MobileMenu } from '../components/MobileMenu.js';
import { FieldManager } from '../components/FieldManager.js';

export class EventHandler {
  static init() {
    this.setupGlobalEventHandlers();
    this.setupSeasonEventHandlers();
  }

  static setupGlobalEventHandlers() {
    EventManager.on('ui:locationLoading', (show) => {
      if (show) {
        LocationButton.showLoading();
      } else {
        LocationButton.hideLoading();
      }
    });

    EventManager.on('map:areaCalculated', (area) => {
      this.displayAreaOnMap(area);
    });
  }

  static setupSeasonEventHandlers() {
    EventManager.on('fields:cropsUpdate', (cropsData) => {
      FieldManager.updateFieldsCrops(cropsData);
    });
  }

  static displayAreaOnMap(area) {
    const existingAreaElement = document.getElementById('area-display');
    if (existingAreaElement) {
      existingAreaElement.remove();
    }

    const areaElement = document.createElement('div');
    areaElement.id = 'area-display';
    areaElement.className = 'area-display';
    areaElement.innerHTML = `<strong>Площадь территории:</strong> ${area.toFixed(2)} га`;

    document.getElementById('map').appendChild(areaElement);
  }
}