import { useState } from 'react'
import { useModel } from './hooks/useModel'
import { SENTENCES } from './data/sentences'
import type { Sentence } from './types'
import LoadingScreen from './components/LoadingScreen'
import HomeScreen from './components/HomeScreen'
import MainScreen from './components/MainScreen'
import DocumentInput from './components/DocumentInput'

type Screen = 'home' | 'practice' | 'document-input' | 'document-practice'

export default function App() {
  const model = useModel()
  const [screen, setScreen] = useState<Screen>('home')
  const [docSentences, setDocSentences] = useState<Sentence[]>([])

  return (
    <div style={{ position: 'relative', height: '100%', maxWidth: 480, margin: '0 auto' }}>
      <LoadingScreen active={!model.ready} progress={model.progress} error={model.error} />

      {model.ready && screen === 'home' && (
        <HomeScreen
          onSelectPractice={() => setScreen('practice')}
          onSelectDocument={() => setScreen('document-input')}
        />
      )}

      {model.ready && screen === 'practice' && (
        <MainScreen
          sentences={SENTENCES}
          navStyle="dots"
          runInference={model.runInference}
          onExit={() => setScreen('home')}
        />
      )}

      {model.ready && screen === 'document-input' && (
        <DocumentInput
          onStart={(sentences) => {
            setDocSentences(sentences)
            setScreen('document-practice')
          }}
          onBack={() => setScreen('home')}
        />
      )}

      {model.ready && screen === 'document-practice' && (
        <MainScreen
          sentences={docSentences}
          navStyle="counter"
          runInference={model.runInference}
          onExit={() => setScreen('home')}
        />
      )}
    </div>
  )
}
