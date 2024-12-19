export interface AwsConfig {
  awsRegion?: string;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
}

export const defaultConfig = {
  awsRegion: 'eu-west-1'
};
