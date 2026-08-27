import { z } from 'zod';
import { ALLOWED_CATEGORIES } from '../types/document';

// UUID validation regex/schema
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format.' });

// Upload Document Body Validation Schema
export const uploadDocumentSchema = z.object({
  patient_id: z.string().uuid({ message: 'Patient ID must be a valid UUID.' }),
  document_name: z
    .string()
    .min(2, { message: 'Document name must be at least 2 characters long.' })
    .max(255, { message: 'Document name cannot exceed 255 characters.' }),
  document_category: z.string().refine((val) => ALLOWED_CATEGORIES.includes(val), {
    message: `Invalid document category. Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`,
  }),
  hospital_name: z.string().max(255, { message: 'Hospital name cannot exceed 255 characters.' }).optional().or(z.literal('')),
  doctor_name: z.string().max(255, { message: 'Doctor name cannot exceed 255 characters.' }).optional().or(z.literal('')),
  visit_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Visit date must be in YYYY-MM-DD format.' })
    .optional()
    .or(z.literal('')),
  is_handwritten: z
    .union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')])
    .optional(),
  document_format: z.enum(['PRINTED', 'HANDWRITTEN']).optional(),
  custom_metadata: z.record(z.string(), z.any()).optional(),
});

// Update Metadata Schema
export const updateDocumentMetadataSchema = z.object({
  document_name: z.string().min(2).max(255).optional(),
  document_category: z
    .string()
    .refine((val) => ALLOWED_CATEGORIES.includes(val), {
      message: `Invalid document category. Allowed categories: ${ALLOWED_CATEGORIES.join(', ')}`,
    })
    .optional(),
  hospital_name: z.string().max(255, { message: 'Hospital name cannot exceed 255 characters.' }).optional(),
  doctor_name: z.string().max(255, { message: 'Doctor name cannot exceed 255 characters.' }).optional(),
  visit_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Visit date must be in YYYY-MM-DD format.' })
    .optional(),
  is_handwritten: z
    .union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')])
    .optional(),
  document_format: z.enum(['PRINTED', 'HANDWRITTEN']).optional(),
});

// Search & Filter Query Schema
export const searchDocumentsQuerySchema = z.object({
  patient_id: z.string().optional(),
  document_category: z.string().optional(),
  hospital_name: z.string().optional(),
  doctor_name: z.string().optional(),
  is_handwritten: z
    .union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1')])
    .optional(),
  document_format: z.string().optional(),
  visit_date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  visit_date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  upload_date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  upload_date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  mime_type: z.string().optional(),
  search_query: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});
