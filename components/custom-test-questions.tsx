'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FileText, AlertCircle } from 'lucide-react';

interface TestQuestion {
  question: string;
  ground_truth: string;
}

interface CustomTestQuestionsProps {
  onQuestionsUpdate: (questions: TestQuestion[]) => void;
  disabled?: boolean;
}

export function CustomTestQuestions({ onQuestionsUpdate, disabled = false }: CustomTestQuestionsProps) {
  const [questions, setQuestions] = useState<TestQuestion[]>([
    { question: '', ground_truth: '' }
  ]);
  const [isExpanded, setIsExpanded] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', ground_truth: '' }]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    onQuestionsUpdate(newQuestions.filter(q => q.question && q.ground_truth));
  };

  const updateQuestion = (index: number, field: 'question' | 'ground_truth', value: string) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
    
    // Only update parent with valid questions
    const validQuestions = newQuestions.filter(q => q.question && q.ground_truth);
    onQuestionsUpdate(validQuestions);
  };

  const sampleQuestions: TestQuestion[] = [
    {
      question: "What are the main benefits mentioned in the document?",
      ground_truth: "The specific benefits listed in the document"
    },
    {
      question: "How does the system handle edge cases?",
      ground_truth: "The document's explanation of edge case handling"
    },
    {
      question: "What are the performance characteristics?",
      ground_truth: "Performance metrics and characteristics from the document"
    }
  ];

  const loadSampleQuestions = () => {
    setQuestions(sampleQuestions);
    onQuestionsUpdate(sampleQuestions);
  };

  const validQuestionCount = questions.filter(q => q.question && q.ground_truth).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Custom Test Questions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={validQuestionCount > 0 ? 'default' : 'outline'}>
              {validQuestionCount} valid questions
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
            >
              {isExpanded ? 'Hide' : 'Show'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Provide your own test questions for more targeted evaluation
        </p>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Test Questions</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSampleQuestions}
              disabled={disabled}
            >
              Load Examples
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={index} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium">Question {index + 1}</span>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Label htmlFor={`question-${index}`} className="text-xs">
                      Question
                    </Label>
                    <Textarea
                      id={`question-${index}`}
                      value={q.question}
                      onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                      placeholder="Enter your test question..."
                      className="min-h-[60px]"
                      disabled={disabled}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`answer-${index}`} className="text-xs">
                      Expected Answer (Ground Truth)
                    </Label>
                    <Textarea
                      id={`answer-${index}`}
                      value={q.ground_truth}
                      onChange={(e) => updateQuestion(index, 'ground_truth', e.target.value)}
                      placeholder="Enter the expected answer based on the document..."
                      className="min-h-[80px]"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={addQuestion}
            disabled={disabled}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>

          {validQuestionCount === 0 && questions.some(q => q.question || q.ground_truth) && (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>Complete both question and answer fields for each test</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}