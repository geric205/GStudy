import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Brain, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Loader2,
  Shuffle,
  RotateCcw
} from 'lucide-react'
import { blink } from '../lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { toast } from 'react-hot-toast'
import type { PageType } from '../App'

interface Flashcard {
  id: string
  front: string
  back: string
  difficulty: string
  timesReviewed: number
  timesCorrect: number
}

interface Deck {
  id: string
  title: string
  description: string
  createdAt: string
}

interface FlashcardsPageProps {
  sourceId?: string
  sourceTitle?: string
  onNavigate: (page: PageType, sourceId?: string, sourceTitle?: string) => void
}

export function FlashcardsPage({ sourceId, sourceTitle, onNavigate }: FlashcardsPageProps) {
  const { user } = useBlinkAuth()
  const [decks, setDecks] = useState<Deck[]>([])
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  
  useEffect(() => {
    fetchDecks()
  }, [user?.id])
  
  useEffect(() => {
    if (selectedDeck) {
      fetchFlashcards(selectedDeck.id)
    }
  }, [selectedDeck])
  
  const fetchDecks = async () => {
    if (!user?.id) return
    try {
      const data = await blink.db.flashcardDecks.list({
        where: { userId: user.id, ...(sourceId && { sourceId }) },
        orderBy: { createdAt: 'desc' }
      })
      setDecks(data as Deck[])
    } catch (error) {
      console.error('Failed to fetch decks:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchFlashcards = async (deckId: string) => {
    try {
      const data = await blink.db.flashcards.list({
        where: { deckId },
        orderBy: { createdAt: 'desc' }
      })
      setFlashcards(data as Flashcard[])
    } catch (error) {
      console.error('Failed to fetch flashcards:', error)
    }
  }
  
  const generateFlashcards = async () => {
    if (!user?.id || !sourceId) {
      toast.error('Please select a source first')
      return
    }
    
    setIsGenerating(true)
    try {
      // Get source content
      const source = await blink.db.sources.get(sourceId)
      
      const prompt = `Generate 10 flashcards from this study material. Each flashcard should test understanding of key concepts.

Material: ${source?.content?.slice(0, 3000)}

Generate flashcards in JSON format:
{
  "flashcards": [
    {"front": "question 1", "back": "answer 1"},
    {"front": "question 2", "back": "answer 2"},
    ...
  ]
}`

      const { object } = await blink.ai.generateObject({
        model: 'google/gemini-3-flash',
        prompt,
        schema: {
          type: 'object',
          properties: {
            flashcards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  front: { type: 'string' },
                  back: { type: 'string' }
                },
                required: ['front', 'back']
              }
            }
          },
          required: ['flashcards']
        }
      })
      
      // Create deck
      const deckId = `deck_${Date.now()}`
      await blink.db.flashcardDecks.create({
        id: deckId,
        userId: user.id,
        sourceId,
        title: sourceTitle ? `Flashcards: ${sourceTitle}` : 'Study Flashcards',
        description: `Generated from ${sourceTitle || 'study material'}`
      })
      
      // Create flashcards
      if (object.flashcards && object.flashcards.length > 0) {
        for (const card of object.flashcards) {
          await blink.db.flashcards.create({
            id: `fc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deckId,
            front: card.front,
            back: card.back,
            difficulty: 'medium'
          })
        }
      }
      
      toast.success(`Created ${object.flashcards?.length || 0} flashcards!`)
      fetchDecks()
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('Failed to generate flashcards')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const deleteDeck = async (deckId: string) => {
    try {
      await blink.db.flashcardDecks.delete(deckId)
      toast.success('Deck deleted')
      fetchDecks()
      if (selectedDeck?.id === deckId) {
        setSelectedDeck(null)
        setFlashcards([])
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete deck')
    }
  }
  
  const handleCorrect = async () => {
    if (!flashcards[currentIndex]) return
    
    try {
      await blink.db.flashcards.update(flashcards[currentIndex].id, {
        timesReviewed: flashcards[currentIndex].timesReviewed + 1,
        timesCorrect: flashcards[currentIndex].timesCorrect + 1
      })
      
      nextCard()
    } catch (error) {
      console.error('Update failed:', error)
    }
  }
  
  const handleIncorrect = async () => {
    if (!flashcards[currentIndex]) return
    
    try {
      await blink.db.flashcards.update(flashcards[currentIndex].id, {
        timesReviewed: flashcards[currentIndex].timesReviewed + 1
      })
      
      nextCard()
    } catch (error) {
      console.error('Update failed:', error)
    }
  }
  
  const nextCard = () => {
    setIsFlipped(false)
    setShowAnswer(false)
    if (currentIndex < flashcards.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150)
    } else {
      setStudyMode(false)
      setCurrentIndex(0)
      toast.success('Study session complete!')
    }
  }
  
  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5)
    setFlashcards(shuffled)
    setCurrentIndex(0)
    setIsFlipped(false)
  }
  
  const startStudy = () => {
    setStudyMode(true)
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowAnswer(false)
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // Study Mode
  if (studyMode && flashcards.length > 0) {
    const currentCard = flashcards[currentIndex]
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStudyMode(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />Exit Study
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {flashcards.length}
            </span>
            <Button variant="outline" size="sm" onClick={shuffleCards}>
              <Shuffle className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-xl"
            >
              <Card 
                className="min-h-[400px] cursor-pointer hover:shadow-xl transition-all"
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-4">
                      {isFlipped ? 'Answer' : 'Question'}
                    </Badge>
                    <motion.div
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl font-semibold"
                    >
                      {isFlipped ? currentCard.back : currentCard.front}
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="flex justify-center gap-4">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={handleIncorrect}
            className="w-32 border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <X className="w-5 h-5 mr-2" />Incorrect
          </Button>
          <Button 
            size="lg" 
            onClick={handleCorrect}
            className="w-32 bg-green-600 hover:bg-green-700"
          >
            <Check className="w-5 h-5 mr-2" />Correct
          </Button>
        </div>
        
        <div className="flex justify-center gap-2">
          {flashcards.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i === currentIndex ? 'bg-primary' : 
                i < currentIndex ? 'bg-green-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => onNavigate('dashboard')} className="mb-4 px-0">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <h1 className="text-3xl font-bold">Flashcards</h1>
          <p className="text-muted-foreground">Create and study flashcards from your sources</p>
        </div>
        
        {sourceId && (
          <Button onClick={generateFlashcards} disabled={isGenerating} className="bg-gradient-to-r from-primary to-indigo-600">
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Generating...' : 'Generate Flashcards'}
          </Button>
        )}
      </div>
      
      {decks.length === 0 ? (
        <Card className="p-12 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No flashcards yet</h3>
          <p className="text-muted-foreground mb-4">
            {sourceId ? 'Click "Generate Flashcards" to create flashcards from your source' : 'Select a source to generate flashcards'}
          </p>
          {sourceId && (
            <Button onClick={generateFlashcards} disabled={isGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />Generate Flashcards
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck, index) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-all cursor-pointer group" onClick={() => setSelectedDeck(deck)}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <CardTitle className="text-lg">{deck.title}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteDeck(deck.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{deck.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Click to study</Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(deck.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Selected Deck View */}
      {selectedDeck && flashcards.length > 0 && !studyMode && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedDeck.title}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={shuffleCards}>
                  <Shuffle className="w-4 h-4 mr-2" />Shuffle
                </Button>
                <Button onClick={startStudy} className="bg-green-600 hover:bg-green-700">
                  <RotateCcw className="w-4 h-4 mr-2" />Start Study
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {flashcards.slice(0, 6).map((card, index) => (
                <div 
                  key={card.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedDeck(selectedDeck)
                    setCurrentIndex(index)
                    setIsFlipped(false)
                    setStudyMode(true)
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {card.timesCorrect > 0 ? `${Math.round((card.timesCorrect / card.timesReviewed) * 100)}% correct` : 'New'}
                    </span>
                  </div>
                  <p className="font-medium truncate">{card.front}</p>
                  <p className="text-sm text-muted-foreground truncate mt-1">{card.back}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
