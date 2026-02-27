import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Get API key from environment with proper typing
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Interview questions for fallback mode
export const FALLBACK_QUESTIONS = {
  introduction: [
    "Please introduce yourself and tell me about your background in software development.",
    "What interests you about this position and what are your career goals?",
    "Walk me through your most recent project and your role in it."
  ],
  technical: [
    "Explain the difference between let, const, and var in JavaScript.",
    "What is the virtual DOM in React and how does it work?",
    "How would you optimize a slow-loading web application?"
  ],
  behavioral: [
    "Tell me about a time you faced a difficult technical challenge and how you overcame it.",
    "Describe a situation where you had to work with a difficult team member.",
    "Give an example of how you've handled tight deadlines in the past."
  ]
};

export const FALLBACK_RESPONSES = {
  acknowledgement: [
    "Thank you for your response.",
    "I appreciate you sharing that.",
    "Thanks for that answer.",
    "Good, let's continue."
  ],
  followUp: "Could you tell me more about that?",
  nextQuestion: "Here's the next question:"
};

export class GeminiService {
  private model: GenerativeModel | null = null;
  private interviewContext: string[] = [];
  private useFallback: boolean = false;

  constructor() {
    try {
      if (API_KEY && API_KEY !== '') {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Using the correct model name
        this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
        console.log('✅ Gemini API initialized successfully');
        this.useFallback = false;
      } else {
        console.warn('⚠️ No API key found, using fallback mode');
        this.useFallback = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Gemini:', error);
      this.useFallback = true;
    }
  }

  isAvailable(): boolean {
    return !this.useFallback && this.model !== null;
  }

  async startInterview(candidateName?: string): Promise<string> {
    this.interviewContext = [];
    
    if (this.useFallback) {
      return `Hello${candidateName ? ' ' + candidateName : ''}! Welcome to your technical interview. I'll be asking you some questions today. Let's begin with the introduction. Please tell me about yourself and your background in software development.`;
    }

    try {
      const prompt = `You are a professional interviewer. Start the interview with a warm welcome${candidateName ? ' for ' + candidateName : ''}. Ask them to introduce themselves. Keep it concise and friendly.`;
      
      const result = await this.model!.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.interviewContext.push(`AI: ${text}`);
      return text;
    } catch (error) {
      console.error('Error starting interview:', error);
      this.useFallback = true;
      return `Welcome${candidateName ? ' ' + candidateName : ''}! Let's begin the interview. Please introduce yourself.`;
    }
  }

  async generateQuestion(stage: string, previousAnswers: string[] = []): Promise<string> {
    if (this.useFallback) {
      const stageKey = stage as keyof typeof FALLBACK_QUESTIONS;
      const questions = FALLBACK_QUESTIONS[stageKey] || FALLBACK_QUESTIONS.introduction;
      const index = previousAnswers.length % questions.length;
      return questions[index];
    }

    try {
      const context = previousAnswers.length > 0 
        ? `Based on the candidate's previous answers: ${previousAnswers.slice(-2).join(' ')}`
        : '';

      const prompt = `You are a technical interviewer. Ask a ${stage} interview question. ${context} Keep it concise and professional.`;

      const result = await this.model!.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      this.interviewContext.push(`AI Question: ${text}`);
      return text;
    } catch (error) {
      console.error('Error generating question:', error);
      const stageKey = stage as keyof typeof FALLBACK_QUESTIONS;
      const questions = FALLBACK_QUESTIONS[stageKey] || FALLBACK_QUESTIONS.introduction;
      return questions[previousAnswers.length % questions.length];
    }
  }

  async processAnswer(question: string, answer: string): Promise<{
    feedback: string;
    shouldContinue: boolean;
  }> {
    if (this.useFallback) {
      const randomIndex = Math.floor(Math.random() * FALLBACK_RESPONSES.acknowledgement.length);
      return {
        feedback: FALLBACK_RESPONSES.acknowledgement[randomIndex],
        shouldContinue: true
      };
    }

    try {
      const prompt = `Question: ${question}\nCandidate's Answer: ${answer}\n\nProvide brief feedback (1-2 sentences) and acknowledge the response. Be encouraging.`;

      const result = await this.model!.generateContent(prompt);
      const response = await result.response;
      const feedback = response.text();
      
      this.interviewContext.push(`Candidate: ${answer}`);
      this.interviewContext.push(`AI Feedback: ${feedback}`);
      
      return {
        feedback,
        shouldContinue: true
      };
    } catch (error) {
      console.error('Error processing answer:', error);
      return {
        feedback: "Thank you for your response.",
        shouldContinue: true
      };
    }
  }

  async generateMCQ(topic: string = 'programming'): Promise<{
    question: string;
    options: { id: string; text: string; isCorrect: boolean }[];
    explanation: string;
  }> {
    if (this.useFallback) {
      return {
        question: "What is the time complexity of binary search?",
        options: [
          { id: 'a', text: 'O(n)', isCorrect: false },
          { id: 'b', text: 'O(log n)', isCorrect: true },
          { id: 'c', text: 'O(n²)', isCorrect: false },
          { id: 'd', text: 'O(1)', isCorrect: false }
        ],
        explanation: "Binary search has O(log n) time complexity as it divides the search space in half each time."
      };
    }

    try {
      const prompt = `Generate a multiple choice question about ${topic}. Return in this JSON format:
      {
        "question": "question text",
        "options": [
          {"id": "a", "text": "option 1", "isCorrect": false},
          {"id": "b", "text": "option 2", "isCorrect": true},
          {"id": "c", "text": "option 3", "isCorrect": false},
          {"id": "d", "text": "option 4", "isCorrect": false}
        ],
        "explanation": "explanation of correct answer"
      }`;

      const result = await this.model!.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error generating MCQ:', error);
      return {
        question: "What is the time complexity of binary search?",
        options: [
          { id: 'a', text: 'O(n)', isCorrect: false },
          { id: 'b', text: 'O(log n)', isCorrect: true },
          { id: 'c', text: 'O(n²)', isCorrect: false },
          { id: 'd', text: 'O(1)', isCorrect: false }
        ],
        explanation: "Binary search has O(log n) time complexity."
      };
    }
  }

  async reviewCode(problem: string, code: string, language: string): Promise<string> {
    if (this.useFallback) {
      return "Your solution looks good! Consider adding input validation and testing with edge cases.";
    }

    try {
      const prompt = `Review this ${language} code for: ${problem}\n\nCode:\n${code}\n\nProvide constructive feedback on approach, potential improvements, and any bugs. Keep it concise.`;

      const result = await this.model!.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error reviewing code:', error);
      return "Unable to review code at the moment. Please test your solution manually.";
    }
  }

  clearContext() {
    this.interviewContext = [];
  }
}

export const geminiService = new GeminiService();