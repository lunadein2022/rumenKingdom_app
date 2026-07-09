import type { AppMockData } from "../app/types";
import type { SerinExecutionResult, SerinServiceMessageInput } from "../features/serin/types/serin.types";

export interface PrincessOsRepository {
  getSnapshot(): AppMockData;
  sendSerinMessage(input: SerinServiceMessageInput): Promise<SerinExecutionResult>;
}
