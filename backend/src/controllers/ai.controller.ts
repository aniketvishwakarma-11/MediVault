import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { sendSuccess, sendError } from '../utils/response';
import { ValidationError } from '../errors/AppError';

export class AIController {
  public static async chat(req: Request, res: Response) {
    try {
      const { prompt, patient_id } = req.body;
      const patientId = patient_id || req.user?.patient_id || req.user?.id;

      if (!patientId) {
        throw new ValidationError(
          'PATIENT_ID_REQUIRED',
          'Patient identifier is required to access health records',
          'Patient Session Required',
          'To protect confidential medical history, a valid patient session or patient identifier must be provided.',
          'Please ensure you are logged in to your patient account.'
        );
      }

      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new ValidationError(
          'PROMPT_REQUIRED',
          'Prompt string parameter is required',
          'Question Required',
          'Please enter a health or document question for the AI Assistant.',
          'Type your question in the chat input.'
        );
      }

      const result = await AIService.generateHealthAnswer(patientId, prompt.trim());

      return sendSuccess(res, 200, result, 'AI response generated successfully');
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}
