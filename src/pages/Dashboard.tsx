import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Youtube, 
  Globe, 
  Upload, 
  File,
  Trash2,
  MoreVertical,
  Brain,
  Headphones,
  MessageSquare,
  ClipboardCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  FileUp
} from 'lucide-react'
import { blink } from '../lib/blink'
import { useBlinkAuth } from '@blinkdotnew/react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
} from '../components/ui/dialog'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { toast } from 'react-hot-toast'
import type { PageType } from '../App'

interface Source {
  id: string
  title: string
  sourceType: string
  status: string
  createdAt: string
  fileUrl?: string
  youtubeUrl?: string
  websiteUrl?: string
}

interface DashboardProps {
  onNavigate: (page: PageType, sourceId?: string, sourceTitle?: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useBlinkAuth()
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadType, setUploadType] = useState<'pdf' | 'youtube' | 'website'>('pdf')
  const [uploadUrl, setUploadUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  
  useEffect(() => {
    if (user?.id) {
      fetchSources()
    }
  }, [user?.id])
  
  const fetchSources = async () => {
    if (!user?.id) return
    try {
      const data = await blink.db.sources.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        limit: 20
      })
      setSources(data as Source[])
    } catch (error) {
      console.error('Failed to fetch sources:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleFileUpload = async () => {
    if (!file || !user?.id) return
    setIsUploading(true)
    try {
      const { publicUrl } = await blink.storage.upload(
        file,
        `sources/${user.id}/${Date.now()}.${file.name.split('.').pop()}`
      )
      await blink.db.sources.create({
        id: `src_${Date.now()}`,
        userId: user.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        sourceType: 'pdf',
        content: 'Click to analyze with AI',
        fileUrl: publicUrl,
        status: 'ready'
      })
      toast.success('Source uploaded successfully!')
      setUploadDialogOpen(false)
      setFile(null)
      setUploadUrl('')
      fetchSources()
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to upload source')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleUrlUpload = async () => {
    if (!uploadUrl || !user?.id) return
    setIsUploading(true)
    try {
      const title = uploadType === 'youtube' 
        ? `YouTube: ${uploadUrl.split('v=')[1]?.split('&')[0] || 'Video'}`
        : new URL(uploadUrl).hostname
      
      await blink.db.sources.create({
        id: `src_${Date.now()}`,
        userId: user.id,
        title,
        sourceType: uploadType,
        content: 'Click to analyze with AI',
        youtubeUrl: uploadType === 'youtube' ? uploadUrl : undefined,
        websiteUrl: uploadType === 'website' ? uploadUrl : undefined,
        status: 'ready'
      })
      toast.success('Source added successfully!')
      setUploadDialogOpen(false)
      setUploadUrl('')
      fetchSources()
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error('Failed to add source')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleDeleteSource = async (sourceId: string) => {
    try {
      await blink.db.sources.delete(sourceId)
      toast.success('Source deleted')
      fetchSources()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Failed to delete source')
    }
  }
  
  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'pdf': return FileText
      case 'youtube': return Youtube
      case 'website': return Globe
      default: return File
    }
  }
  
  const stats = [
    { label: 'Total Sources', value: sources.length, icon: FileText },
    { label: 'Flashcards', value: sources.length * 3, icon: Brain },
    { label: 'Study Hours', value: Math.floor(sources.length * 1.5), icon: Headphones },
  ]
  
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-1">
            Welcome back, {user?.displayName?.split(' ')[0] || 'Student'}!
          </h2>
          <p className="text-muted-foreground">Ready to supercharge your studies?</p>
        </div>
        
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-to-r from-primary to-indigo-600 hover:shadow-lg hover:shadow-primary/25">
              <Upload className="w-5 h-5 mr-2" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Source</DialogTitle>
              <DialogDescription>Upload a document or add a URL</DialogDescription>
            </DialogHeader>
            
            <Tabs value={uploadType} onValueChange={(v) => setUploadType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />PDF
                </TabsTrigger>
                <TabsTrigger value="youtube" className="flex items-center gap-2">
                  <Youtube className="w-4 h-4" />YouTube
                </TabsTrigger>
                <TabsTrigger value="website" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />Website
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="pdf" className="space-y-4 mt-4">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-10 h-10 text-primary" />
                        <span className="font-medium">{file.name}</span>
                        <span className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <FileUp className="w-10 h-10 text-muted-foreground" />
                        <span className="font-medium">Click to upload PDF</span>
                      </div>
                    )}
                  </label>
                </div>
                <Button onClick={handleFileUpload} disabled={!file || isUploading} className="w-full">
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isUploading ? 'Processing...' : 'Upload & Analyze'}
                </Button>
              </TabsContent>
              
              <TabsContent value="youtube" className="space-y-4 mt-4">
                <Input placeholder="Paste YouTube URL..." value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
                <Button onClick={handleUrlUpload} disabled={!uploadUrl || isUploading} className="w-full">
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isUploading ? 'Processing...' : 'Add Video'}
                </Button>
              </TabsContent>
              
              <TabsContent value="website" className="space-y-4 mt-4">
                <Input placeholder="Paste website URL..." value={uploadUrl} onChange={(e) => setUploadUrl(e.target.value)} />
                <Button onClick={handleUrlUpload} disabled={!uploadUrl || isUploading} className="w-full">
                  {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isUploading ? 'Processing...' : 'Add Website'}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Brain, label: 'Generate Notes', page: 'source', color: 'bg-blue-500/10 text-blue-500' },
            { icon: Headphones, label: 'Audio Overview', page: 'audio', color: 'bg-purple-500/10 text-purple-500' },
            { icon: MessageSquare, label: 'Ask Questions', page: 'chat', color: 'bg-green-500/10 text-green-500' },
            { icon: ClipboardCheck, label: 'Take Quiz', page: 'quiz', color: 'bg-amber-500/10 text-amber-500' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => sources.length > 0 && onNavigate(action.page as PageType, sources[0].id, sources[0].title)}
              disabled={sources.length === 0}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border hover:shadow-md hover:border-primary/20 transition-all disabled:opacity-50"
            >
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Sources</h3>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('source')}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sources.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No sources yet</h3>
            <p className="text-muted-foreground mb-4">Upload your first document to get started</p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Add Your First Source
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sources.slice(0, 5).map((source, index) => {
              const Icon = getSourceIcon(source.sourceType)
              return (
                <motion.div key={source.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="hover:shadow-md transition-all cursor-pointer group" onClick={() => onNavigate('source', source.id, source.title)}>
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        source.sourceType === 'youtube' ? 'bg-red-500/10 text-red-500' :
                        source.sourceType === 'website' ? 'bg-green-500/10 text-green-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{source.title}</p>
                        <p className="text-sm text-muted-foreground">{new Date(source.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="secondary" className="capitalize">{source.status}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onNavigate('source', source.id, source.title)}>Open</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onNavigate('flashcards', source.id, source.title)}>Generate Flashcards</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onNavigate('chat', source.id, source.title)}>Chat with Source</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteSource(source.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
