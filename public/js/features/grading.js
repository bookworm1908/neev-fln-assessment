/**
 * Neev FLN Assessor - Grading & Benchmarking Logic
 * Handles calculations for 4-Tier Assessment Standards and Grade Alignment
 */

export const Grading = {
    // Literacy: Calculates Words Correct Per Minute (WCPM) and Accuracy
    calculateLiteracyMetrics: function(totalWordsRead, errorCount, durationSeconds) {
        const correctWords = Math.max(0, totalWordsRead - errorCount);
        const accuracy = totalWordsRead > 0 ? Math.round((correctWords / totalWordsRead) * 100) : 0;
        
        // WCPM formula: (Correct Words / duration in seconds) * 60
        const durationMinutes = durationSeconds / 60;
        const wcpm = durationMinutes > 0 ? Math.round(correctWords / durationMinutes) : 0;

        return { correctWords, accuracy, wcpm };
    },

    // Evaluates if the student met the criteria for the selected Tier
    evaluateLiteracyTier: function(tier, wcpm, accuracy, compCorrect, compTotal) {
        let passed = false;
        if (tier === 1) {
            passed = wcpm >= 45 && accuracy >= 80 && compCorrect >= 1;
        } else if (tier === 2) {
            passed = wcpm >= 70 && accuracy >= 85 && compCorrect >= 2;
        } else if (tier === 3) {
            passed = wcpm >= 90 && accuracy >= 90 && compCorrect >= 2;
        } else if (tier === 4) {
            passed = wcpm >= 110 && accuracy >= 95 && compCorrect >= 3;
        }
        return passed;
    },

    // Numeracy: Evaluates if the student met the math criteria
    evaluateNumeracyTier: function(tier, recognitionScore, operationsScore) {
        let passed = false;
        if (tier === 1) {
            passed = recognitionScore >= 80 && operationsScore >= 3; // out of 5
        } else {
            passed = operationsScore >= 4; // out of 5 for tiers 2, 3, 4
        }
        return passed;
    },

    // Computes if student is Above/Below their demographic expected FLN level
    calculateGradeAlignment: function(demographicGrade, testedTier, passedSelectedTier) {
        // Expected Tier: Grade 1-3 = Tier 1, 4-6 = Tier 2, etc.
        const expectedTier = Math.ceil(demographicGrade / 3);
        
        if (passedSelectedTier && testedTier >= expectedTier) {
            return "at_or_above_grade_level";
        } else {
            return "below_grade_level";
        }
    }
};

