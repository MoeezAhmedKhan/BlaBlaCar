  document.getElementById('myDateInput').addEventListener('focus', function() {
    this.setAttribute('placeholder', 'YYYY-MM-DD');
  });

  document.getElementById('myDateInput').addEventListener('blur', function() {
    this.removeAttribute('placeholder');
  });