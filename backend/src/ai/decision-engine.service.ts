import { Injectable } from '@nestjs/common';

export interface DecisionResult {
  decision: 'repair' | 'replace' | 'no_action';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  explanation: string[];
  rulesFired: string[];
  estimatedDowntimeHours: number;
  safetyRisk: boolean;
}

const SAFETY_CRITICAL_COMPONENTS = [
  'turbine blade', 'compressor blade', 'fan blade', 'disk', 'rotor', 'shaft',
  'combustor', 'nozzle', 'motor bearing', 'hydraulic pump', 'pressure relief valve',
  'gear assembly', 'control valve', 'drive shaft', 'crankshaft',
];

const UNREPAIRABLE_DAMAGE = [
  'fracture', 'delamination', 'thermal fatigue crack', 'impact damage',
  'fod', 'complete failure', 'catastrophic', 'shattered', 'broken',
];

@Injectable()
export class DecisionEngineService {
  evaluate(params: {
    component: string;
    damageType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    aiDecision?: string;
  }): DecisionResult {
    const { component, damageType, severity, confidence, aiDecision } = params;
    const compLower = (component || '').toLowerCase();
    const damageLower = (damageType || '').toLowerCase();

    const rulesFired: string[] = [];
    const explanation: string[] = [];
    let decision: 'repair' | 'replace' | 'no_action' = 'repair';
    let safetyRisk = false;

    const COSMETIC_DAMAGE = ['scuff', 'scratch', 'minor surface', 'cosmetic', 'paint', 'discoloration', 'stain'];
    const isSafetyCritical = SAFETY_CRITICAL_COMPONENTS.some((s) => compLower.includes(s));
    const isUnrepairable = UNREPAIRABLE_DAMAGE.some((d) => damageLower.includes(d));
    const isCosmetic = COSMETIC_DAMAGE.some((d) => damageLower.includes(d));

    // Rule 1: Critical severity always replace
    if (severity === 'critical') {
      decision = 'replace';
      rulesFired.push('CRITICAL_SEVERITY → REPLACE');
      explanation.push('Critical severity damage requires immediate component replacement.');
      safetyRisk = true;
    }

    // Rule 2: Safety-critical component + high or critical severity → replace
    if (isSafetyCritical && (severity === 'high' || severity === 'critical')) {
      decision = 'replace';
      rulesFired.push('SAFETY_CRITICAL_COMPONENT + HIGH_SEVERITY → REPLACE');
      explanation.push(`${component} is a safety-critical part. High-severity damage mandates replacement per maintenance policy.`);
      safetyRisk = true;
    }

    // Rule 3: Unrepairable damage type → replace
    if (isUnrepairable) {
      decision = 'replace';
      rulesFired.push('UNREPAIRABLE_DAMAGE_TYPE → REPLACE');
      explanation.push(`Damage type "${damageType}" is classified as unrepairable — replacement required to prevent propagation.`);
    }

    // Rule 4: High severity (any component) → replace
    if (severity === 'high' && decision !== 'replace') {
      decision = 'replace';
      rulesFired.push('HIGH_SEVERITY → REPLACE');
      explanation.push('High severity damage typically warrants replacement for long-term reliability.');
    }

    // Rule 5: Medium severity → repair
    if (severity === 'medium' && decision === 'repair') {
      rulesFired.push('MEDIUM_SEVERITY → REPAIR');
      explanation.push('Medium severity damage is within repairable limits with proper maintenance.');
    }

    // Rule 6: Low severity + cosmetic → no action
    if (severity === 'low' && isCosmetic) {
      decision = 'no_action';
      rulesFired.push('LOW_SEVERITY_COSMETIC → NO_ACTION');
      explanation.push('Cosmetic/surface damage with low severity. No corrective maintenance action required at this time. Monitor during next scheduled inspection.');
    } else if (severity === 'low') {
      decision = 'repair';
      rulesFired.push('LOW_SEVERITY → REPAIR');
      explanation.push('Low severity damage can be addressed through routine in-situ maintenance.');
    }

    // Rule 7: AI agreement validation
    if (aiDecision && aiDecision !== decision) {
      rulesFired.push(`AI_OVERRIDE_DETECTED (AI said ${aiDecision}, rules say ${decision})`);
      explanation.push(`Note: AI recommendation (${aiDecision}) differs from rule engine. Supervisor should review carefully.`);
    }

    const riskScore = this.computeRiskScore(severity, confidence, isSafetyCritical, isUnrepairable);
    const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';
    const estimatedDowntimeHours = decision === 'replace'
      ? (isSafetyCritical ? 48 : 24)
      : decision === 'no_action'
      ? 0
      : (severity === 'medium' ? 8 : 4);

    return { decision, riskLevel, riskScore, explanation, rulesFired, estimatedDowntimeHours, safetyRisk };
  }

  private computeRiskScore(
    severity: string,
    confidence: number,
    isSafetyCritical: boolean,
    isUnrepairable: boolean,
  ): number {
    const severityWeight = { low: 15, medium: 40, high: 65, critical: 85 }[severity] ?? 40;
    const confidenceMultiplier = 0.6 + confidence * 0.4;
    const safetyBonus = isSafetyCritical ? 15 : 0;
    const unrepairableBonus = isUnrepairable ? 10 : 0;
    return Math.min(100, Math.round(severityWeight * confidenceMultiplier + safetyBonus + unrepairableBonus));
  }
}
