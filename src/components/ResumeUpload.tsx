// UploadResume.tsx
import React, { useState } from "react";
import { useAuth } from '../hooks/useAuth';
import { ResumeService } from '@/services/resumeService';
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface UploadResumeProps {
  onScoreCalculated: (score: number) => void;
  onResumeUploaded?: () => void;
}

const UploadResume: React.FC<UploadResumeProps> = ({ onScoreCalculated, onResumeUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      // Validate file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or DOCX file",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please upload a resume file",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload your resume",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress("Analyzing resume...");

    try {
      // Process and store resume
      setUploadProgress("Extracting information from resume...");
      const userData = await ResumeService.processAndStoreResume(user.uid, file);
      
      setUploadProgress("Calculating resume score...");
      // Calculate a score based on resume completeness (you can customize this)
      const score = calculateResumeScore(userData);
      
      toast({
        title: "Resume Uploaded Successfully!",
        description: `Your resume has been analyzed with a score of ${score}%`,
        duration: 5000,
      });
      
      onScoreCalculated(score);
      
      if (onResumeUploaded) {
        onResumeUploaded();
      }
      
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Upload Failed",
        description: "There was an error processing your resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const calculateResumeScore = (userData: any): number => {
    // Custom scoring logic
    let score = 0;
    
    // Basic information (20%)
    if (userData.fullName) score += 5;
    if (userData.email) score += 5;
    if (userData.phone) score += 5;
    if (userData.location) score += 5;
    
    // Skills (20%)
    if (userData.skills && userData.skills.length > 0) {
      score += Math.min(20, userData.skills.length);
    }
    
    // Experience (20%)
    if (userData.experience && userData.experience.length > 0) {
      score += Math.min(20, userData.experience.length * 5);
    }
    
    // Education (15%)
    if (userData.education && userData.education.length > 0) {
      score += Math.min(15, userData.education.length * 5);
    }
    
    // Projects (15%)
    if (userData.projects && userData.projects.length > 0) {
      score += Math.min(15, userData.projects.length * 3);
    }
    
    // Certifications (10%)
    if (userData.certifications && userData.certifications.length > 0) {
      score += Math.min(10, userData.certifications.length * 2);
    }
    
    return Math.min(100, score);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload Your Resume
        </CardTitle>
        <CardDescription>
          Upload your resume to help us personalize your interview experience.
          We support PDF and DOCX files (max 5MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 hover:border-primary/50 transition-colors">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {file && (
            <div className="mt-4 text-sm text-muted-foreground">
              Selected: {file.name}
            </div>
          )}
        </div>
        
        {isUploading && (
          <div className="flex items-center justify-center gap-3 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{uploadProgress}</span>
          </div>
        )}
        
        <Button
          onClick={handleSubmit}
          disabled={!file || isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Analyze Resume
            </>
          )}
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          <AlertCircle className="inline h-3 w-3 mr-1" />
          Your resume data will be used to personalize interview questions and provide better feedback.
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadResume;