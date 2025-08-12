'use server';
/**
 * @fileOverview This file defines a Genkit flow for assessing the tone and confidence level of a user's speech.
 *
 * - assessToneAndConfidence - The main function to call to assess tone and confidence.
 * - AssessToneAndConfidenceInput - The input type for the assessToneAndConfidence function.
 * - AssessToneAndConfidenceOutput - The output type for the assessToneAndConfidence function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessToneAndConfidenceInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      'The audio data URI of the user\'s speech, must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  transcript: z.string().describe('The transcript of the user\'s speech.'),
});
export type AssessToneAndConfidenceInput = z.infer<typeof AssessToneAndConfidenceInputSchema>;

const AssessToneAndConfidenceOutputSchema = z.object({
  toneAnalysis: z.string().describe('An analysis of the user\'s tone.'),
  confidenceScore: z.number().describe('A score representing the user\'s confidence level (0-100).'),
  feedback: z.string().describe('Constructive feedback on the user\'s tone and confidence.'),
});
export type AssessToneAndConfidenceOutput = z.infer<typeof AssessToneAndConfidenceOutputSchema>;

export async function assessToneAndConfidence(input: AssessToneAndConfidenceInput): Promise<AssessToneAndConfidenceOutput> {
  return assessToneAndConfidenceFlow(input);
}

const assessToneAndConfidencePrompt = ai.definePrompt({
  name: 'assessToneAndConfidencePrompt',
  input: {schema: AssessToneAndConfidenceInputSchema},
  output: {schema: AssessToneAndConfidenceOutputSchema},
  prompt: `You are an AI expert in analyzing tone and confidence in speech.  You will analyze the provided audio transcript and output a \"toneAnalysis\" field describing the user's tone, a \"confidenceScore\" as a number from 0-100, and \"feedback\" with suggestions for improvement.

Here is the transcript to analyze:

Transcript: {{{transcript}}}

Audio: {{media url=audioDataUri}}

Please provide your analysis, score, and feedback based on the transcript and audio provided.  Pay attention to indicators such as pace, volume, and use of filler words.  Consider the user is being interviewed for a job.
`,
});

const assessToneAndConfidenceFlow = ai.defineFlow(
  {
    name: 'assessToneAndConfidenceFlow',
    inputSchema: AssessToneAndConfidenceInputSchema,
    outputSchema: AssessToneAndConfidenceOutputSchema,
  },
  async input => {
    const {output} = await assessToneAndConfidencePrompt(input);
    return output!;
  }
);
