import { MapManager } from '../assets/js/managers/MapManager.js';
import {LocationButton} from "../assets/js/ui/components/LocationButton.js";
import {MobileMenu} from "../assets/js/ui/components/MobileMenu.js";
import {DropdownManager} from "../assets/js/ui/components/DropdownManager.js";
import {ModalManager} from "../assets/js/ui/components/ModalManager.js";
import {SeasonManager} from "../assets/js/ui/components/SeasonManager.js";
import {EventHandler} from "../assets/js/ui/handlers/EventHandler.js";
import {Notification} from "../assets/js/ui/components/Notification.js";

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    MapManager.init({
      canDrawField: false
    });

    LocationButton.init();
    MobileMenu.init();
    DropdownManager.init();
    ModalManager.init();

    SeasonManager.init({
      enableCropsUpdate: false
    });

    EventHandler.init();
    Notification.init();
  });
})();