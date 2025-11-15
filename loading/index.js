function checkAuth() {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');

  if (!token || !userData) {
    return false;
  }

  try {
    const user = JSON.parse(userData);
    return !!(user.email && user.id);
  } catch (error) {
    console.error('Ошибка разбора данных:', error);
    return false;
  }
}

function getRedirectUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUrl = urlParams.get('redirect') ||
    localStorage.getItem('redirectUrl') ||
    '/dashboard/';

  localStorage.removeItem('redirectUrl');
  return redirectUrl;
}

function updateStatus(message, type = 'default') {
  const statusElement = document.getElementById('status');
  const statusText = document.getElementById('status-text');

  statusText.textContent = message;

  statusElement.className = 'loading-status';
  if (type === 'success') {
    statusElement.classList.add('status-success');
  } else if (type === 'error') {
    statusElement.classList.add('status-error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const checkSteps = [
    { delay: 500, message: 'Проверка токена' },
    { delay: 500, message: 'Загрузка данных' },
    { delay: 200, message: 'Проверка прав' }
  ];

  let currentStep = 0;

  function executeNextStep() {
    if (currentStep < checkSteps.length) {
      const step = checkSteps[currentStep];
      setTimeout(() => {
        updateStatus(step.message);
        currentStep++;
        executeNextStep();
      }, step.delay);
    } else {
      performFinalCheck();
    }
  }

  function performFinalCheck() {
    if (checkAuth()) {
      const redirectUrl = getRedirectUrl();
      updateStatus('Доступ разрешён', 'success');

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } else {
      updateStatus('Требуется авторизация', 'error');

      const currentUrl = window.location.pathname + window.location.search;
      if (!currentUrl.includes('loading.html')) {
        localStorage.setItem('redirectUrl', currentUrl);
      }

      setTimeout(() => {
        window.location.href = '/login/';
      }, 500);
    }
  }

  setTimeout(executeNextStep, 500);
});

window.addEventListener('error', function(e) {
  console.error('Ошибка:', e);
  updateStatus('Ошибка проверки', 'error');

  setTimeout(() => {
    window.location.href = '/login/';
  }, 500);
});