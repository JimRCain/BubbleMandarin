/**
 * Audio Sprite Manifest
 * 
 * If the browser's TTS pronounces certain Hanzi poorly, add an entry here
 * and place a compressed mono MP3/OGG file at `public/audio/zh_sprites.mp3`
 * (or .ogg) containing concatenated clips.
 * 
 * Format: { [hanzi]: { start: number, end: number } }
 * Times are in seconds from the start of the audio file.
 * 
 * This file must be under 300KB. Recommended: 64kbps mono, 22050Hz.
 * 
 * If this map is empty or the audio file is missing, the game falls back
 * to the SpeechSynthesis API for every word.
 */
export const audioSpriteManifest: Record<string, { start: number; end: number }> = {
  // Example – fill in words that TTS struggles with:
  // "你好": { start: 0.0, end: 0.8 },
};

export const AUDIO_SPRITE_PATH = '/audio/zh_sprites.mp3';