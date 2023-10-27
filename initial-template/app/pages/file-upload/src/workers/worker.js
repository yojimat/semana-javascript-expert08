import VideoProcessor from "./videoProcessor.js"
import { encoderConfigWebM } from "../configs/videoConfig.js"
import Mp4Demuxer from "./mp4Demuxer.js"
import CanvasRenderer from "./canvasRenderer.js"

const mp4Demuxer = new Mp4Demuxer()
const videoProcessor = new VideoProcessor({
  mp4Demuxer
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
  })

  self.postMessage({ message: 'File processed', status: 'done' })
}