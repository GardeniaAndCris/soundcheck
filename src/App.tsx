import { useState } from 'react'
import { useModel } from './hooks/useModel'
import { SENTENCES } from './data/sentences'
import { CONVERSATIONS } from './data/conversations'
import type { Sentence } from './types'
import LoadingScreen from './components/LoadingScreen'
import HomeScreen from './components/HomeScreen'
import MainScreen from './components/MainScreen'
import DocumentInput from './components/DocumentInput'
import ConversationMenu from './components/ConversationMenu'
import ConversationScreen from './components/ConversationScreen'

type Screen = 'home' | 'practice' | 'document-input' | 'document-practice' | 'conversation-menu' | 'conversation-practice'

export default function App() {
  const model = useModel()
  const [screen, setScreen] = useState<Screen>('home')
  const [docSentences, setDocSentences] = useState<Sentence[]>([])
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null)

  return (
    <div style={{ position: 'relative', height: '100%', maxWidth: 480, margin: '0 auto' }}>
      <LoadingScreen active={!model.ready} progress={model.progress} error={model.error} />

      {model.ready && screen === 'home' && (
        <HomeScreen
          onSelectPractice={() => setScreen('practice')}
          onSelectDocument={() => setScreen('document-input')}
          onSelectConversation={() => setScreen('conversation-menu')}
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

      {model.ready && screen === 'conversation-menu' && (
        <ConversationMenu
          scenarios={CONVERSATIONS}
          onStart={(scenarioId) => {
            setActiveScenarioId(scenarioId)
            setScreen('conversation-practice')
          }}
          onBack={() => setScreen('home')}
        />
      )}

      {model.ready && screen === 'conversation-practice' && activeScenarioId && (
        <ConversationScreen
          scenario={CONVERSATIONS.find((s) => s.id === activeScenarioId)!}
          runInference={model.runInference}
          onExit={() => setScreen('conversation-menu')}
        />
      )}
    </div>
  )
}
