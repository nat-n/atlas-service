export const SHAPESET_BUCKET_NAME = process.env.SHAPESET_BUCKET_NAME;
export const REGION               = process.env.SERVERLESS_REGION;
export const RESPONSE_BUCKET_NAME = process.env.RESPONSE_BUCKET_NAME;
export const RESPONSE_BUCKET_URL  = `http://${RESPONSE_BUCKET_NAME}.s3-website-${REGION}.amazonaws.com`;
export const MAX_RESPONSE_SIZE    = 2000000;
