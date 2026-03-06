import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  ClipboardCheck, 
  Sparkles, 
  Loader2, 
  Check, 
  X, 
  Trophy,
  RotateCcw,
  Brain
} from 'lucide-react'
import { blink } from '../lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group'
import { Label } from '../components/ui/label'
import { Progress } from '../components/ui/progress'
import { Badge } from '../components/ui/badge'
import { toast } from 'react-hot-toast'
import type { PageType } from '../App'

interface Quiz {
  id: string
  title: string
  questions: string
  score?: number
  completed: boolean
}

interface Question {
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
}

interface QuizPageProps {
  sourceId?: string
  sourceTitle?: string
  onNavigate: (page: PageType, sourceId?: string, sourceTitle?: string) => void
}

export function QuizPage({ sourceId, sourceTitle, onNavigate }: QuizPageProps) {
  const { user } = useBlinkAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState<number[]>([])
  const [quizComplete, setQuizComplete] = useState(false)
  
  useEffect(() => {
    fetchQuizzes()
  }, [user?.id])
  
  const fetchQuizzes = async () => {
    if (!user?.id) return
    try {
      const data = await blink.db.quizzes.list({
        where: { userId: user.id, ...(sourceId && { sourceId }) },
        orderBy: { createdAt: 'desc' }
      })
      setQuizzes(data as Quiz[])
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const generateQuiz = async () => {
    if (!user?.id || !sourceId) {
      toast.error('Please select a source first')
      return
    }
    
    setIsGenerating(true)
    try {
      const source = await blink.db.sources.get(sourceId)
      
      const prompt = `Generate a 5-question multiple choice quiz from this material. Each question should test understanding of key concepts.

Material: ${source?.content?.slice(0, 3000)}

Generate in JSON format:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ]
}`

      const { object } = await blink.ai.generateObject({
        model: 'google/gemini-3-flash',
        prompt,
        schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctAnswer: { type: 'number' },
                  explanation: { type: 'string' }
                },
                required: ['question', 'options', 'correctAnswer']
              }
            }
          },
          required: ['questions']
        }
      })
      
      const quizId = `quiz_${Date.now()}`
      await blink.db.quizzes.create({
        id: quizId,
        userId: user.id,
        sourceId,
        title: sourceTitle ? `Quiz: ${sourceTitle}` : 'Study Quiz',
        quizType: 'multiple_choice',
        questions: JSON.stringify(object.questions),
        completed: false
      })
      
      setQuestions(object.questions)
      setCurrentQuiz({ id: quizId, title: sourceTitle || 'Quiz', questions: JSON.stringify(object.questions), completed: false })
      setCurrentIndex(0)
      setAnswers([])
      setQuizComplete(false)
      setShowResult(false)
      
      toast.success('Quiz generated!')
      fetchQuizzes()
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('Failed to generate quiz')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const handleAnswer = (index: number) => {
    setSelectedAnswer(index)
    setShowResult(true)
    
    const newAnswers = [...answers, index]
    setAnswers(newAnswers)
    
    if (currentIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
        setSelectedAnswer(null)
        setShowResult(false)
      }, 1000)
    } else {
      // Quiz complete
      const score = newAnswers.filter((a, i) => a === questions[i].correctAnswer).length
      setQuizComplete(true)
      
      if (currentQuiz) {
        blink.db.quizzes.update(currentQuiz.id, {
          score,
          completed: true,
          completedAt: new Date().toISOString()
        })
      }
    }
  }
  
  const restartQuiz = () => {
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setAnswers([])
    setQuizComplete(false)
  }
  
  const getScore = () => {
    return answers.filter((a, i) => a === questions[i].correctAnswer).length
  }
  
  const getScorePercentage = () => {
    return Math.round((getScore() / questions.length) * 100)
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  // Quiz in progress
  if (currentQuiz && questions.length > 0 && !quizComplete) {
    const question = questions[currentIndex]
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setCurrentQuiz(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" />Exit Quiz
          </Button>
          <Badge variant="outline">
            Question {currentIndex + 1} of {questions.length}
          </Badge>
        </div>
        
        <Progress value={(currentIndex / questions.length) * 100} className="h-2" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{question.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedAnswer?.toString()} 
                  onValueChange={(v) => handleAnswer(parseInt(v))}
                  className="space-y-3"
                  disabled={showResult}
                >
                  {question.options.map((option, index) => {
                    const isCorrect = index === question.correctAnswer
                    const isSelected = selectedAnswer === index
                    
                    let variant = 'outline'
                    if (showResult) {
                      if (isCorrect) variant = 'default'
                      else if (isSelected) variant = 'destructive'
                    }
                    
                    return (
                      <div 
                        key={index}
                        className={`flex items-center space-x-2 p-4 rounded-lg border transition-all ${
                          showResult && isCorrect ? 'border-green-500 bg-green-500/10' :
                          showResult && isSelected && !isCorrect ? 'border-red-500 bg-red-500/10' :
                          'hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                        {showResult && isCorrect && <Check className="w-5 h-5 text-green-500" />}
                        {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-red-500" />}
                      </div>
                    )
                  })}
                </RadioGroup>
                
                {showResult && question.explanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-lg bg-muted"
                  >
                    <p className="text-sm font-medium mb-1">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{question.explanation}</p>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }
  
  // Quiz complete
  if (quizComplete) {
    const percentage = getScorePercentage()
    const isPassing = percentage >= 60
    
    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${
            isPassing ? 'bg-green-500/20' : 'bg-amber-500/20'
          }`}>
            <Trophy className={`w-12 h-12 ${isPassing ? 'text-green-500' : 'text-amber-500'}`} />
          </div>
          
          <h2 className="text-3xl font-bold mb-2">
            {isPassing ? 'Great Job!' : 'Keep Practicing!'}
          </h2>
          <p className="text-muted-foreground mb-6">
            You scored {getScore()} out of {questions.length} ({percentage}%)
          </p>
          
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => setCurrentQuiz(null)}>
              Back to Quizzes
            </Button>
            <Button onClick={restartQuiz}>
              <RotateCcw className="w-4 h-4 mr-2" />Try Again
            </Button>
          </div>
        </motion.div>
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
          <h1 className="text-3xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground">Test your knowledge with AI-generated quizzes</p>
        </div>
        
        {sourceId && (
          <Button onClick={generateQuiz} disabled={isGenerating} className="bg-gradient-to-r from-primary to-indigo-600">
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Generating...' : 'Generate Quiz'}
          </Button>
        )}
      </div>
      
      {quizzes.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
          <p className="text-muted-foreground mb-4">
            {sourceId ? 'Click "Generate Quiz" to create a quiz from your source' : 'Select a source to generate a quiz'}
          </p>
          {sourceId && (
            <Button onClick={generateQuiz} disabled={isGenerating}>
              <Sparkles className="w-4 h-4 mr-2" />Generate Quiz
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz, index) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => {
                setCurrentQuiz(quiz)
                setQuestions(JSON.parse(quiz.questions))
                setCurrentIndex(0)
                setAnswers([])
                setQuizComplete(false)
                setShowResult(false)
              }}>
                <CardHeader>
                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={quiz.completed ? 'default' : 'secondary'}>
                      {quiz.completed ? `Score: ${quiz.score}/5` : 'Not completed'}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(quiz.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
