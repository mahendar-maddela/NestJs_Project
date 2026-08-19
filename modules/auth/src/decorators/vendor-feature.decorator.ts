import { SetMetadata } from '@nestjs/common';

export const VENDOR_FEATURE_KEY = 'vendor_feature';
export const VendorFeatureRequired = (feature: string) => SetMetadata(VENDOR_FEATURE_KEY, feature);
