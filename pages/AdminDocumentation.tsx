import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Search, BookOpen, Menu, X } from 'lucide-react';
import { adminDocumentation, searchDocumentation } from '../config/adminDocumentation';
import ReactMarkdown from 'react-markdown';

export default function AdminDocumentation() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string | null>(
    searchParams.get('module') || (adminDocumentation[0]?.id || null)
  );
  const [selectedTopic, setSelectedTopic] = useState<string | null>(
    searchParams.get('topic') || null
  );
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(searchDocumentation(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedModule) params.set('module', selectedModule);
    if (selectedTopic) params.set('topic', selectedTopic);
    setSearchParams(params);
  }, [selectedModule, selectedTopic, setSearchParams]);

  const currentModule = adminDocumentation.find(m => m.id === selectedModule);
  const currentTopic = currentModule?.subsections.find(t => t.id === selectedTopic);

  const handleModuleSelect = (moduleId: string) => {
    setSelectedModule(moduleId);
    setSelectedTopic(null);
    setMobileMenuOpen(false);
  };

  const handleTopicSelect = (topicId: string) => {
    setSelectedTopic(topicId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-2 p-4 md:p-6 border-b">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl md:text-2xl font-bold">Admin Documentation</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden flex items-center gap-2 p-2 hover:bg-muted rounded-lg"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="text-sm font-medium">Menu</span>
        </button>

        {/* Sidebar */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block md:w-64 flex-shrink-0`}>
          <Card className="sticky top-20">
            <CardHeader className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search docs..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {searchResults.length > 0 ? (
                <div className="space-y-0 max-h-96 overflow-y-auto">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleModuleSelect(result.module.id);
                        handleTopicSelect(result.subsection.id);
                      }}
                      className="w-full text-left p-3 hover:bg-muted border-b last:border-b-0 transition-colors"
                    >
                      <p className="text-xs font-semibold text-muted-foreground">
                        {result.module.title}
                      </p>
                      <p className="text-sm font-medium">{result.subsection.title}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-0">
                  {adminDocumentation.map((module) => (
                    <div key={module.id}>
                      <button
                        onClick={() => handleModuleSelect(module.id)}
                        className={`w-full text-left px-4 py-3 font-semibold transition-colors ${
                          selectedModule === module.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {module.title}
                      </button>
                      {selectedModule === module.id && (
                        <div className="bg-muted/50">
                          {module.subsections.map((subsection) => (
                            <button
                              key={subsection.id}
                              onClick={() => handleTopicSelect(subsection.id)}
                              className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                                selectedTopic === subsection.id
                                  ? 'bg-primary/20 text-primary font-semibold'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              {subsection.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {searchQuery && searchResults.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="mt-4"
                >
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : currentTopic ? (
            <>
              <div className="mb-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-muted-foreground">{currentModule?.title}</p>
                  <h2 className="text-2xl md:text-3xl font-bold">{currentTopic.title}</h2>
                </div>
              </div>

              <Card>
                <CardContent className="p-6 md:p-8">
                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                    <ReactMarkdown>{currentTopic.content}</ReactMarkdown>
                  </div>

                  {currentTopic.relatedTopics && currentTopic.relatedTopics.length > 0 && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="font-semibold mb-4">Related Topics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {currentTopic.relatedTopics.map((topicId) => {
                          const relatedTopic = currentModule?.subsections.find(
                            (t) => t.id === topicId
                          );
                          return relatedTopic ? (
                            <button
                              key={topicId}
                              onClick={() => handleTopicSelect(topicId)}
                              className="text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                              <p className="text-sm font-medium text-primary hover:underline">
                                {relatedTopic.title}
                              </p>
                            </button>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : currentModule ? (
            <Card>
              <CardContent className="p-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">{currentModule.title}</h2>
                  <p className="text-muted-foreground mb-6">{currentModule.description}</p>
                  <p className="text-muted-foreground">
                    Select a topic from the menu to view documentation.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Welcome to Admin Documentation</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Select a module from the menu to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
