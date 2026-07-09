import { useState } from "react";
import { addCastleExp, getCastleState } from "../services/castleService";

export function useCastle() {
  const [castleState, setCastleState] = useState(getCastleState());

  return {
    castleState,
    addCastleExp: (exp: number) => setCastleState((current) => addCastleExp(current, exp)),
  };
}
