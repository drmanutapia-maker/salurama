try {
  if (sessionStorage.getItem('salurama_intro_vista') === '1') {
    document.documentElement.classList.add('intro-vista');
  }
} catch (e) {}
