import { Config } from '../../core/Config.js';
import {EventManager} from "../../core/EventManager.js";

export class Notification {
  static init() {
    this.setupEventListeners();
  };

  static setupEventListeners() {
    EventManager.on('notification:show', (data) => {
      this.show(data.message, data.type);
    });
  };

  static show(message, type = 'success') {
    this.removeAll();

    const notification = document.createElement('div');
    notification.className = `agri-notification notification is-${type} is-light`;
    notification.innerHTML = [
      '<div class="notification-content">',
      '    <span class="icon is-small notification-icon">',
      '        <i class="fas ' + this.getIcon(type) + '"></i>',
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
    }, Config.ui.notification.timeout);

    notification.querySelector('.delete').addEventListener('click', function() {
      notification.parentNode.removeChild(notification);
    });
  }

  static getIcon(type) {
    const icons = {
      'success': 'fa-check-circle',
      'info': 'fa-info-circle',
      'warning': 'fa-exclamation-triangle',
      'error': 'fa-exclamation-circle'
    };
    return icons[type] || 'fa-info-circle';
  }

  static removeAll() {
    document.querySelectorAll('.agri-notification').forEach(notif => notif.remove());
  }
}