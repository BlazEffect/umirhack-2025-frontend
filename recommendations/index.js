import {MobileMenu} from "../assets/js/ui/components/MobileMenu.js";
import {DropdownManager} from "../assets/js/ui/components/DropdownManager.js";
import {SearchManager} from "../assets/js/ui/components/SearchManager.js";
import {ModalManager} from "../assets/js/ui/components/ModalManager.js";
import {SeasonManager} from "../assets/js/ui/components/SeasonManager.js";
import {FieldManager} from "../assets/js/ui/components/FieldManager.js";
import {EventHandler} from "../assets/js/ui/handlers/EventHandler.js";
import {Notification} from "../assets/js/ui/components/Notification.js";
import {Config} from "../assets/js/core/Config.js";

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    MobileMenu.init();
    DropdownManager.init();
    SearchManager.init();
    ModalManager.init();

    SeasonManager.init({
      enableDropdownUpdate: false
    });
    FieldManager.init({
      focusOnMap: false,
      drawFieldsOnMap: false,
      showDetails: false
    });

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