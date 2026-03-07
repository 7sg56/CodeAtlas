/**
 * Phase 12 - AWS Storage Integration
 * 
 * Handles persistence of repository intelligence analysis to S3 and DynamoDB.
 * Safely handles missing AWS SDK modules.
 */

let S3Client, PutObjectCommand, DynamoDBClient, DynamoDBDocumentClient, PutCommand;

try {
  ({ S3Client, PutObjectCommand } = require("@aws-sdk/client-s3"));
  ({ DynamoDBClient } = require("@aws-sdk/client-dynamodb"));
  ({ DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb"));
} catch (e) {
  console.warn("[AWS Storage] SDK not installed. AWS persistence will be disabled.");
}

const region = process.env.AWS_REGION || "us-east-1";
const isAWSConfigured = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && S3Client;

const s3Client = isAWSConfigured ? new S3Client({ region }) : null;
const dbClient = (isAWSConfigured && DynamoDBClient) ? new DynamoDBClient({ region }) : null;
const docClient = (dbClient && DynamoDBDocumentClient) ? DynamoDBDocumentClient.from(dbClient) : null;

/**
 * Stores full analysis JSON to S3.
 * @param {string} repoId - Unique repository instance ID.
 * @param {object} analysis - The complete analysis payload.
 */
async function storeAnalysisToS3(repoId, analysis) {
  if (!s3Client || !process.env.S3_BUCKET_NAME || !PutObjectCommand) {
    if (!s3Client) console.log(`[AWS S3] Skipping storage for ${repoId}: S3 is not configured or SDK is missing.`);
    return null;
  }

  const key = `analysis/${repoId}.json`;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(analysis),
    ContentType: "application/json"
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    console.log(`[AWS S3] Analysis stored for ${repoId} at ${key}`);
    return `s3://${process.env.S3_BUCKET_NAME}/${key}`;
  } catch (err) {
    console.error(`[AWS S3] Failed to store analysis: ${err.message}`);
    return null;
  }
}

/**
 * Stores repository metadata to DynamoDB.
 * @param {string} repoId 
 * @param {string} repoName 
 * @param {string} status 
 * @param {string} s3Url
 */
async function storeMetadataToDynamo(repoId, repoName, status, s3Url = null) {
  if (!docClient || !process.env.DYNAMODB_TABLE_NAME || !PutCommand) {
    if (!docClient) console.log(`[AWS DynamoDB] Skipping metadata for ${repoId}: DynamoDB is not configured or SDK is missing.`);
    return null;
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Item: {
      repoId,
      repoName,
      analysisStatus: status,
      s3Url,
      updatedAt: new Date().toISOString()
    }
  };

  try {
    await docClient.send(new PutCommand(params));
    console.log(`[AWS DynamoDB] Metadata stored for ${repoId}`);
    return true;
  } catch (err) {
    console.error(`[AWS DynamoDB] Failed to store metadata: ${err.message}`);
    return null;
  }
}

module.exports = { storeAnalysisToS3, storeMetadataToDynamo };
