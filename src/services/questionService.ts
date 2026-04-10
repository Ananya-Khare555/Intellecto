import questionsData from '@/data/interviewQuestions.json';

export interface MCQOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;
    question: string;
    options?: MCQOption[];
    explanation?: string;
}

export interface QuestionSet {
    introduction: Question[];
    technical: Question[];
    behavioral: Question[];
}

class QuestionService {
    private questions: QuestionSet;
    private usedQuestionIds: Set<string> = new Set();
    private questionCounts: Map<string, number> = new Map();

    constructor() {
        this.questions = questionsData as QuestionSet;
    }

    /**
     * Get random questions for a specific type
     * @param type - The type of questions (introduction, technical, behavioral)
     * @param count - Number of questions to return (if not specified, returns random between min and max)
     * @param minCount - Minimum number of questions (default: 3)
     * @param maxCount - Maximum number of questions (default: 4)
     */
    getRandomQuestions(
        type: keyof QuestionSet,
        count?: number,
        minCount: number = 3,
        maxCount: number = 4
    ): Question[] {
        const availableQuestions = this.questions[type] || [];

        if (availableQuestions.length === 0) {
            return [];
        }

        // Determine how many questions to return
        const questionCount = count ?? this.getRandomInt(minCount, maxCount);
        const actualCount = Math.min(questionCount, availableQuestions.length);

        // Shuffle and select questions
        const shuffled = this.shuffleArray([...availableQuestions]);
        const selected = shuffled.slice(0, actualCount);

        // Track used questions to avoid repetition if desired
        selected.forEach(q => this.usedQuestionIds.add(q.id));

        return selected;
    }

    /**
     * Get a single random question of a specific type
     */
    getRandomQuestion(type: keyof QuestionSet, excludeUsed: boolean = true): Question | null {
        const availableQuestions = this.questions[type] || [];

        let questionPool = availableQuestions;
        if (excludeUsed && this.usedQuestionIds.size > 0) {
            questionPool = availableQuestions.filter(q => !this.usedQuestionIds.has(q.id));

            // If all questions have been used, reset the used set
            if (questionPool.length === 0) {
                this.usedQuestionIds.clear();
                questionPool = availableQuestions;
            }
        }

        if (questionPool.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * questionPool.length);
        const selected = questionPool[randomIndex];
        this.usedQuestionIds.add(selected.id);

        return selected;
    }

    /**
     * Get questions sequentially for a more structured interview
     */
    getNextQuestion(type: keyof QuestionSet): Question | null {
        const typeQuestions = this.questions[type] || [];

        // Get current count for this type
        const currentCount = this.questionCounts.get(type) || 0;

        if (currentCount >= typeQuestions.length) {
            return null;
        }

        // Use sequential order but shuffled per session
        const shuffled = this.getShuffledForType(type);
        const question = shuffled[currentCount];

        this.questionCounts.set(type, currentCount + 1);
        this.usedQuestionIds.add(question.id);

        return question;
    }

    /**
     * Reset the question tracking for a new interview session
     */
    resetSession(): void {
        this.usedQuestionIds.clear();
        this.questionCounts.clear();
    }

    /**
     * Get the total number of questions available for a type
     */
    getTotalQuestions(type: keyof QuestionSet): number {
        return this.questions[type]?.length || 0;
    }

    /**
     * Check if there are more questions available for a type
     */
    hasMoreQuestions(type: keyof QuestionSet): boolean {
        const currentCount = this.questionCounts.get(type) || 0;
        return currentCount < this.getTotalQuestions(type);
    }

    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    private getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private shuffledCache: Map<string, Question[]> = new Map();

    private getShuffledForType(type: keyof QuestionSet): Question[] {
        if (!this.shuffledCache.has(type)) {
            const questions = this.questions[type] || [];
            this.shuffledCache.set(type, this.shuffleArray([...questions]));
        }
        return this.shuffledCache.get(type)!;
    }
}

export const questionService = new QuestionService();