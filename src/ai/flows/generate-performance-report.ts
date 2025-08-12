'use server';

/**
 * @fileOverview This file defines the generatePerformanceReport flow, which generates a summary report of the user's interview performance,
 * highlighting strengths and weaknesses, with specific recommendations.
 *
 * @fileOverview
 * - `generatePerformanceReport`: A function to generate the performance report.
 * - `GeneratePerformanceReportInput`: The input type for the `generatePerformanceReport` function.
 * - `GeneratePerformanceReportOutput`: The output type for the `generatePerformanceReport` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePerformanceReportInputSchema = z.object({
  interviewTranscript: z
    .string()
    .describe('The transcript of the entire interview, including questions and answers.'),
  toneAnalysis: z
    .string()
    .optional()
    .describe('The analysis of the user\u2019s tone during the interview.'),
});
export type GeneratePerformanceReportInput = z.infer<typeof GeneratePerformanceReportInputSchema>;

const GeneratePerformanceReportOutputSchema = z.object({
  summaryReport: z
    .string()
    .describe('A detailed summary report of the interview performance, highlighting strengths, weaknesses, and specific recommendations.'),
});
export type GeneratePerformanceReportOutput = z.infer<typeof GeneratePerformanceReportOutputSchema>;

export async function generatePerformanceReport(input: GeneratePerformanceReportInput): Promise<GeneratePerformanceReportOutput> {
  return generatePerformanceReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePerformanceReportPrompt',
  input: {schema: GeneratePerformanceReportInputSchema},
  output: {schema: GeneratePerformanceReportOutputSchema},
  prompt: `You are an AI career coach specializing in providing feedback on job interview performance.

  Based on the interview transcript and tone analysis provided, generate a comprehensive performance report.

  The report should include the following sections:
  - Overall Performance Summary: A brief overview of the candidate's performance.
  - Strengths: Highlight the candidate's key strengths demonstrated during the interview, with specific examples from the transcript.
  - Weaknesses: Identify areas where the candidate can improve, with specific examples from the transcript.
  - Recommendations: Provide actionable recommendations for the candidate to improve their interview skills.

  Consider the following when generating the report:
  - Content of responses: Assess the clarity, accuracy, and relevance of the candidate's answers.
  - Communication skills: Evaluate the candidate's ability to articulate their thoughts effectively.
  - Tone and confidence: Analyze the candidate's tone and confidence level based on the tone analysis provided.

  Interview Transcript:
  {{interviewTranscript}}

  Tone Analysis (if available):
  {{#if toneAnalysis}}
    {{toneAnalysis}}
  {{else}}
    No tone analysis provided.
  {{/if}}
  `,
});

const generatePerformanceReportFlow = ai.defineFlow(
  {
    name: 'generatePerformanceReportFlow',
    inputSchema: GeneratePerformanceReportInputSchema,
    outputSchema: GeneratePerformanceReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
