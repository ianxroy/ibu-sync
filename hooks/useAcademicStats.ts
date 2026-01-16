import { useMemo, useState } from "react";
import { Grade } from "../types";
import { getSemesterOrder } from "../utils/helpers";

export const useAcademicStats = (
  grades: Grade[],
  units: Record<string, string>
) => {
  const [remainingUnits, setRemainingUnits] = useState<number>(30);

  const calculateGWA = (
    gradeList: Grade[],
    unitMap: Record<string, string>,
    ignoreMissing: boolean = false
  ): string => {
    let totalWeightedGrades = 0;
    let totalUnits = 0;

    for (const g of gradeList) {
      const gradeStr = g.grade.trim().toUpperCase();
      const isInvalid = ["N/A", "INC", "INCOMPLETE", "", "-"].includes(
        gradeStr
      );

      if (isInvalid) {
        if (ignoreMissing) continue;
        return "---";
      }

      const gradeVal = parseFloat(g.grade);
      if (!isNaN(gradeVal)) {
        const key = `${g.semester}-${g.subject}`;
        const unitValStr = unitMap[key];
        if (!unitValStr || unitValStr.trim() === "" || unitValStr === "-") {
          if (ignoreMissing) continue;
          return "---";
        }
        const unitVal = parseFloat(unitValStr);
        if (isNaN(unitVal)) {
          if (ignoreMissing) continue;
          return "---";
        }
        if (unitVal > 0) {
          totalWeightedGrades += gradeVal * unitVal;
          totalUnits += unitVal;
        }
      }
    }
    if (totalUnits === 0) return "---";
    return (totalWeightedGrades / totalUnits).toFixed(4);
  };

  const groupedGrades = useMemo(() => {
    const groups: Record<string, Grade[]> = {};
    grades.forEach((g: Grade) => {
      if (!groups[g.semester]) groups[g.semester] = [];
      groups[g.semester].push(g);
    });
    return groups;
  }, [grades]);

  const sortedSemesterEntries = useMemo(() => {
    return Object.entries(groupedGrades).sort(([semA], [semB]) => {
      const a = getSemesterOrder(semA);
      const b = getSemesterOrder(semB);
      if (a.startYear !== b.startYear) return b.startYear - a.startYear;
      return b.semOrder - a.semOrder;
    });
  }, [groupedGrades]);

  const overallStats = useMemo(() => {
    const runningGWAStr = calculateGWA(grades, units, true);
    const strictGWAStr = calculateGWA(grades, units, false);
    const isPartial = strictGWAStr === "---" && runningGWAStr !== "---";
    const totalGWA = runningGWAStr;
    let totalUnits = 0;
    let hasDisqualification = false;

    grades.forEach((g: Grade) => {
      const u = parseFloat(units[`${g.semester}-${g.subject}`] || "0");
      if (!isNaN(u) && !isNaN(parseFloat(g.grade))) totalUnits += u;
      const gradeVal = parseFloat(g.grade);
      if (!isNaN(gradeVal) && gradeVal > 3.0) {
        hasDisqualification = true;
      }
    });

    let bestSem = "N/A",
      bestGWA = 5.0;
    Object.entries(groupedGrades).forEach(([sem, items]) => {
      const semGWAStr = calculateGWA(items, units, true);
      if (semGWAStr !== "---") {
        const semGWA = parseFloat(semGWAStr);
        if (semGWA < bestGWA) {
          bestGWA = semGWA;
          bestSem = sem;
        }
      }
    });

    return {
      totalGWA: totalGWA === "---" ? "---" : parseFloat(totalGWA).toFixed(4),
      totalUnits,
      bestSem,
      bestGWA: bestGWA === 5.0 ? "---" : bestGWA.toFixed(4),
      isPartial,
      hasDisqualification,
    };
  }, [grades, units, groupedGrades]);

  const distinctions = useMemo(() => {
    if (grades.length === 0) return [];
    const sortedKeys = Object.keys(groupedGrades).sort((a, b) => {
      const orderA = getSemesterOrder(a);
      const orderB = getSemesterOrder(b);
      if (orderA.startYear !== orderB.startYear)
        return orderA.startYear - orderB.startYear;
      return orderA.semOrder - orderB.semOrder;
    });

    const items: {
      period: string;
      gwa: string;
      title: string;
      color: string;
    }[] = [];

    for (let i = 0; i < sortedKeys.length - 1; i++) {
      const currentSem = sortedKeys[i];
      const nextSem = sortedKeys[i + 1];
      const orderC = getSemesterOrder(currentSem);
      const orderN = getSemesterOrder(nextSem);
      const isConsecutivePair =
        orderC.semOrder === 2 &&
        orderN.semOrder === 1 &&
        orderN.startYear === orderC.startYear + 1;

      if (isConsecutivePair) {
        const batchGrades = [
          ...(groupedGrades[currentSem] || []),
          ...(groupedGrades[nextSem] || []),
        ];
        const disqualified = batchGrades.some((g) => {
          const val = parseFloat(g.grade);
          return !isNaN(val) && val > 2.4;
        });

        if (!disqualified) {
          const gwaStr = calculateGWA(batchGrades, units, false);
          if (gwaStr !== "---") {
            const gwa = parseFloat(gwaStr);
            if (gwa <= 1.45) {
              items.push({
                period: `${currentSem} & ${nextSem}`,
                gwa: gwaStr,
                title: "President's Lister",
                color: "from-yellow-400 to-amber-600",
              });
            } else if (gwa <= 1.75) {
              items.push({
                period: `${currentSem} & ${nextSem}`,
                gwa: gwaStr,
                title: "Dean's Lister",
                color: "from-blue-400 to-indigo-600",
              });
            }
          }
        }
      }
    }
    return items.reverse();
  }, [groupedGrades, units, grades]);

  const honorForecasts = useMemo(() => {
    if (overallStats.totalGWA === "---") return [];
    const currentGWA = parseFloat(overallStats.totalGWA);
    const currentUnits = overallStats.totalUnits;
    const totalUnitsProjected = currentUnits + remainingUnits;

    const honors = [
      {
        name: "Summa Cum Laude",
        cutoff: 1.25,
        color: "text-yellow-600",
        bg: "bg-yellow-50 border-yellow-200",
      },
      {
        name: "Magna Cum Laude",
        cutoff: 1.45,
        color: "text-blue-600",
        bg: "bg-blue-50 border-blue-200",
      },
      {
        name: "Cum Laude",
        cutoff: 1.75,
        color: "text-emerald-600",
        bg: "bg-emerald-50 border-emerald-200",
      },
    ];

    return honors.map((h) => {
      if (overallStats.hasDisqualification) {
        return {
          ...h,
          status: "Disqualified",
          needed: 0,
          probability: 0,
          msg: "Grade > 3.0 detected",
        };
      }
      if (currentGWA <= h.cutoff) {
        return {
          ...h,
          status: "On Track",
          needed: h.cutoff,
          probability: 98,
          msg: "Maintain current performance",
        };
      }
      if (remainingUnits <= 0) {
        return {
          ...h,
          status: "Impossible",
          needed: 0,
          probability: 0,
          msg: "Mathematical limit reached",
        };
      }
      const maxTotalPoints = h.cutoff * totalUnitsProjected;
      const currentPoints = currentGWA * currentUnits;
      const requiredGrade = (maxTotalPoints - currentPoints) / remainingUnits;
      let prob = 0;
      let status = "";
      if (requiredGrade < 1.0) {
        (status = "Impossible"), (prob = 0);
      } else if (requiredGrade <= 1.1) {
        (status = "Near Impossible"), (prob = 5);
      } else if (requiredGrade <= 1.25) {
        (status = "Very Hard"), (prob = 25);
      } else if (requiredGrade <= 1.5) {
        (status = "Challenging"), (prob = 50);
      } else if (requiredGrade <= 1.75) {
        (status = "Possible"), (prob = 75);
      } else if (requiredGrade <= 2.25) {
        (status = "Likely"), (prob = 90);
      } else {
        (status = "Very Likely"), (prob = 99);
      }

      return {
        ...h,
        status,
        needed: requiredGrade.toFixed(2),
        probability: prob,
        msg:
          requiredGrade < 1.0
            ? "Requires > 1.0 avg"
            : `Need avg grade of ${requiredGrade.toFixed(2)}`,
      };
    });
  }, [overallStats, remainingUnits]);

  return {
    groupedGrades,
    sortedSemesterEntries,
    overallStats,
    distinctions,
    honorForecasts,
    remainingUnits,
    setRemainingUnits,
    calculateGWA,
  };
};
