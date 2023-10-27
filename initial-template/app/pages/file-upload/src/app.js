import Clock from './deps/clock.js';
import View from './view.js'

const view = new View()
const clock = new Clock()
const worker = new Worker('./src/workers/worker.js', { type: 'module' })

let tick = ''

worker.onmessage = ({ data }) => {
    const { status, message, buffers, fileName } = data
    if (status !== 'done') return;
    clock.stop()
    view.updateElapsedTime(`Process took ${tick.replace('ago', '')}`)
    console.log('Message received in the view process: ', message)
    // view.downloadBlobAsFile(buffers, fileName)
}
worker.onerror = (ev) => {
    console.error('Error in the worker', ev)
}

view.configureOnFileChange(file => {
    const canvas = view.getCanvas()

    worker.postMessage({ file, canvas }, [canvas])

    // The function passed as argument is called every tick.
    clock.start((time) => {
        tick = time
        view.updateElapsedTime(`Process started ${time}`)
    })
})

async function fakeFetch() {
    const filePath = '/videos/frag_bunny.mp4'
    const response = await fetch(filePath)

    // const response = await fetch(filePath, { method: 'HEAD' })
    //Just out of curiosity with the method HEAD, the response header 'content-length' has the value of the file size in bytes.
    // const size = response.headers.get('content-length')

    const file = new File([await response.blob()], filePath, { type: 'video/mp4', lastModified: Date.now() })
    const event = new Event('change')
    Reflect.defineProperty(event, 'target', { value: { files: [file] } })
    document.getElementById('fileUpload').dispatchEvent(event)
}

fakeFetch() // Just for debugging purposes