export default class View {
  #fileUpload = document.getElementById('fileUpload')
  #btnUploadVideo = document.getElementById('btnUploadVideos')
  #fileSize = document.getElementById('fileSize')
  #fileInfo = document.getElementById('fileInfo')
  #txtFileName = document.getElementById('fileName')
  #fileUploadWrapper = document.getElementById('fileUploadWrapper')
  #elapsed = document.getElementById('elapsed')
  #canvas = document.getElementById('preview-144p')

  constructor() {
    this.configureBtnUploadClick()
  }

  parseBytesIntoMBAndGB(bytes) {
    const mb = bytes / (1024 * 1024)
    // if mb is greater than 1024, then convert to GB
    if (mb > 1024) {
      // round to 2 decimal places
      return `${Math.round(mb / 1024)}GB`
    }
    return `${Math.round(mb)}MB`
  }

  onChangeFileUpload(fn) {
    return e => {
      const file = e.target.files[0]
      const { name, size } = file
      fn(file)

      this.#txtFileName.innerText = name
      this.#fileSize.innerText = this.parseBytesIntoMBAndGB(size)

      this.#fileInfo.classList.remove('hide')
      this.#fileUploadWrapper.classList.add('hide')
    }
  }

  updateElapsedTime(text) {
    this.#elapsed.innerText = text
  }

  configureOnFileChange(fn) {
    this.#fileUpload.addEventListener('change', this.onChangeFileUpload(fn))
  }

  configureBtnUploadClick() {
    this.#btnUploadVideo.addEventListener('click', () => {
      // trigger file input
      this.#fileUpload.click()
    })
  }
}
