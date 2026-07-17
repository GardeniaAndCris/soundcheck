import type { Sentence } from '../types'

export const SENTENCES: Sentence[] = [
  {
    text: 'She sells seashells by the seashore',
    translation: '她在海边卖贝壳',
    lesson: '连读与辅音',
    words: ['She', 'sells', 'seashells', 'by', 'the', 'seashore'],
    tips: {
      She:       ['发音准确', '/ʃiː/ — 气流稳定'],
      sells:     ['/sɛlz/ — 注意 /s/ 起始', '不要发成 /z/ 开头'],
      seashells: ['/ˈsiːʃɛlz/ — 三音节', '/ʃ/ 与 /s/ 很相近，容易混淆'],
      by:        ['发音准确', '/baɪ/ 双元音清晰'],
      the:       ['弱读 /ðə/', '辅音 /ð/ 舌尖轻触上齿'],
      seashore:  ['/ˈsiːʃɔːr/ — 注意 /ʃ/', '尾音 /r/ 轻卷舌'],
    },
  },
  {
    text: 'How much wood could a woodchuck chuck',
    translation: '一只土拨鼠能拱多少木头',
    lesson: '爆破音练习',
    words: ['How', 'much', 'wood', 'could', 'a', 'woodchuck', 'chuck'],
    tips: {
      How:       ['发音准确', '/haʊ/ — 元音饱满'],
      much:      ['/mʌtʃ/ — 注意 /tʃ/', '气流要有爆破感'],
      wood:      ['发音准确', '/wʊd/ — 元音偏短'],
      could:     ['/kʊd/ — 尾音 /d/ 轻读', '不要省略'],
      a:         ['弱读 /ə/', '不需要发重音'],
      woodchuck: ['/ˈwʊdtʃʌk/ — 两个爆破音', '中间 /tʃ/ 不要吞掉'],
      chuck:     ['/tʃʌk/ — 爆破清晰', '气流有力'],
    },
  },
  {
    text: 'The early bird catches the worm',
    translation: '早起的鸟儿有虫吃',
    lesson: 'th 音与卷舌',
    words: ['The', 'early', 'bird', 'catches', 'the', 'worm'],
    tips: {
      The:     ['弱读 /ðə/', '/ð/ 舌尖轻触上齿'],
      early:   ['/ˈɜːrli/ — 注意 /ɜː/', '中式英语常发成 /ɑː/，需纠正'],
      bird:    ['/bɜːrd/ — 卷舌元音', '/r/ 要轻轻卷舌'],
      catches: ['/ˈkætʃɪz/ — 三音节', '/tʃ/ 爆破后要有 /ɪz/'],
      the:     ['弱读 /ðə/', '辅音 /ð/ 轻读'],
      worm:    ['/wɜːrm/ — 卷舌元音', '和 bird 元音相同：/ɜː/'],
    },
  },
]
