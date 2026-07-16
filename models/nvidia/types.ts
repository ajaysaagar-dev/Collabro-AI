export interface ModelOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  onChunk?: (chunk: string) => void;
}
