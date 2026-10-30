/**
 * Utility to generate lightweight, valid audio Data URLs (WAV format) in pure TypeScript.
 * Allows sample lessons to have real, playable audio/mp3 videoaulas out-of-the-box
 * without needing external large binary asset downloads.
 */

export function generateSampleAudioDataUrl(
  title: string,
  durationSeconds: number = 6
): string {
  const sampleRate = 22050;
  const numChannels = 1;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings to DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF Chunk
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt Sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // data Sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Synthesize pleasant ambient educational tones (chords: C major, G, A minor)
  const baseFrequencies = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
  let offset = 44;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Harmonic pleasant soft chords
    const chordIndex = Math.floor((t / (durationSeconds / 4))) % 4;
    const freq = baseFrequencies[chordIndex];
    
    // Envelope: smooth fade-in and gentle decay
    const envelope = Math.sin((Math.PI * i) / numSamples);
    
    // Wave synthesis: gentle sine wave with soft harmonic
    const sampleVal = 
      Math.sin(2 * Math.PI * freq * t) * 0.7 +
      Math.sin(2 * Math.PI * freq * 2 * t) * 0.2 +
      Math.sin(2 * Math.PI * 440 * t) * 0.1;
      
    const sampleInt16 = Math.max(-32768, Math.min(32767, Math.floor(sampleVal * envelope * 24000)));
    view.setInt16(offset, sampleInt16, true);
    offset += 2;
  }

  // Convert buffer to Base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return `data:audio/wav;base64,${base64}`;
}
