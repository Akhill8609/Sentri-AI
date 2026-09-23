from typing import List, Dict, Any

class RiskScorer:
    """
    Transparent, explainable 0-100 risk scoring engine for SentriAI.
    Scores are strictly grounded in observable indicators.

    Categories:
    0–24  = LOW ("Low Risk" / "Likely Benign")
    25–49 = MEDIUM ("Potentially Suspicious" / "Requires Caution")
    50–74 = HIGH ("Likely Phishing" / "Possible Social Engineering")
    75–100 = CRITICAL ("Severe Threat" / "Active Attack / Compromise")
    """

    def calculate_score(self, observed_indicators: List[Dict[str, Any]]) -> Dict[str, Any]:
        raw_score = 0
        breakdown = []

        for ind in observed_indicators:
            pts = ind.get("points", ind.get("weight", 10))
            raw_score += pts
            breakdown.append({
                "indicator": ind.get("name", ind.get("indicator_type", "Threat Indicator")),
                "points": pts,
                "explanation": ind.get("description", ind.get("value", ""))
            })

        # Cap score between 0 and 100
        score = min(100, max(0, raw_score))

        if score < 25:
            severity = "LOW"
            assessment_label = "Low Risk / Likely Benign"
            color = "mint"
        elif score < 50:
            severity = "MEDIUM"
            assessment_label = "Potentially Suspicious / Requires Review"
            color = "peach"
        elif score < 75:
            severity = "HIGH"
            assessment_label = "Likely Phishing / Possible Social Engineering"
            color = "rose"
        else:
            severity = "CRITICAL"
            assessment_label = "Critical Risk / High Probability of Attack"
            color = "critical-red"

        confidence = 0.85
        if len(breakdown) >= 3:
            confidence = 0.95
        elif len(breakdown) >= 1:
            confidence = 0.90

        return {
            "score": score,
            "severity": severity,
            "assessment_label": assessment_label,
            "confidence": confidence,
            "color": color,
            "breakdown": breakdown
        }

risk_scorer = RiskScorer()
