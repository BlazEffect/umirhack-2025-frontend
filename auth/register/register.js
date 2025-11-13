document.addEventListener('DOMContentLoaded', () => {
  const navbarBurger = document.querySelector('.navbar-burger');

  navbarBurger.addEventListener('click', () => {
    const target = navbarBurger.dataset.target;
    const $target = document.getElementById(target);

    navbarBurger.classList.toggle('is-active');
    $target.classList.toggle('is-active');
  });

  const registerForm = document.querySelector('.register-form_form');
  const nameInput = document.getElementById('name');
  const surnameInput = document.getElementById('surname');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const submitButton = registerForm.querySelector('button[type="submit"]');

  function showMessage(message, type = 'error') {
    const existingMessage = registerForm.querySelector('.message-custom');
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

    registerForm.insertBefore(messageDiv, registerForm.firstChild);

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
      submitButton.innerHTML = 'Создать аккаунт';
    }
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function validatePassword(password) {
    return password.length >= 6;
  }

  function validateForm() {
    const name = nameInput.value.trim();
    const surname = surnameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    [nameInput, surnameInput, emailInput, passwordInput].forEach(input => {
      hideFieldError(input);
    });

    let isValid = true;

    if (!name) {
      showFieldError(nameInput, 'Имя обязательно для заполнения');
      isValid = false;
    } else if (name.length < 2) {
      showFieldError(nameInput, 'Имя должно содержать минимум 2 символа');
      isValid = false;
    }

    if (!surname) {
      showFieldError(surnameInput, 'Фамилия обязательна для заполнения');
      isValid = false;
    } else if (surname.length < 2) {
      showFieldError(surnameInput, 'Фамилия должна содержать минимум 2 символа');
      isValid = false;
    }

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
      showFieldError(passwordInput, 'Пароль должен содержать минимум 6 символов');
      isValid = false;
    }

    if (!isValid) {
      showMessage('Пожалуйста, исправьте ошибки в форме');
    }

    return isValid;
  }

  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData = {
      name: nameInput.value.trim(),
      surname: surnameInput.value.trim(),
      email: emailInput.value.trim(),
      password: passwordInput.value.trim()
    };

    try {
      setLoading(true);

      const response = await fetch('/api/register', {
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
        throw new Error(data.message || 'Произошла ошибка при регистрации');
      }

      showMessage('Регистрация прошла успешно! Перенаправление на страницу входа...', 'success');

      registerForm.reset();

      setTimeout(() => {
        window.location.href = '/login/login.html';
      }, 3000);

    } catch (error) {
      console.error('Ошибка:', error);

      if (!registerForm.querySelector('.help.is-error')) {
        showMessage('Произошла ошибка при отправке формы');
      }
    } finally {
      setLoading(false);
    }
  });

  const inputs = [nameInput, surnameInput, emailInput, passwordInput];
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
      showFieldError(this, 'Пароль должен содержать минимум 6 символов');
    }
  });
});