import { Config } from '../../core/Config.js';

export class MobileMenu {
  static init() {
    this.setupBurgerMenu();
    this.setupMapClickHandler();
  }

  static setupBurgerMenu() {
    const navbarBurger = document.querySelector('.navbar-burger');
    const navbarMenu = document.querySelector('#mainNavbar');
    const sidebarContainer = document.querySelector('#sidebarContainer');

    if (navbarBurger) {
      navbarBurger.addEventListener('click', () => {
        navbarBurger.classList.toggle('is-active');
        navbarMenu.classList.toggle('is-active');

        if (sidebarContainer) {
          sidebarContainer.classList.toggle('is-active');
        }

        document.body.classList.toggle('is-clipped', navbarMenu.classList.contains('is-active'));
      });
    }
  }

  static setupMapClickHandler() {
    const mapContainer = document.querySelector('#mapContainer');
    const sidebarContainer = document.querySelector('#sidebarContainer');

    if (mapContainer) {
      mapContainer.addEventListener('click', () => {
        if (window.innerWidth <= Config.ui.breakpoints.mobile &&
          sidebarContainer.classList.contains('is-active')) {
          this.closeMenu();
        }
      });
    }
  }

  static closeMenu() {
    const navbarBurger = document.querySelector('.navbar-burger');
    if (navbarBurger) {
      navbarBurger.click();
    }
  }

  static isMenuOpen() {
    const navbarMenu = document.querySelector('#mainNavbar');
    return navbarMenu.classList.contains('is-active');
  }
}