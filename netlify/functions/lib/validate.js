'use strict';

const { z } = require('zod');

const contactSchema = z.object({
  name:           z.string().min(1, 'name is required').max(120, 'name must be 120 characters or fewer'),
  message:        z.string().min(1, 'message is required').max(2000, 'message must be 2000 characters or fewer'),
  turnstileToken: z.string().optional(),
});

const briefSchema = z.object({
  name:           z.string().min(1, 'name is required').max(120, 'name must be 120 characters or fewer'),
  email:          z.string().email('valid email address is required').max(320, 'email too long'),
  phone:          z.string().max(20, 'phone must be 20 characters or fewer').optional(),
  project_type:   z.string().max(50).optional(),
  industry:       z.string().max(100).optional(),
  features:       z.string().max(500, 'features must be 500 characters or fewer').optional(),
  vision:         z.string().max(1000, 'vision must be 1000 characters or fewer').optional(),
  timeline:       z.string().max(50).optional(),
  budget:         z.string().max(50).optional(),
  turnstileToken: z.string().optional(),
});

const VALID_TIMES = ['10:00', '11:00', '14:00', '15:00', '16:00'];

const bookSchema = z.object({
  date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date format (expected YYYY-MM-DD)'),
  time:  z.enum(VALID_TIMES, { errorMap: () => ({ message: 'invalid time slot' }) }),
  name:  z.string().min(1, 'name is required').max(120, 'name must be 120 characters or fewer'),
  phone: z.string().min(1, 'phone is required').max(20, 'phone must be 20 characters or fewer'),
  biz:   z.string().max(150, 'business name must be 150 characters or fewer').optional(),
  desc:  z.string().max(1000, 'description must be 1000 characters or fewer').optional(),
});

const slotsSchema = z.object({
  week: z.coerce.number().int('week must be an integer').min(0, 'week must be 0 or greater').max(52, 'week must be 52 or less'),
});

module.exports = { contactSchema, briefSchema, bookSchema, slotsSchema };
