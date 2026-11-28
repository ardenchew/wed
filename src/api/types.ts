/** Error body every API endpoint returns with a non-2xx status. */
export interface ApiErrorBody {
  error: string;
  /** Guest the error is about, when it's about one. */
  guest?: string;
}
