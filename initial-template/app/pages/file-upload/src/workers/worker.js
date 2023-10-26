import VideoProcessor from "./videoProcessor.js"
import { encoderConfigWebM } from "../configs/videoConfig.js"

const videoProcessor = new VideoProcessor()

onmessage = async ({ data }) => {
  const { file } = data
  console.log('File received from main script', file)

  await videoProcessor.start({ file, encoderConfig: encoderConfigWebM })

  // self is the global scope object that can be used both in the window and worker context.
  setTimeout(() => {
    self.postMessage({ message: 'File processed', status: 'done' })
  }, 5000)
}