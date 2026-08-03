import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marque une route (ou un controller) comme accessible sans JWT. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
