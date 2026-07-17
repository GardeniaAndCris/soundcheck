import type { DialogueScenario } from '../types'

export const CONVERSATIONS: DialogueScenario[] = [
  {
    id: 'coffee-shop',
    title: '在咖啡店点单',
    description: '情景对话 · 4 轮问答',
    startNodeId: 'ai-greet',
    nodes: {
      'ai-greet': {
        id: 'ai-greet',
        speaker: 'ai',
        text: 'Hi there, what can I get started for you today?',
        translation: '你好，今天想点些什么？',
        next: 'user-order',
      },
      'user-order': {
        id: 'user-order',
        speaker: 'user',
        choices: [
          {
            id: 'order-coffee',
            text: "I'd like a coffee, please",
            translation: '我想要一杯咖啡',
            words: ['I', 'd', 'like', 'a', 'coffee', 'please'],
            tips: {
              I:      ['发音准确', '/aɪ/ 双元音清晰'],
              d:      ['弱读 /d/', "I'd 连读，/aɪd/"],
              like:   ['/laɪk/ — 注意 /k/ 收尾', '不要吞掉尾音'],
              a:      ['弱读 /ə/', '不需要发重音'],
              coffee: ['/ˈkɔːfi/ — 重音在前', '/f/ 不要发成 /p/'],
              please: ['/pliːz/ — 尾音 /z/', '不要发成 /s/'],
            },
            next: 'ai-size',
          },
          {
            id: 'order-latte',
            text: 'Can I get a latte?',
            translation: '可以给我一杯拿铁吗？',
            words: ['Can', 'I', 'get', 'a', 'latte'],
            tips: {
              Can:   ['弱读 /kən/', '句中不重读'],
              I:     ['发音准确', '/aɪ/ 双元音清晰'],
              get:   ['/ɡɛt/ — 爆破音 /ɡ/', '尾音 /t/ 轻读'],
              a:     ['弱读 /ə/', '不需要发重音'],
              latte: ['/ˈlɑːteɪ/ — 三音节', '重音在第一音节'],
            },
            next: 'ai-size',
          },
        ],
      },
      'ai-size': {
        id: 'ai-size',
        speaker: 'ai',
        text: 'Sure. What size would you like?',
        translation: '好的，您要什么尺寸？',
        next: 'user-size',
      },
      'user-size': {
        id: 'user-size',
        speaker: 'user',
        choices: [
          {
            id: 'size-medium',
            text: 'Medium, please',
            translation: '中杯，谢谢',
            words: ['Medium', 'please'],
            tips: {
              Medium: ['/ˈmiːdiəm/ — 三音节', '重音在第一音节'],
              please: ['/pliːz/ — 尾音 /z/', '不要发成 /s/'],
            },
            next: 'ai-name',
          },
          {
            id: 'size-large',
            text: 'Large, please',
            translation: '大杯，谢谢',
            words: ['Large', 'please'],
            tips: {
              Large:  ['/lɑːrdʒ/ — 卷舌元音', '尾音 /dʒ/ 清晰'],
              please: ['/pliːz/ — 尾音 /z/', '不要发成 /s/'],
            },
            next: 'ai-name',
          },
        ],
      },
      'ai-name': {
        id: 'ai-name',
        speaker: 'ai',
        text: 'Can I get a name for the order?',
        translation: '请问怎么称呼您？',
        next: 'user-name',
      },
      'user-name': {
        id: 'user-name',
        speaker: 'user',
        choices: [
          {
            id: 'name-alex',
            text: "It's Alex",
            translation: '我叫 Alex',
            words: ['It', 's', 'Alex'],
            tips: {
              It:   ['发音准确', '/ɪt/ 短元音'],
              s:    ['弱读 /z/', "It's 连读，/ɪts/"],
              Alex: ['/ˈæleks/ — 重音在前', '/æ/ 嘴巴张大'],
            },
            next: 'ai-thanks',
          },
          {
            id: 'name-sam',
            text: 'My name is Sam',
            translation: '我叫 Sam',
            words: ['My', 'name', 'is', 'Sam'],
            tips: {
              My:   ['/maɪ/ — 双元音清晰', '不要发成 /me/'],
              name: ['/neɪm/ — 双元音 /eɪ/', '尾音 /m/ 闭唇'],
              is:   ['弱读 /ɪz/', '不需要重读'],
              Sam:  ['/sæm/ — /æ/ 嘴巴张大', '尾音 /m/ 闭唇'],
            },
            next: 'ai-thanks',
          },
        ],
      },
      'ai-thanks': {
        id: 'ai-thanks',
        speaker: 'ai',
        text: "Great, that'll be ready in about five minutes.",
        translation: '好的，大约五分钟后就好。',
        next: 'user-end',
      },
      'user-end': {
        id: 'user-end',
        speaker: 'user',
        choices: [
          {
            id: 'end-thanks',
            text: 'Thank you so much',
            translation: '非常感谢',
            words: ['Thank', 'you', 'so', 'much'],
            tips: {
              Thank: ['/θæŋk/ — 注意 /θ/', '舌尖轻触上齿，不是 /s/'],
              you:   ['/juː/ — 元音饱满', '不要弱化'],
              so:    ['/soʊ/ — 双元音清晰', '发音准确'],
              much:  ['/mʌtʃ/ — 注意 /tʃ/', '气流要有爆破感'],
            },
          },
          {
            id: 'end-day',
            text: 'Thanks, have a good day',
            translation: '谢谢，祝你今天愉快',
            words: ['Thanks', 'have', 'a', 'good', 'day'],
            tips: {
              Thanks: ['/θæŋks/ — 注意 /θ/', '舌尖轻触上齿，不是 /s/'],
              have:   ['/hæv/ — 尾音 /v/', '不要发成 /f/'],
              a:      ['弱读 /ə/', '不需要发重音'],
              good:   ['/ɡʊd/ — 元音偏短', '不要拉长'],
              day:    ['/deɪ/ — 双元音清晰', '发音准确'],
            },
          },
        ],
      },
    },
  },
]
