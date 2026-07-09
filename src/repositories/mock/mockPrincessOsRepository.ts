import { getPrincessOsSnapshot } from "../../data/mockRepository";
import { sendMessage } from "../../features/serin/services/serinService";
import type { PrincessOsRepository } from "../types";

export const mockPrincessOsRepository: PrincessOsRepository = {
  getSnapshot() {
    return getPrincessOsSnapshot();
  },
  sendSerinMessage(input) {
    return sendMessage(input);
  },
};
