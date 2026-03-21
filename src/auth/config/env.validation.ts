import * as joi from 'joi';

export const validationSchema=joi.object({
   USER_SERVICE_URL: joi.string()
    .pattern(/^[a-zA-Z0-9.-]+:\d+$/)
    .required()
    .messages({
      'string.pattern.base': 'Service URL must be in host:port format (e.g., localhost:50052)'
    }),
    
  NOTIFICATION_SERVICE_URL: joi.string()
    .pattern(/^[a-zA-Z0-9.-]+:\d+$/)
    .required(),

    JWT_SECRET:joi.string().required(),
    JWT_EXPIRES_IN:joi.string().default('15m'),
    JWT_REFRESH_SECRET:joi.string().required(),
    JWT_REFRESH_EXPIRES_IN:joi.string().default('7d'),
})