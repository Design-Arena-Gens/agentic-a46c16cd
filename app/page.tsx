'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)
  const conversationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = false
        recognitionRef.current.interimResults = false
        recognitionRef.current.lang = 'en-US'

        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript
          setIsListening(false)
          setStatus('Processing...')

          const userMessage: Message = { role: 'user', content: transcript }
          setMessages(prev => [...prev, userMessage])

          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [...messages, userMessage] })
            })

            if (!response.ok) throw new Error('Failed to get response')

            const data = await response.json()
            const assistantMessage: Message = { role: 'assistant', content: data.message }
            setMessages(prev => [...prev, assistantMessage])

            setStatus('')
            speak(data.message)
          } catch (err) {
            setError('Failed to process your request. Please try again.')
            setStatus('')
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          setError(`Speech recognition error: ${event.error}`)
          setIsListening(false)
          setStatus('')
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      } else {
        setError('Speech recognition is not supported in your browser.')
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [messages])

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight
    }
  }, [messages])

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.95
      utterance.pitch = 1
      utterance.volume = 1

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    }
  }

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not available.')
      return
    }

    setError('')
    setIsListening(true)
    setStatus('Listening...')

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }

    try {
      recognitionRef.current.start()
    } catch (err) {
      setError('Could not start speech recognition. Please try again.')
      setIsListening(false)
      setStatus('')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setStatus('')
  }

  const clearConversation = () => {
    setMessages([])
    setError('')
    setStatus('')
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  return (
    <div className="container">
      <main className="main">
        <div className="header">
          <h1 className="title">Voice Assistant</h1>
          <p className="subtitle">Speak naturally, get clear answers</p>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="conversation" ref={conversationRef}>
          {messages.length === 0 ? (
            <div className="empty-state">
              Press the microphone button and start speaking
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-label">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                <div>{msg.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="controls">
          <button
            className={`mic-button ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking || status === 'Processing...'}
          >
            {isListening ? '⏹' : '🎤'}
          </button>
          <button className="clear-button" onClick={clearConversation}>
            Clear
          </button>
        </div>

        <div className={`status ${isListening ? 'listening' : ''} ${status === 'Processing...' ? 'processing' : ''}`}>
          {status || (isSpeaking ? 'Speaking...' : '\u00A0')}
        </div>
      </main>
    </div>
  )
}
