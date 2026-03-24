export function generateSeat(seatType, trainName = "") {
  const seatNo = Math.floor(Math.random() * 60) + 1;
  const coachNo = Math.floor(Math.random() * 5) + 1;

  const wsAs = ["WS", "AS"];
  const sleeperBerths = ["LB", "UB", "MB", "SL", "SU"];

  if (seatType === "DOUBLE_DECKER") {
    const deck = Math.random() > 0.5 ? "L" : "U"; // Lower or Upper
    const seatLabel = wsAs[Math.floor(Math.random() * wsAs.length)];

    return `CNF/C${coachNo}${deck}/${seatNo}/${seatLabel}`;
  }

  if (seatType === "VANDE_BHARAT") {
    return `CNF/C${coachNo}/${seatNo}/WS`;
  }

  if (seatType === "SLEEPER") {
    return `CNF/S${coachNo}/${seatNo}/${sleeperBerths[Math.floor(Math.random() * sleeperBerths.length)]}`;
  }

  if (seatType === "AC_3_TIER") {
    return `CNF/B${coachNo}/${seatNo}/${sleeperBerths[Math.floor(Math.random() * sleeperBerths.length)]}`;
  }

  if (seatType === "CC" || seatType === "CC_STANDARD") {
    const normalizedTrainName = String(trainName || "").toUpperCase();
    const isTejas = normalizedTrainName.includes("TEJAS");
    const maxChairCoach = isTejas ? 10 : 2;
    const chairCoachNo = Math.floor(Math.random() * maxChairCoach) + 1;
    const chairSeatNo = Math.floor(Math.random() * 60) + 1;
    const seatLabel = wsAs[Math.floor(Math.random() * wsAs.length)];

    return `CNF/C${chairCoachNo}/${chairSeatNo}/${seatLabel}`;
  }

  // Unknown seat type: keep output format stable, but avoid always returning seat 1
  return `CNF/C${coachNo}/${seatNo}/WS`;
}
