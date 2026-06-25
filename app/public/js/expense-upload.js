(function () {
  var box = document.getElementById('expenseUploadBox');
  var input = document.getElementById('expenseImage');
  var preview = document.getElementById('expenseImagePreview');
  if (!box || !input || !preview) return;

  function showPreview(file) {
    if (!file || !file.type.startsWith('image/')) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.classList.add('expense-image-preview--visible');
      box.classList.add('has-preview');
    };
    reader.readAsDataURL(file);
  }

  box.addEventListener('click', function (e) {
    if (e.target !== input) input.click();
  });

  input.addEventListener('change', function () {
    if (input.files && input.files[0]) showPreview(input.files[0]);
  });

  ['dragenter', 'dragover'].forEach(function (evt) {
    box.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      box.classList.add('drag-over');
    });
  });

  box.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    box.classList.remove('drag-over');
  });

  box.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    box.classList.remove('drag-over');

    var files = e.dataTransfer.files;
    if (!files || !files.length) return;

    var file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please drop an image file only.');
      return;
    }

    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    showPreview(file);
  });

  var existingSrc = preview.getAttribute('data-existing');
  if (existingSrc) {
    preview.src = existingSrc;
    preview.classList.add('expense-image-preview--visible');
    box.classList.add('has-preview');
  }
})();
