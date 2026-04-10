// import { db, auth } from '@/lib/firebase';
import { db } from "../components/auth/firebase";
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// ─── Backend API URL ────────────────────────────────────────────────────────
// Points to the FastAPI backend running locally.
// Change this to your deployed backend URL in production.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export interface UserData {
    userId: string;
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    skills: string[];
    experience: Array<{
        title: string;
        company: string;
        startDate: string;
        endDate?: string;
        description: string;
    }>;
    education: Array<{
        degree: string;
        institution: string;
        year: string;
        grade?: string;
    }>;
    projects: Array<{
        name: string;
        description: string;
        technologies: string[];
        link?: string;
    }>;
    certifications: string[];
    languages: string[];
    summary: string;
    resumeUrl?: string;
    uploadedAt: Date;
    updatedAt: Date;
}

export interface ResumeAnalysis {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    skills: string[];
    experience: Array<{
        title: string;
        company: string;
        startDate: string;
        endDate?: string;
        description: string;
    }>;
    education: Array<{
        degree: string;
        institution: string;
        year: string;
        grade?: string;
    }>;
    projects: Array<{
        name: string;
        description: string;
        technologies: string[];
        link?: string;
    }>;
    certifications: string[];
    languages: string[];
    summary: string;
}

export class ResumeService {

    // ── Firestore helpers ──────────────────────────────────────────────────

    /** Check if user has uploaded a resume (checks Firestore directly). */
    static async hasUserResume(userId: string): Promise<boolean> {
        try {
            const userDocRef = doc(db, 'user_data', userId);
            const userDoc = await getDoc(userDocRef);
            return userDoc.exists();
        } catch (error) {
            console.error('Error checking user resume:', error);
            return false;
        }
    }

    /** Fetch stored resume data from Firestore. */
    static async getUserData(userId: string): Promise<UserData | null> {
        try {
            const userDocRef = doc(db, 'user_data', userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                return userDoc.data() as UserData;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    }

    /** Save / overwrite user data in Firestore (used as fallback). */
    static async saveUserData(userId: string, userData: UserData): Promise<void> {
        try {
            const userDocRef = doc(db, 'user_data', userId);
            await setDoc(userDocRef, {
                ...userData,
                userId,
                updatedAt: new Date()
            }, { merge: true });
        } catch (error) {
            console.error('Error saving user data:', error);
            throw error;
        }
    }

    /** Update specific fields of user data in Firestore. */
    static async updateUserData(userId: string, updates: Partial<UserData>): Promise<void> {
        try {
            const userDocRef = doc(db, 'user_data', userId);
            await updateDoc(userDocRef, {
                ...updates,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating user data:', error);
            throw error;
        }
    }

    // ── Backend API calls ──────────────────────────────────────────────────

    /**
     * Send the resume file to the FastAPI backend.
     * The backend performs OCR text extraction, Gemini AI parsing,
     * and saves the structured data to Firestore — all in one call.
     *
     * @param userId  Firebase Auth user UID
     * @param file    PDF or DOCX resume file
     * @returns       Parsed ResumeAnalysis object
     */
    static async parseResumeWithAI(userId: string, file: File): Promise<ResumeAnalysis> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
            `${BACKEND_URL}/api/resume/upload/${encodeURIComponent(userId)}`,
            {
                method: 'POST',
                body: formData,
                // Do NOT set Content-Type header — fetch sets it automatically
                // with the correct multipart boundary when using FormData.
            }
        );

        if (!response.ok) {
            let errorMsg = `Resume processing failed (HTTP ${response.status})`;
            try {
                const errBody = await response.json();
                errorMsg = errBody.detail || errBody.error || errorMsg;
            } catch {
                // ignore JSON parse error, keep generic message
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();
        // The backend returns { success, message, userId, resume_data }
        return data.resume_data as ResumeAnalysis;
    }

    /**
     * Process and store resume via the FastAPI backend.
     * The backend handles OCR + AI parsing + Firestore write.
     * Returns the UserData object for immediate use in the UI.
     */
    static async processAndStoreResume(userId: string, file: File): Promise<UserData> {
        try {
            // Call the backend — it does OCR, Gemini parsing, AND Firestore storage
            const parsedData = await this.parseResumeWithAI(userId, file);

            // Build a UserData object to return to the UI
            const userData: UserData = {
                userId,
                fullName: parsedData.fullName,
                email: parsedData.email,
                phone: parsedData.phone,
                location: parsedData.location,
                skills: parsedData.skills,
                experience: parsedData.experience,
                education: parsedData.education,
                projects: parsedData.projects,
                certifications: parsedData.certifications,
                languages: parsedData.languages,
                summary: parsedData.summary,
                uploadedAt: new Date(),
                updatedAt: new Date(),
            };

            return userData;
        } catch (error) {
            console.error('Error processing resume via backend:', error);
            throw error;
        }
    }

    // ── AI context builder ─────────────────────────────────────────────────

    /** Format stored user data into a context string for Gemini AI prompts. */
    static getUserContextForAI(userData: UserData): string {
        return `
Candidate Information:
- Name: ${userData.fullName}
- Email: ${userData.email}
- Location: ${userData.location || 'Not specified'}
- Summary: ${userData.summary}

Skills:
${userData.skills.map(skill => `- ${skill}`).join('\n')}

Experience:
${userData.experience.map(exp =>
            `- ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'}): ${exp.description}`
        ).join('\n')}

Education:
${userData.education.map(edu =>
            `- ${edu.degree} from ${edu.institution} (${edu.year})${edu.grade ? ` - ${edu.grade}` : ''}`
        ).join('\n')}

Projects:
${userData.projects.map(proj =>
            `- ${proj.name}: ${proj.description} [Technologies: ${proj.technologies.join(', ')}]`
        ).join('\n')}

Certifications:
${userData.certifications.map(cert => `- ${cert}`).join('\n')}

Languages:
${userData.languages.map(lang => `- ${lang}`).join('\n')}
`;
    }
}