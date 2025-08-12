'use server';

/**
 * @fileOverview A flow for analyzing interview responses and providing feedback.
 *
 * - analyzeInterviewResponse - A function that analyzes an interview response.
 * - AnalyzeInterviewResponseInput - The input type for the analyzeInterviewResponse function.
 * - AnalyzeInterviewResponseOutput - The return type for the analyzeInterviewResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeInterviewResponseInputSchema = z.object({
  question: z.string().describe('The interview question asked.'),
  answer: z.string().describe('The user\u0027s response to the question.'),
});
export type AnalyzeInterviewResponseInput = z.infer<
  typeof AnalyzeInterviewResponseInputSchema
>;

const AnalyzeInterviewResponseOutputSchema = z.object({
  feedback: z.string().describe('Feedback on the user\u0027s response.'),
  score: z.number().describe('A score representing the quality of the response.'),
  areasForImprovement: z
    .string()
    .describe('Specific areas for improvement in the response.'),
});
export type AnalyzeInterviewResponseOutput = z.infer<
  typeof AnalyzeInterviewResponseOutputSchema
>;

export async function analyzeInterviewResponse(
  input: AnalyzeInterviewResponseInput
): Promise<AnalyzeInterviewResponseOutput> {
  return analyzeInterviewResponseFlow(input);
}

const analyzeInterviewResponsePrompt = ai.definePrompt({
  name: 'analyzeInterviewResponsePrompt',
  input: {schema: AnalyzeInterviewResponseInputSchema},
  output: {schema: AnalyzeInterviewResponseOutputSchema},
  prompt: `You are an AI interview coach providing feedback on interview responses.

  Analyze the following interview response and provide feedback on content, clarity, and areas for improvement.

  Interview Question: {{{question}}}
  User Response: {{{answer}}}

  Provide a score between 0 and 100 representing the quality of the response.

  Also provide specific areas for improvement.
  `,
});

const analyzeInterviewResponseFlow = ai.defineFlow(
  {
    name: 'analyzeInterviewResponseFlow',
    inputSchema: AnalyzeInterviewResponseInputSchema,
    outputSchema: AnalyzeInterviewResponseOutputSchema,
  },
  async input => {
    const {output} = await analyzeInterviewResponsePrompt(input);
    return output!;
  }
);
