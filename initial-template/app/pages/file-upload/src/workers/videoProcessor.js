export default class VideoProcessor {
  #mp4Demuxer

  /**
   * 
   * @param {object} options
   * @param {import('./mp4Demuxer.js').default} options.mp4Demuxer
   */
  constructor({ mp4Demuxer }) {
    this.#mp4Demuxer = mp4Demuxer
  }

  /** @returns {ReadableStream} */
  mp4Decoder(encoderConfig, stream) {
    return new ReadableStream({
      start: async (controller) => {
        const decoder = new VideoDecoder({
          /** @param {VideoFrame} frame */
          output(frame) {
            // console.log('VideoDecoder: Frame ->', frame)
            controller.enqueue(frame)
          },
          error(e) {
            console.error('VideoDecoder: Error ->', e)
            controller.error(e)
          }
        })

        await this.#mp4Demuxer.run(stream, {
          /** @param {EncodedVideoChunk} chunk */
          onChunk(chunk) {
            // console.log('VideoProcessor: Chunk ->', chunk)
            decoder.decode(chunk)
          },
          onConfig(config) {
            // console.log('VideoProcessor: Config ->', config)
            decoder.configure(config)
          }
        }).then(() => {
          setTimeout(() => {
            controller.close()
          }, 2000)
        })
      }
    })
  }

  async start({ file, encoderConfig, renderFrame }) {
    const stream = file.stream()
    // const fileName = file.name.split('/').pop().replace('.mp4', '')
    await this.mp4Decoder(encoderConfig, stream).pipeTo(new WritableStream({
      write(frame) {
        // console.log('VideoProcessor WritableStream: Frame ->', frame)
        renderFrame(frame)
      }
    }))
  }
}