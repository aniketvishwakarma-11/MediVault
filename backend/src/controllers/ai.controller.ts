import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { sendSuccess, sendError } from '../utils/response';

export class AIController {
  public static async chat(req: Request, res: Response) {
    try {
      const { prompt, patient_id } = req.body;
      const patientId = patient_id || req.user?.patient_id || 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';

      if (!prompt || typeof prompt !== 'string') {
        return sendError(res, 400, 'Prompt string parameter is required.');
      }

      const result = await AIService.generateHealthAnswer(patientId, prompt);

      return sendSuccess(res, 200, 'AI response generated successfully', result);
    } catch (err: any) {
      return sendError(res, 500, err.message || 'AI generation failed');
    }
  }
}
