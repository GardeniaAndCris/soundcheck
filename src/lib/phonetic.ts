// Phase 1: hardcoded IPA for current sentence words.
// Phase 2 (document mode): swap implementation to query local dictionary JSON.
const PHONETICS: Record<string, string> = {
  // She sells seashells by the seashore
  she:       '/ʃiː/',
  sells:     '/sɛlz/',
  seashells: '/ˈsiːʃɛlz/',
  by:        '/baɪ/',
  the:       '/ðə/',
  seashore:  '/ˈsiːʃɔːr/',
  // How much wood could a woodchuck chuck
  how:       '/haʊ/',
  much:      '/mʌtʃ/',
  wood:      '/wʊd/',
  could:     '/kʊd/',
  a:         '/ə/',
  woodchuck: '/ˈwʊdtʃʌk/',
  chuck:     '/tʃʌk/',
  // The early bird catches the worm
  early:     '/ˈɜːrli/',
  bird:      '/bɜːrd/',
  catches:   '/ˈkætʃɪz/',
  worm:      '/wɜːrm/',
}

export function getPhonetic(word: string): string {
  return PHONETICS[word.toLowerCase()] ?? '—'
}

export function speakWord(word: string): void {
  const utt = new SpeechSynthesisUtterance(word)
  utt.lang = 'en-US'
  utt.rate = 0.8
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utt)
}
