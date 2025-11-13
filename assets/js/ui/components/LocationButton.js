import { EventManager } from '../../core/EventManager.js';

export class LocationButton {
  static init() {
    const button = this.createButton();
    document.getElementById('map').appendChild(button);
  }

  static createButton() {
    const button = document.createElement('button');
    button.innerHTML = '📍';
    button.title = 'Определить мое местоположение';
    button.className = 'location-button';

    button.addEventListener('click', () => {
      EventManager.emit('map:locateUser');
    });

    return button;
  }

  static showLoading() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerHTML = 'Определение местоположения...';
    loadingIndicator.className = 'location-loading';
    loadingIndicator.id = 'location-loading';
    document.getElementById('map').appendChild(loadingIndicator);
  }

  static hideLoading() {
    const loadingElement = document.getElementById('location-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
  }
}