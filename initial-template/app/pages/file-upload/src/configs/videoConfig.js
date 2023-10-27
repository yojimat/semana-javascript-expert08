const qVGAConstraints = {
  width: 320,
  height: 240,
}
const vgaConstraints = {
  width: 640,
  height: 480,
}
const hdConstraints = {
  width: 1280,
  height: 720,
}

const commonEncoderConfig = {
  ...qVGAConstraints,
  bitrate: 10e6,
}

const encoderConfigWebM = {
  ...commonEncoderConfig,
  codec: 'vp09.00.10.08',
  pt: 4,
  hardwareAcceleration: 'prefer-software',
}

const encoderConfigMP4 = {
  ...commonEncoderConfig,
  codec: 'avc1.42002A',
  pt: 1,
  hardwareAcceleration: 'prefer-hardware',
  avc: { format: 'annexb' },
}

const webmWriterConfig = {
  ...encoderConfigWebM,
  codec: 'VP9'
}

export {
  encoderConfigMP4,
  encoderConfigWebM,
  webmWriterConfig 
}