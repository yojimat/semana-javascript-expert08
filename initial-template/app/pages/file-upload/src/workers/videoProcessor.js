export default class VideoProcessor {
  #mp4Demuxer
  #webmWriter
  #buffers = []
  #service

  /**
   * 
   * @param {object} options
   * @param {import('./mp4Demuxer.js').default} options.mp4Demuxer
   * @param {import('../deps/webm-writer2.js').default} options.webmWriter
   */
  constructor({ mp4Demuxer, webmWriter, service }) {
    this.#mp4Demuxer = mp4Demuxer
    this.#webmWriter = webmWriter
    this.#service = service
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
          async onConfig(config) {
            // console.log('VideoProcessor: Config ->', config)
            const { supported } = await VideoDecoder.isConfigSupported(config)
            if (!supported) {
              console.error('VideoProcessor: Config not supported ->', config)
              controller.close()
              return
            }
            decoder.configure(config)
          }
        })
      }
    })
  }

  encode144p(encoderConfig) {
    let _encoder;

    const readable = new ReadableStream({
      start: async (controller) => {
        const { supported } = await VideoDecoder.isConfigSupported(encoderConfig)
        if (!supported) {
          const message = 'VideoProcessor encode144p: Config not supported ->' + encoderConfig
          console.error(message)
          controller.error(message)
          return
        }
        _encoder = new VideoEncoder({
          /**
           * 
           * @param {EncodedVideoChunk} frame 
           * @param {EncodedVideoChunkMetadata} config 
           */
          output: (frame, config) => {
            // console.log("encode144p:", chunk)
            if (config.decoderConfig) {
              const decoderConfig = {
                type: 'config',
                config: config.decoderConfig
              }
              controller.enqueue(decoderConfig)
            }
            controller.enqueue(frame)
          },
          error: (e) => {
            console.error('VideoProcessor encode144p: Error ->', e)
            controller.error(e)
          }
        })

        _encoder.configure(encoderConfig)
      }
    })

    const writable = new WritableStream({
      write(frame) {
        _encoder.encode(frame)
        frame.close()
      }
    })

    return {
      writable,
      readable
    }
  }

  renderDecodedFramesAndGetEncodedChunks(renderFrame) {
    let _decoder;
    return new TransformStream({
      start: (controller) => {
        _decoder = new VideoDecoder({
          output(frame) {
            renderFrame(frame)
          },
          error(e) {
            console.error('VideoProcessor renderDecodedFramesAndGetEncodedChunks: Error ->', e)
            controller.error(e)
          }
        })
      },
      /**
       * 
       * @param {EncodedVideoChunk} encodedChunk 
       * @param {TransformStreamDefaultController} controller 
       */
      async transform(encodedChunk, controller) {
        if (encodedChunk.type === 'config') {
          await _decoder.configure(encodedChunk.config)
          return
        }
        _decoder.decode(encodedChunk)

        // Need the encoded version to use WebM
        controller.enqueue(encodedChunk)
      }
    })
  }

  transformIntoWebM() {
    const writable = new WritableStream({
      write: (chunk) => {
        // console.log('VideoProcessor transformIntoWebM: Chunk ->', chunk)
        this.#webmWriter.addFrame(chunk)
      },
      close() { }
    })

    return {
      readable: this.#webmWriter.getStream(),
      writable
    }
  }

  upload(fileName, resolution, type) {
    // console.log('Video Processor upload: ', fileName, resolution, type)
    let chunks = []
    let byteCount = 0
    let segmentCount = 0

    const triggerUpload = async chunks => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      // console.log('Video Processor local fn triggerUpload: ', blob)

      await this.#service.uploadFile({
        fileName: `${fileName}-${resolution}.${++segmentCount}.${type}`,
        fileBuffer: blob
      })

      // This will remove all elements from the chunks array
      chunks.lengths = 0
      byteCount = 0
    }

    return new WritableStream({
      /**
       * 
       * @param {object} options 
       * @param {Uint8Array} options.data
       */
      write: async ({ data }) => {
        chunks.push(data)
        // console.log('Video Processor upload write: ', data)
        if (byteCount < 10e6) return
        await triggerUpload(chunks)
      },
      close: async () => {
        // console.log('Video Processor upload close: ')
        if (!chunks.length) return
        await triggerUpload(chunks)
      }
    })
  }

  async start({ file, encoderConfig, renderFrame, sendMessage }) {
    const stream = file.stream()
    const fileName = file.name.split('/').pop().replace('.mp4', '')
    await this.mp4Decoder(encoderConfig, stream)
      .pipeThrough(this.encode144p(encoderConfig))
      .pipeThrough(this.renderDecodedFramesAndGetEncodedChunks(renderFrame))
      .pipeThrough(this.transformIntoWebM())
      // .pipeThrough(new TransformStream({
      //   transform: ({ data, position }, controller) => {
      //     this.#buffers.push(data)
      //     controller.enqueue(data)
      //   },
      //   flush: () => {
      //     sendMessage({
      //       status: 'done',
      //       // buffers: this.#buffers,
      //       message: "File processed",
      //       // fileName: fileName.concat('-144p.webm')
      //     })
      //   }
      // }))
      .pipeTo(this.upload(fileName, '144p', 'webm'))
    // .pipeTo(new WritableStream({
    //   write: (frame) => {
    // console.log('VideoProcessor WritableStream: Frame ->', frame)
    // renderFrame(frame)
    //   }
    // }))
    sendMessage({status: 'done', message: "File processed"})
  }
}