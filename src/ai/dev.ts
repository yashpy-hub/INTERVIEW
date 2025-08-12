import { config } from 'dotenv';
config();

import '@/ai/flows/generate-performance-report.ts';
import '@/ai/flows/generate-interview-questions.ts';
import '@/ai/flows/assess-tone-and-confidence.ts';
import '@/ai/flows/analyze-interview-response.ts';