import { EventManager } from '../../core/EventManager.js';
import { LocationButton } from '../components/LocationButton.js';
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
  }

  static setupSeasonEventHandlers() {
    EventManager.on('fields:cropsUpdate', (cropsData) => {
      FieldManager.updateFieldsCrops(cropsData);
    });
  }
}