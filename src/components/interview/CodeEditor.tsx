import { useState, useRef, useEffect } from "react";
import { Code, Play, Send, Maximize2, Minimize2, Terminal, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Editor from "@monaco-editor/react";
import { useToast } from "@/hooks/use-toast";

interface TestCase {
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean;
}

interface CodeEditorProps {
  onComplete?: () => void;
}

// Language templates
const languageTemplates: Record<string, string> = {
  javascript: `function bubbleSort(arr) {
  let n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  
  return arr;
}

const arr = [64, 34, 25, 12, 22, 11, 90];
console.log("Sorted:", bubbleSort(arr));`,

  c: `#include <stdio.h>

void bubbleSort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
}

int main() {
    int arr[] = {64, 34, 25, 12, 22, 11, 90};
    int n = sizeof(arr) / sizeof(arr[0]);
    
    bubbleSort(arr, n);
    
    printf("Sorted: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    
    return 0;
}`,

  cpp: `#include <iostream>
#include <vector>
using namespace std;

void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
}

int main() {
    vector<int> arr = {64, 34, 25, 12, 22, 11, 90};
    
    bubbleSort(arr);
    
    cout << "Sorted: ";
    for (int num : arr) {
        cout << num << " ";
    }
    
    return 0;
}`,

  java: `public class Main {
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
    }
    
    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        
        bubbleSort(arr);
        
        System.out.print("Sorted: ");
        for (int num : arr) {
            System.out.print(num + " ");
        }
    }
}`
};

export const CodeEditor = ({ onComplete }: CodeEditorProps) => {
  const { toast } = useToast();
  
  // All state is local and independent
  const [code, setCode] = useState(languageTemplates.javascript);
  const [output, setOutput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [language, setLanguage] = useState("javascript");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [showTestCases, setShowTestCases] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const languages = [
    { value: "javascript", label: "JavaScript" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "java", label: "Java" },
  ];

  // Change code when language changes
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setCode(languageTemplates[newLanguage] || languageTemplates.javascript);
  };

  // Handle code changes
  const handleCodeChange = (value: string | undefined) => {
    setCode(value || "");
  };

  // Run code
  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Compiling and running...\n");
    setShowTestCases(true);
    setActiveTab("output");
    
    // Simulate compilation and execution
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const testCasesList: TestCase[] = [
      { input: "[64, 34, 25, 12, 22, 11, 90]", expected: "[11, 12, 22, 25, 34, 64, 90]", actual: "[11, 12, 22, 25, 34, 64, 90]", passed: true },
      { input: "[5, 1, 4, 2, 8]", expected: "[1, 2, 4, 5, 8]", actual: "[1, 2, 4, 5, 8]", passed: true },
      { input: "[1, 2, 3, 4, 5]", expected: "[1, 2, 3, 4, 5]", actual: "[1, 2, 3, 4, 5]", passed: true },
      { input: "[3]", expected: "[3]", actual: "[3]", passed: true },
    ];
    
    setTestCases(testCasesList);
    
    const feedbackMessages: Record<string, string> = {
      javascript: "✅ JavaScript code looks good! Time: O(n²), Space: O(1)",
      c: "✅ C implementation is correct! Good use of pointers.",
      cpp: "✅ C++ code works well! Nice use of vectors and swap.",
      java: "✅ Java solution is solid! Clean implementation."
    };
    
    setFeedback(feedbackMessages[language] || "✅ Code looks good!");
    setOutput(`✅ Execution successful!\n\nAll 4 test cases passed.`);
    
    setIsRunning(false);
  };

  // Submit code
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setHasSubmitted(true);
    setOutput("✅ Solution submitted successfully!\n\nGreat work! Moving to the next stage...");
    
    toast({
      title: "Success!",
      description: "Your solution has been submitted.",
      duration: 3000,
    });
    
    setIsSubmitting(false);
    
    // Notify parent to move to next stage
    setTimeout(() => {
      onComplete?.();
    }, 2000);
  };

  // Focus editor on mount
  useEffect(() => {
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 300);
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : 'w-full'}`}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Code className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Coding Challenge: Bubble Sort</CardTitle>
              <p className="text-sm text-muted-foreground">Implement the bubble sort algorithm</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={handleLanguageChange}>
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
              size="sm" 
              disabled={isRunning || isSubmitting}
              variant="outline"
            >
              <Play className="h-4 w-4 mr-1" />
              {isRunning ? "Running..." : "Run"}
            </Button>
            
            <Button 
              onClick={handleSubmit} 
              size="sm" 
              disabled={isRunning || isSubmitting || hasSubmitted}
            >
              <Send className="h-4 w-4 mr-1" />
              {isSubmitting ? "Submitting..." : hasSubmitted ? "Submitted" : "Submit"}
            </Button>
            
            <Button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              variant="ghost" 
              size="sm"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Problem Description */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm">
              <span className="font-medium">Problem:</span> Sort an array by repeatedly comparing adjacent elements 
              and swapping them if they are in the wrong order.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Example: [64, 34, 25, 12, 22, 11, 90] → [11, 12, 22, 25, 34, 64, 90]
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center px-4 py-1 border-b border-border">
              <TabsList className="h-8">
                <TabsTrigger value="editor" className="text-xs px-3">Editor</TabsTrigger>
                <TabsTrigger value="output" className="text-xs px-3">Output</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="editor" className="mt-0">
              <div className={isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-80'}>
                <Editor
                  height="100%"
                  language={language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language}
                  value={code}
                  onChange={handleCodeChange}
                  onMount={(editor) => { editorRef.current = editor; editor.focus(); }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                    lineNumbers: "on",
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    padding: { top: 12, bottom: 12 },
                    tabSize: 2,
                  }}
                  theme="vs-dark"
                />
              </div>
            </TabsContent>

            <TabsContent value="output" className="mt-0">
              <div className={`${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-80'} bg-[#1e1e1e] p-3 overflow-auto`}>
                <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">
                  {output || "Click 'Run' to execute your code."}
                </pre>
                
                {showTestCases && testCases.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-white font-medium text-xs mb-2 flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      Test Cases
                    </h4>
                    <div className="space-y-1">
                      {testCases.map((tc, i) => (
                        <div key={i} className={`p-1.5 rounded border text-xs ${tc.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                          <div className="flex items-center gap-1">
                            {tc.passed ? <Check className="h-3 w-3 text-green-400" /> : <X className="h-3 w-3 text-red-400" />}
                            <span className={tc.passed ? 'text-green-300' : 'text-red-300'}>
                              Test {i + 1}: {tc.input} → {tc.expected}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {feedback && (
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded">
                    <p className="text-blue-300 text-xs">💡 {feedback}</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeEditor;