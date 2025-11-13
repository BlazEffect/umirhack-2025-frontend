document.addEventListener('DOMContentLoaded', () => {
  const navbarBurger = document.querySelector('.navbar-burger');

  navbarBurger.addEventListener('click', () => {
    const target = navbarBurger.dataset.target;
    const $target = document.getElementById(target);

    navbarBurger.classList.toggle('is-active');
    $target.classList.toggle('is-active');
  });

  const loginForm = document.querySelector('.login-form_form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitButton = loginForm.querySelector('button[type="submit"]');

  // Функция для показа сообщений
  function showMessage(message, type = 'error') {
    // Удаляем предыдущие сообщения
    const existingMessage = loginForm.querySelector('.message-custom');
    if (existingMessage) {
      existingMessage.remove();
    }

    // Создаем новое сообщение
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-custom p-4 ${type === 'error' ? 'message-error' : 'message-success'}`;
    messageDiv.innerHTML = `
            <div class="is-flex is-justify-content-space-between is-align-items-center">
                <span>${message}</span>
                <button class="delete is-small"></button>
            </div>
        `;

    // Вставляем сообщение перед формой
    loginForm.insertBefore(messageDiv, loginForm.firstChild);

    // Добавляем обработчик для кнопки закрытия
    messageDiv.querySelector('.delete').addEventListener('click', function () {
      messageDiv.remove();
    });

    // Автоматически скрываем успешные сообщения через 5 секунд
    if (type === 'success') {
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5000);
    }
  }

  // Функция для показа ошибки поля
  function showFieldError(input, message) {
    // Убираем существующие ошибки для этого поля
    hideFieldError(input);

    input.classList.add('input-error');

    const helpDiv = document.createElement('p');
    helpDiv.className = 'help is-error';
    helpDiv.textContent = message;

    input.parentNode.appendChild(helpDiv);
  }

  // Функция для скрытия ошибки поля
  function hideFieldError(input) {
    input.classList.remove('input-error');

    const existingHelp = input.parentNode.querySelector('.help.is-error');
    if (existingHelp) {
      existingHelp.remove();
    }
  }

  // Функция для показа/скрытия спиннера загрузки
  function setLoading(isLoading) {
    if (isLoading) {
      // Пробуем стандартный Bulma лоадер
      submitButton.classList.add('is-loading');
      submitButton.disabled = true;
      submitButton.innerHTML = 'Загрузка...';
    } else {
      submitButton.classList.remove('is-loading');
      submitButton.disabled = false;
      submitButton.innerHTML = 'Войти';
    }
  }

  // Функция для валидации email
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Функция для валидации пароля
  function validatePassword(password) {
    return password.length >= 1; // Минимум 1 символ для логина
  }

  // Функция для валидации формы
  function validateForm() {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    // Убираем предыдущие стили ошибок
    [emailInput, passwordInput].forEach(input => {
      hideFieldError(input);
    });

    let isValid = true;

    // Валидация email
    if (!email) {
      showFieldError(emailInput, 'Email обязателен для заполнения');
      isValid = false;
    } else if (!validateEmail(email)) {
      showFieldError(emailInput, 'Введите корректный email адрес');
      isValid = false;
    }

    // Валидация пароля
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

  // Обработчик отправки формы
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Валидация формы
    if (!validateForm()) {
      return;
    }

    const formData = {
      email: emailInput.value.trim(),
      password: passwordInput.value.trim()
    };

    try {
      setLoading(true);

      // Отправляем запрос на бекенд
      const response = await fetch('/api/login', { // Замените на ваш URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Обработка специфичных ошибок от сервера
        if (data.errors) {
          // Если сервер возвращает детальные ошибки по полям
          Object.keys(data.errors).forEach(field => {
            const input = document.getElementById(field);
            if (input) {
              showFieldError(input, data.errors[field]);
            }
          });
          throw new Error('Пожалуйста, исправьте ошибки в форме');
        }

        // Обработка стандартных ошибок аутентификации
        if (response.status === 401) {
          throw new Error('Неверный email или пароль');
        } else if (response.status === 404) {
          throw new Error('Пользователь не найден');
        } else if (response.status === 403) {
          throw new Error('Доступ запрещен');
        }

        throw new Error(data.message || 'Произошла ошибка при авторизации');
      }

      // Успешный логин
      showMessage('Успешный вход! Перенаправление...', 'success');

      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));

// Всегда перенаправляем через loading.html
      setTimeout(() => {
        window.location.href = '/loading.html';
      }, 1500);

    } catch (error) {
      console.error('Ошибка:', error);

      // Показываем общее сообщение об ошибке, если нет ошибок по полям
      if (!loginForm.querySelector('.help.is-error')) {
        showMessage('Произошла ошибка при отправке формы');
      }
    } finally {
      setLoading(false);
    }
  });

  // Обработчики для сброса стилей ошибок при вводе
  const inputs = [emailInput, passwordInput];
  inputs.forEach(input => {
    input.addEventListener('input', function () {
      if (this.classList.contains('input-error')) {
        hideFieldError(this);
      }
    });
  });

  // Дополнительная валидация email при потере фокуса
  emailInput.addEventListener('blur', function () {
    const email = this.value.trim();
    if (email && !validateEmail(email)) {
      showFieldError(this, 'Введите корректный email адрес');
    }
  });

  // Дополнительная валидация пароля при потере фокуса
  passwordInput.addEventListener('blur', function () {
    const password = this.value.trim();
    if (password && !validatePassword(password)) {
      showFieldError(this, 'Пароль должен содержать минимум 1 символ');
    }
  });

  // Автоматическая очистка ошибок при загрузке страницы
  window.addEventListener('load', function () {
    [emailInput, passwordInput].forEach(input => {
      hideFieldError(input);
    });
  });
});