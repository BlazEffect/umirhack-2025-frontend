(function () {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');

  if (!token || !userData) {
    localStorage.setItem('redirectUrl', window.location.href);
    window.location.href = '/loading/';
    return;
  }

  try {
    const user = JSON.parse(userData);
    if (!user.email || !user.id) {
      throw new Error('Неизвестный пользователь');
    }
  } catch (error) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.setItem('redirectUrl', window.location.href);
    window.location.href = '/loading/';
  }
})();