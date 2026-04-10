// src/services/geminiService.ts

export const geminiService = {
  // Store conversation context
  context: [] as any[],
  userContext: '', // Store user resume data

  // Modified startInterview to accept user context
  startInterview: async (userContext?: string) => {
    if (userContext) {
      geminiService.userContext = userContext;
    }
    
    const prompt = geminiService.userContext
      ? `You are an AI interviewer conducting a technical interview. 
         
         Candidate Information:
         ${geminiService.userContext}
         
         Start the interview with a professional greeting. Make it personalized by:
         1. Greeting them by name if available
         2. Briefly mentioning their skills or experience from the resume
         3. Showing that you've reviewed their background
         4. Then ask them to tell you more about their most recent project or experience
         
         Keep it warm, professional, and encouraging.`
      : `You are an AI interviewer. Start the interview with a professional greeting and introduction. Ask the candidate to introduce themselves.`;
    
    const response = await geminiService.generateContent(prompt);
    return response;
  },

  // Modified generateQuestion to accept user context
  generateQuestion: async (stage: string, previousAnswers: string[] = [], userContext?: string) => {
    if (userContext) {
      geminiService.userContext = userContext;
    }
    
    let prompt = '';
    
    switch(stage) {
      case 'introduction':
        prompt = geminiService.userContext
          ? `You are an AI interviewer. Candidate's background:
             ${geminiService.userContext}
             
             Based on their resume, ask a specific and personalized question about one of their:
             - Most interesting project
             - Key skills mentioned
             - Work experience
             - Technical expertise
             
             Make it engaging and show you've read their resume.
             Previous answers: ${previousAnswers.join(', ')}`
          : `Ask a professional introduction question about their background and experience.`;
        break;
        
      case 'technical':
        prompt = geminiService.userContext
          ? `You are an AI interviewer. Candidate's skills:
             ${extractSkills(geminiService.userContext)}
             
             Ask a technical question that matches their skill level and expertise.
             Focus on their strongest skills mentioned in the resume.
             Make it challenging but fair.
             Previous answers: ${previousAnswers.join(', ')}`
          : `Ask a technical question about programming concepts, algorithms, or system design.`;
        break;
        
      case 'behavioral':
        prompt = geminiService.userContext
          ? `You are an AI interviewer. Candidate's experience:
             ${extractExperience(geminiService.userContext)}
             
             Ask a behavioral question about a past project, challenge, or achievement
             mentioned in their resume. Make it specific to their experience.
             Previous answers: ${previousAnswers.join(', ')}`
          : `Ask a behavioral question about teamwork, leadership, or problem-solving.`;
        break;
        
      default:
        prompt = geminiService.userContext
          ? `Based on the candidate's profile, ask a relevant follow-up question.
             Candidate info: ${geminiService.userContext}
             Previous answers: ${previousAnswers.join(', ')}`
          : `Ask a relevant follow-up question. Previous answers: ${previousAnswers.join(', ')}`;
    }
    
    const response = await geminiService.generateContent(prompt);
    return response;
  },

  // Modified processAnswer to accept user context
  processAnswer: async (question: string, answer: string, userContext?: string) => {
    if (userContext) {
      geminiService.userContext = userContext;
    }
    
    const prompt = geminiService.userContext
      ? `You are an AI interviewer providing feedback.
         
         Candidate's Background:
         ${geminiService.userContext}
         
         Question Asked: "${question}"
         Candidate's Answer: "${answer}"
         
         Provide constructive feedback that:
         1. Acknowledges their response
         2. References their experience if relevant
         3. Gives specific suggestions for improvement
         4. Determines if they should continue to the next question
         
         Return as JSON: { feedback: string, shouldContinue: boolean }`
      : `You are an AI interviewer.
         Question: "${question}"
         Answer: "${answer}"
         
         Provide constructive feedback and determine if they should continue.
         Return as JSON: { feedback: string, shouldContinue: boolean }`;
    
    const response = await geminiService.generateContent(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return {
        feedback: response,
        shouldContinue: true
      };
    }
  },

  // Modified generateMCQ to accept topic
  generateMCQ: async (topic?: string) => {
    const mcqTopic = topic || 'general programming concepts';
    
    const prompt = `Generate a challenging multiple choice question about ${mcqTopic}.
                    Make it relevant to software development and technical interviews.
                    
                    Return as JSON with this exact structure:
                    {
                      "question": "question text here",
                      "options": [
                        {"id": "a", "text": "option A text", "isCorrect": false},
                        {"id": "b", "text": "option B text", "isCorrect": true},
                        {"id": "c", "text": "option C text", "isCorrect": false},
                        {"id": "d", "text": "option D text", "isCorrect": false}
                      ],
                      "explanation": "detailed explanation of why the correct answer is right"
                    }`;
    
    const response = await geminiService.generateContent(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return null;
    }
  },

  // Modified reviewCode to accept user context
  reviewCode: async (problem: string, code: string, language: string, userContext?: string) => {
    if (userContext) {
      geminiService.userContext = userContext;
    }
    
    const skillLevel = geminiService.userContext 
      ? `Candidate's background: ${extractSkillLevel(geminiService.userContext)}`
      : '';
    
    const prompt = `Review this code solution.
                    
                    Problem: ${problem}
                    
                    Code (${language}):
                    \`\`\`
                    ${code}
                    \`\`\`
                    
                    ${skillLevel}
                    
                    Provide detailed feedback including:
                    1. Correctness - Does it solve the problem?
                    2. Time & Space Complexity - Analyze efficiency
                    3. Code Quality - Readability, naming, structure
                    4. Edge Cases - What cases might it miss?
                    5. Improvements - Specific suggestions
                    6. Score out of 10
                    
                    Be constructive and educational in your feedback.`;
    
    const response = await geminiService.generateContent(prompt);
    return response;
  },

  // Helper function to generate content (replace with your actual Gemini API implementation)
  generateContent: async (prompt: string) => {
    try {
      // TODO: Replace with your actual Gemini API implementation
      // Example with Google Generative AI:
      
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      return result.response.text();
      
      
      // For now, return a mock response
      // console.log('Generating content with prompt:', prompt.substring(0, 200));
      // return "This is a response from the AI. Implement your actual Gemini API call here.";
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  },

  // Clear conversation context
  clearContext: () => {
    geminiService.context = [];
    geminiService.userContext = '';
  }
};

// Helper functions to extract information from user context
function extractSkills(userContext: string): string {
  const skillsMatch = userContext.match(/Skills:([\s\S]*?)(?=\n\n|\n[A-Z]|$)/);
  if (skillsMatch) {
    return skillsMatch[1].trim();
  }
  return 'programming';
}

function extractExperience(userContext: string): string {
  const expMatch = userContext.match(/Experience:([\s\S]*?)(?=\n\n|\n[A-Z]|$)/);
  if (expMatch) {
    return expMatch[1].trim();
  }
  return '';
}

function extractSkillLevel(userContext: string): string {
  const experience = extractExperience(userContext);
  const yearsMatch = experience.match(/(\d+)\+?\s*years?/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years >= 5) return 'Senior level (5+ years experience)';
    if (years >= 2) return 'Mid-level (2-5 years experience)';
    return 'Junior level (<2 years experience)';
  }
  return 'Experience level unknown';
}

export const FALLBACK_QUESTIONS = {
  introduction: [
    "Tell me about yourself and your background.",
    "What interests you about this role?",
    "What are your career goals?"
  ],
  technical: [
    "Explain the difference between let, const, and var in JavaScript.",
    "What is the virtual DOM and how does it work?",
    "Explain closures in JavaScript with an example."
  ],
  behavioral: [
    "Tell me about a challenging project you worked on.",
    "How do you handle conflicts in a team?",
    "Describe a time you had to learn a new technology quickly."
  ]
};