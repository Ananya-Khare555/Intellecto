import { useState } from "react";
import { Code, Play, Terminal, Maximize2, Minimize2, Send, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Editor } from "@monaco-editor/react";
import { useGeminiInterview } from '@/hooks/use-geminiInterview';
import { useToast } from "@/hooks/use-toast";

interface TestCase {
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean;
}

interface AIFeedback {
  approach: string;
  suggestions: string[];
  timeComplexity?: string;
  spaceComplexity?: string;
}

interface CodeEditorProps {
  problem?: string;
  initialCode?: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  onRun?: (code: string) => Promise<TestCase[]>;
  onSubmit?: (code: string) => Promise<boolean>;
  onLanguageChange?: (language: string) => void;
}

export const CodeEditor = ({
  problem = "Write a function that returns the sum of two numbers.",
  initialCode = "// Write your solution here\nfunction sum(a, b) {\n  // Your code here\n  return a + b;\n}",
  language = "javascript",
  onCodeChange,
  onRun,
  onSubmit,
  onLanguageChange
}: CodeEditorProps) => {
  const { toast } = useToast();
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [showTestCases, setShowTestCases] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [aiFeedback, setAIFeedback] = useState<string | null>(null);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  
  const geminiInterview = useGeminiInterview();

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "cpp", label: "C++" },
    { value: "csharp", label: "C#" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "typescript", label: "TypeScript" }
  ];

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    onLanguageChange?.(value);
  };

  const handleRun = async () => {
    if (!onRun) return;
    
    setIsRunning(true);
    setOutput("Running code...\n");
    setShowTestCases(true);
    setActiveTab("output");
    
    try {
      const results = await onRun(code);
      setTestCases(results);
      
      const passedCount = results.filter(t => t.passed).length;
      const failedCount = results.length - passedCount;
      
      setOutput(`Code executed successfully!\n\nTest Results:\n✅ ${passedCount} tests passed\n❌ ${failedCount} tests failed`);
      
      // Automatically get AI feedback after running
      await getAIFeedback();
      
    } catch (error) {
      setOutput(`Error executing code:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    
    setIsSubmitting(true);
    try {
      const success = await onSubmit(code);
      if (success) {
        setOutput("Your solution has been submitted successfully!");
        toast({
          title: "Success!",
          description: "Your code has been submitted.",
          duration: 3000,
        });
      } else {
        setOutput("There was an issue with your submission. Please try again.");
      }
    } catch (error) {
      setOutput(`Error submitting code:\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAIFeedback = async () => {
    setIsGettingFeedback(true);
    setShowAIFeedback(true);
    
    try {
      // Use reviewCode instead of getCodingFeedback
      const feedback = await geminiInterview.reviewCode(
        problem,
        code,
        selectedLanguage
      );
      
      if (feedback) {
        setAIFeedback(feedback);
        
        // Update output with feedback
        setOutput(prev => prev + "\n\n🤖 AI Feedback:\n" + feedback);
        
        toast({
          title: "AI Feedback Ready",
          description: "Check the feedback section for suggestions.",
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error getting AI feedback:', error);
      toast({
        title: "Feedback Error",
        description: "Could not get AI feedback at this time.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    theme: "vs-dark",
    automaticLayout: true,
    scrollBeyondLastLine: false,
    wordWrap: "on" as const,
    padding: { top: 16, bottom: 16 }
  };

  return (
    <Card className={`interview-card animate-slide-up ${isFullscreen ? 'fixed inset-4 z-50' : 'max-w-6xl mx-auto'}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Code className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">Code Challenge</CardTitle>
            <p className="text-sm text-muted-foreground">Write and test your solution</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleRun} 
            className="voice-button px-4 py-2" 
            size="sm"
            disabled={isRunning || isSubmitting || isGettingFeedback}
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? "Running..." : "Run Code"}
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="secondary" 
            size="sm"
            disabled={isRunning || isSubmitting || isGettingFeedback}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Submitting..." : "Submit Code"}
          </Button>
          <Button 
            onClick={() => setIsFullscreen(!isFullscreen)} 
            variant="outline" 
            size="sm"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Problem Statement */}
        <div className="p-6 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-foreground mb-2">Problem Statement :</h3>
          <p className="text-muted-foreground">{problem}</p>
        </div>

        {/* Code Editor and Output */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="output" className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Output
              </TabsTrigger>
            </TabsList>
            
            <div className="text-sm text-muted-foreground">
              Language: <span className="text-foreground font-medium">{selectedLanguage}</span>
            </div>
          </div>

          <TabsContent value="editor" className="mt-0 border-0">
            <div className={`${isFullscreen ? 'h-[calc(100vh-240px)]' : 'h-96'} bg-[#1e1e1e]`}>
              <Editor
                height="100%" 
                language={selectedLanguage} 
                value={code} 
                onChange={handleCodeChange} 
                options={editorOptions} 
                theme="vs-dark" 
              />
            </div>
          </TabsContent>

          <TabsContent value="output" className="mt-0 border-0">
            <div className={`${isFullscreen ? 'h-[calc(100vh-240px)]' : 'h-96'} bg-[#1e1e1e] p-4 font-mono text-sm overflow-auto space-y-4`}>
              {/* Output Section */}
              <pre className="text-green-400 whitespace-pre-wrap">
                {output || "No output yet. Click 'Run Code' to execute your solution."}
              </pre>
              
              {/* Test Cases Section */}
              {showTestCases && testCases.length > 0 && (
                <div className="animate-slide-in-right">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Terminal className="h-4 w-4" />
                    Test Cases
                  </h3>
                  <div className="space-y-2">
                    {testCases.map((testCase, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border animate-fade-in ${
                          testCase.passed
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {testCase.passed ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <X className="h-4 w-4 text-red-400" />
                          )}
                          <span className="font-medium">Test Case {index + 1}</span>
                        </div>
                        <div className="text-sm opacity-90">
                          <div>Input: {testCase.input}</div>
                          <div>Expected: {testCase.expected}</div>
                          {testCase.actual && <div>Actual: {testCase.actual}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Feedback Section */}
              {showAIFeedback && aiFeedback && (
                <div className="animate-slide-in-right mt-6 border-t border-gray-700 pt-4">
                  <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                    <span>🤖</span>
                    AI Code Review
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Feedback Content */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">
                        {aiFeedback}
                      </p>
                    </div>
                  </div>

                  {/* Get Feedback Button */}
                  <Button
                    onClick={getAIFeedback}
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    disabled={isGettingFeedback}
                  >
                    {isGettingFeedback ? (
                      <>
                        <span className="animate-spin mr-2">⚪</span>
                        Getting Feedback...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🤖</span>
                        Get AI Feedback Again
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Loading Feedback State */}
              {isGettingFeedback && !aiFeedback && (
                <div className="animate-pulse mt-6 border-t border-gray-700 pt-4">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-20 bg-gray-700/50 rounded"></div>
                    <div className="h-16 bg-gray-700/50 rounded"></div>
                    <div className="h-12 bg-gray-700/50 rounded"></div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};