
export interface LogisticsTime {
  totalDurationHours: number;
  drivingTimeHours: number;
  breakTimeHours: number;
  restTimeHours: number;
  breakCount: number;
  restCount: number;
  isExtendedDriving: boolean;
  dailyRestDuration: number;
}

export const calculateLogisticsTime = (
  pureDrivingHours: number, 
  maxDailyDriving: number = 9.0,
  dailyRestDuration: number = 11.0
): LogisticsTime => {
  const MAX_CONTINUOUS_DRIVING = 4.5;
  const BREAK_DURATION = 0.75; // 45 minutes
  
  let remainingDriving = pureDrivingHours;
  let drivenToday = 0;
  let accumulatedTime = 0;
  
  let breakCount = 0;
  let restCount = 0;
  let breakTimeHours = 0;
  let restTimeHours = 0;

  // Loop until all driving time is consumed
  while (remainingDriving > 0.001) {
    // Determine how much we can drive in the current segment
    // We stop at either: 
    // 1. End of route
    // 2. Max continuous limit (4.5h)
    // 3. Max daily limit (9h or 10h) - knowing how much we already drove today
    
    const timeToNextContinuousBreak = MAX_CONTINUOUS_DRIVING;
    const timeToNextDailyRest = maxDailyDriving - drivenToday;
    
    // The actual drive stint is the smallest of these constraints
    const driveStint = Math.min(remainingDriving, timeToNextContinuousBreak, timeToNextDailyRest);

    accumulatedTime += driveStint;
    drivenToday += driveStint;
    remainingDriving -= driveStint;

    // Check if we still have driving to do
    if (remainingDriving > 0.001) {
      // Priority 1: Daily Limit Reached (9h or 10h) -> Must take Daily Rest
      if (drivenToday >= maxDailyDriving - 0.001) {
        accumulatedTime += dailyRestDuration;
        restTimeHours += dailyRestDuration;
        restCount++;
        drivenToday = 0; // New day starts
        // Note: A daily rest also resets the continuous driving counter naturally
      } 
      // Priority 2: Continuous Limit Reached (4.5h) -> Must take 45min Break
      // We check if we hit the continuous limit AND we haven't just taken a daily rest
      else if (Math.abs(driveStint - MAX_CONTINUOUS_DRIVING) < 0.001 || (drivenToday > 0 && drivenToday % MAX_CONTINUOUS_DRIVING < 0.001)) {
        // Only take a short break if we aren't taking a daily rest
        accumulatedTime += BREAK_DURATION;
        breakTimeHours += BREAK_DURATION;
        breakCount++;
        // Continuous counter effectively resets after break, 
        // but 'drivenToday' keeps counting towards the daily limit.
      }
    }
  }

  return {
    totalDurationHours: accumulatedTime,
    drivingTimeHours: pureDrivingHours,
    breakTimeHours,
    restTimeHours,
    breakCount,
    restCount,
    isExtendedDriving: maxDailyDriving > 9.0,
    dailyRestDuration
  };
};
