import {MobileMenu} from "../../assets/js/ui/components/MobileMenu.js";

document.addEventListener('DOMContentLoaded', () => {
  MobileMenu.init();

  const loginForm = document.querySelector('.login-form_form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitButton = loginForm.querySelector('button[type="submit"]');

  function showMessage(message, type = 'error') {
    const existingMessage = loginForm.querySelector('.message-custom');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-custom p-4 ${type === 'error' ? 'message-error' : 'message-success'}`;
    messageDiv.innerHTML = `
            <div class="is-flex is-justify-content-space-between is-align-items-center">
                <span>${message}</span>
                <button class="delete is-small"></button>
            </div>
        `;

    loginForm.insertBefore(messageDiv, loginForm.firstChild);

    messageDiv.querySelector('.delete').addEventListener('click', function () {
      messageDiv.remove();
    });

    if (type === 'success') {
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5000);
    }
  }

  function showFieldError(input, message) {
    hideFieldError(input);

    input.classList.add('input-error');

    const helpDiv = document.createElement('p');
    helpDiv.className = 'help is-error';
    helpDiv.textContent = message;

    input.parentNode.appendChild(helpDiv);
  }

  function hideFieldError(input) {
    input.classList.remove('input-error');

    const existingHelp = input.parentNode.querySelector('.help.is-error');
    if (existingHelp) {
      existingHelp.remove();
    }
  }

  function setLoading(isLoading) {
    if (isLoading) {
      submitButton.classList.add('is-loading');
      submitButton.disabled = true;
      submitButton.innerHTML = 'Загрузка...';
    } else {
      submitButton.classList.remove('is-loading');
      submitButton.disabled = false;
      submitButton.innerHTML = 'Войти';
    }
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password) {
    return password.length >= 1;
  }

  function validateForm() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    [emailInput, passwordInput].forEach(input => {
      hideFieldError(input);
    });

    let isValid = true;

    if (!email) {
      showFieldError(emailInput, 'Email обязателен для заполнения');
      isValid = false;
    } else if (!validateEmail(email)) {
      showFieldError(emailInput, 'Введите корректный email адрес');
      isValid = false;
    }

    if (!password) {
      showFieldError(passwordInput, 'Пароль обязателен для заполнения');
      isValid = false;
    } else if (!validatePassword(password)) {
      showFieldError(passwordInput, 'Пароль должен содержать минимум 1 символ');
      isValid = false;
    }

    if (!isValid) {
      showMessage('Пожалуйста, исправьте ошибки в форме');
    }

    return isValid;
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData = {
      email: emailInput.value.trim(),
      password: passwordInput.value.trim()
    };

    try {
      setLoading(true);

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          Object.keys(data.errors).forEach(field => {
            const input = document.getElementById(field);
            if (input) {
              showFieldError(input, data.errors[field]);
            }
          });
          throw new Error('Пожалуйста, исправьте ошибки в форме');
        }

        if (response.status === 401) {
          throw new Error('Неверный email или пароль');
        } else if (response.status === 404) {
          throw new Error('Пользователь не найден');
        } else if (response.status === 403) {
          throw new Error('Доступ запрещен');
        }

        throw new Error(data.message || 'Произошла ошибка при авторизации');
      }

      showMessage('Успешный вход! Перенаправление...', 'success');

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));

      setTimeout(() => {
        window.location.href = '/loading/loading.html';
      }, 1500);

    } catch (error) {
      console.error('Ошибка:', error);

      if (!loginForm.querySelector('.help.is-error')) {
        showMessage('Произошла ошибка при отправке формы');
      }
    } finally {
      setLoading(false);
    }
  });

  const inputs = [emailInput, passwordInput];
  inputs.forEach(input => {
    input.addEventListener('input', function () {
      if (this.classList.contains('input-error')) {
        hideFieldError(this);
      }
    });
  });

  emailInput.addEventListener('blur', function () {
    const email = this.value.trim();
    if (email && !validateEmail(email)) {
      showFieldError(this, 'Введите корректный email адрес');
    }
  });

  passwordInput.addEventListener('blur', function () {
    const password = this.value.trim();
    if (password && !validatePassword(password)) {
      showFieldError(this, 'Пароль должен содержать минимум 1 символ');
    }
  });

  window.addEventListener('load', function () {
    [emailInput, passwordInput].forEach(input => {
      hideFieldError(input);
    });
  });
});