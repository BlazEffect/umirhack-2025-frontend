import { MapManager } from '../assets/js/managers/MapManager.js';
import {LocationButton} from "../assets/js/ui/components/LocationButton.js";
import {MobileMenu} from "../assets/js/ui/components/MobileMenu.js";
import {DropdownManager} from "../assets/js/ui/components/DropdownManager.js";
import {ModalManager} from "../assets/js/ui/components/ModalManager.js";
import {SeasonManager} from "../assets/js/ui/components/SeasonManager.js";
import {EventHandler} from "../assets/js/ui/handlers/EventHandler.js";
import {Notification} from "../assets/js/ui/components/Notification.js";
import {FieldManager} from "../assets/js/ui/components/FieldManager.js";
import {Config} from "../assets/js/core/Config.js";

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    MapManager.init();

    LocationButton.init();
    MobileMenu.init();
    DropdownManager.init();
    ModalManager.init();

    SeasonManager.init({
      enableCropsUpdate: false,
      enableDropdownUpdate: false
    });
    FieldManager.init({
      showDetails: false,
      showRecommendations: false
    })

    EventHandler.init();
    Notification.init();

    const logoutButton =document.querySelector('.logout-item');

    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem(Config.storage.activeSeasonKey);

      window.location.href = '/';
    });
  });
})();