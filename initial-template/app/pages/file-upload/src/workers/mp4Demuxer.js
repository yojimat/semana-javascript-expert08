import { createFile, DataStream } from '../deps/mp4box.0.5.2.js'

export default class Mp4Demuxer {
  #onConfig
  #onChunk
  #file

  /**
   * 
   * @param {ReadableStream} stream
   * @param {object} options
   * @param {(config: object) => void} options.onConfig
   * @param {function} options.onChunk
   * 
   * @returns {Promise<void>}
   */
  async run(stream, { onConfig, onChunk }) {
    this.#onChunk = onChunk
    this.#onConfig = onConfig
    this.#file = createFile()
    this.#file.onReady = this.#onReady.bind(this)
    this.#file.onSamples = this.#onSamples.bind(this)
    this.#file.onError = (e) => {
      console.error('Mp4Demuxer: Error reading file', e)
    }
    await this.#init(stream)
  }

  #description(trackId) {
    const track = this.#file.getTrackById(trackId)
    for (const entry of track.mdia.minf.stbl.stsd.entries) {
      const box = entry.avcC || entry.hvcC || entry.vpcC || entry.av1C
      if (box) {
        const stream = new DataStream(undefined, 0, DataStream.BIG_ENDIAN)
        box.write(stream)
        return new Uint8Array(stream.buffer, 8) // Remove the box header
      }
    }
    throw new Error('avcC/hvcC/vpcC/av1C box not found')
  }

  #onSamples(trackId, ref, samples) {
    // console.log('Mp4Demuxer: Samples ->', trackId, ref, samples)
    for (const sample of samples) {
      const encodedVideoChunk = new EncodedVideoChunk({
        data: sample.data,
        timestamp: 1e6 * sample.cts / sample.timescale,
        duration: 1e6 * sample.duration / sample.timescale,
        type: sample.is_sync ? 'key' : 'delta'
      })
      this.#onChunk(encodedVideoChunk)
    }
  }

  #onReady(info) {
    console.log('Mp4Demuxer: File memory buffer is ready ->', info)
    const [track] = info.videoTracks
    this.#onConfig({
      codec: track.codec,
      codedHeight: track.video.height,
      codedWidth: track.video.width,
      description: this.#description(track.id),
      durationSecs: info.duration / info.timescale,
    })
    this.#file.setExtractionOptions(track.id)
    this.#file.start()
  }

  /**
   * 
   * @param {ReadableStream} stream
   * 
   * @returns {Promise<void>}
   */
  async #init(stream) {
    let _offset = 0
    const consumeFile = new WritableStream({
      /** @param {Uint8Array} chunk */
      write: (chunk) => {
        const copy = chunk.buffer
        copy.fileStart = _offset
        this.#file.appendBuffer(copy)

        _offset += chunk.length
      },
      close: () => {
        console.log('Mp4Demuxer: Done writing to the file memory buffer')
        this.#file.flush()
      }
    })
    await stream.pipeTo(consumeFile)
  }
}