import VideoProcessor from "./videoProcessor.js"
import { encoderConfigWebM, webmWriterConfig, encoderConfigMP4 } from "../configs/videoConfig.js"
import Mp4Demuxer from "./mp4Demuxer.js"
import CanvasRenderer from "./canvasRenderer.js"
import WebmWriter from '../deps/webm-writer2.js'
import Service from "./service.js"

const mp4Demuxer = new Mp4Demuxer()
const service = new Service({ url: 'http://localhost:3000/'})
const webmWriter = new WebmWriter(webmWriterConfig)
const videoProcessor = new VideoProcessor({
  mp4Demuxer,
  webmWriter,
  service
})

// self is the global scope object that can be used both in the window and worker context.
onmessage = async ({ data }) => {
  const { file, canvas } = data
  console.log('File received from main script', file)
  const renderFrame = new CanvasRenderer(canvas).getRenderer()

  await videoProcessor.start({
    file,
    encoderConfig: encoderConfigWebM,
    renderFrame,
    sendMessage: (message) => {
      self.postMessage(message)
    }
  })

  // self.postMessage({ message: 'File processed', status: 'done' })
}