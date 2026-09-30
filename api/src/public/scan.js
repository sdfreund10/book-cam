(function () {
  const form = document.getElementById('scan-form')
  const cameraInput = document.getElementById('cover-camera')
  const libraryInput = document.getElementById('cover-library')
  const filename = document.getElementById('cover-filename')

  if (form == null || cameraInput == null || libraryInput == null || filename == null) {
    return
  }

  function selectSource (active, inactive) {
    active.setAttribute('name', 'cover')
    inactive.removeAttribute('name')
    if (active.files && active.files.length > 0) {
      filename.textContent = active.files[0].name || 'Photo selected'
    }
  }

  cameraInput.addEventListener('change', function () {
    selectSource(cameraInput, libraryInput)
  })

  libraryInput.addEventListener('change', function () {
    selectSource(libraryInput, cameraInput)
  })

  form.addEventListener('submit', function (event) {
    const hasCamera = cameraInput.files && cameraInput.files.length > 0
    const hasLibrary = libraryInput.files && libraryInput.files.length > 0
    if (!hasCamera && !hasLibrary) {
      event.preventDefault()
      filename.textContent = 'Please take a photo or choose one from your library.'
      filename.classList.add('field-error')
    }
  })
})()
