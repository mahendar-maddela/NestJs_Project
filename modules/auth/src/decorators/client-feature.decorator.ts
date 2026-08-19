import { SetMetadata } from '@nestjs/common';

export const CLIENT_FEATURE_KEY = 'client_feature';
export const ClientFeatureRequired = (feature: string) => SetMetadata(CLIENT_FEATURE_KEY, feature);
