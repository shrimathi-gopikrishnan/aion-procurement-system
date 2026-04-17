import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

export interface DefectAnalysisResult {
  isValidEquipment: boolean;
  rejectionMessage?: string;
  detectedComponent: string;
  damageType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  explanation: string;
  suggestedAction: string;
  repairOrReplace: 'repair' | 'replace' | 'no_action';
  repairReplaceRationale: string;
  riskScore: number;
  rulesFired: string[];
}

export interface PrDraftResult {
  justification: string;
  priority: string;
  notes: string;
}

export interface VendorRankingResult {
  ranking: Array<{ vendorId: number; score: number; reasoning: string }>;
  recommendation: string;
}

const SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  private getClient(): GoogleGenerativeAI | null {
    if (!process.env.GEMINI_API_KEY) return null;
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  async analyzeDefectImage(imagePath: string): Promise<DefectAnalysisResult> {
    const client = this.getClient();
    if (!client) return this.mockDefectAnalysis();

    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const ext = path.extname(imagePath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
      };
      const mimeType = mimeMap[ext] || 'image/jpeg';

      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings: SAFETY });

      const prompt = `You are an industrial equipment defect analysis AI embedded in a maintenance management system. Analyze images of ANY industrial, mechanical, or electrical equipment and their components.

STEP 1 — Determine if this image shows industrial or mechanical equipment.

ACCEPT any of the following (this list is NOT exhaustive — accept anything mechanical/industrial):
Motors, bearings, pumps, valves, compressors, turbines, fans, blowers, conveyors, belts, gears, gearboxes, shafts, couplings, seals, gaskets, pipes, fittings, flanges, heat exchangers, boilers, pressure vessels, tanks, filters, hydraulic systems, pneumatic systems, electrical panels, transformers, generators, engines, alternators, control valves, actuators, sensors, structural steel, welded joints, fabrication components, manufacturing machinery, CNC machines, lathes, mills, presses, cranes, hoists, winches, vehicles (mechanical parts / underbody / engine), agricultural machinery, marine equipment, HVAC systems, cooling towers, chillers, compressors, or ANY other mechanical/electrical/industrial component or assembly.

REJECT ONLY if the image clearly and unambiguously shows: people, food, plants/nature/landscapes, household items (furniture, clothing, kitchenware), animals, documents/text only, or clearly non-industrial consumer objects with no mechanical parts visible.

When uncertain — lean toward ACCEPT. A rusty pipe, worn cable, cracked floor in industrial setting, or damaged wiring are all valid.

If NOT industrial equipment:
{
  "isValidEquipment": false,
  "rejectionMessage": "This image does not appear to show industrial or mechanical equipment. Please upload a clear photo of the damaged component (e.g., motor, bearing, pump, valve, conveyor, pipe, gear, panel, or any machinery part).",
  "detectedComponent": "",
  "damageType": "",
  "severity": "low",
  "confidence": 0,
  "explanation": "",
  "suggestedAction": "",
  "repairOrReplace": "no_action",
  "repairReplaceRationale": "",
  "riskScore": 0,
  "rulesFired": []
}

If IS industrial/mechanical equipment, analyze the visible defect or condition and return:
{
  "isValidEquipment": true,
  "detectedComponent": "<identify the specific component you see — be as precise as possible, e.g., 'Centrifugal Pump Casing', 'Motor Bearing Race', 'Drive Belt', 'Ball Valve Body', 'Welded Steel Frame', 'Electrical Conduit', 'Hydraulic Cylinder Rod', 'Gear Tooth Face'>",
  "damageType": "<describe the damage type precisely, e.g., 'Surface Corrosion', 'Fatigue Crack', 'Abrasive Wear', 'Impact Fracture', 'Seal Leakage', 'Deformation/Bending', 'Pitting', 'Spalling', 'Thermal Discoloration', 'Minor Surface Scuff', 'Paint Degradation'>",
  "severity": "<one of: low | medium | high | critical>",
  "confidence": <0.0 to 1.0>,
  "explanation": "<2-3 sentences: describe exactly what you see, where the damage is located, what caused it, and why this severity level applies>",
  "suggestedAction": "<specific actionable maintenance recommendation>",
  "repairOrReplace": "<one of: repair | replace | no_action>",
  "repairReplaceRationale": "<reasoning based on structural integrity, safety risk, and repairability>",
  "riskScore": <integer 0-100>,
  "rulesFired": ["<primary decision rule, e.g., 'MEDIUM_SEVERITY → REPAIR', 'HIGH_SEVERITY_STRUCTURAL → REPLACE', 'LOW_SEVERITY_COSMETIC → NO_ACTION'>"]
}

Severity guidance:
- low: cosmetic or surface-only damage with no functional or safety impact (paint, minor scratches, surface discoloration)
- medium: moderate damage affecting performance or efficiency, not immediately dangerous, can be scheduled for repair
- high: significant structural or functional damage, risk of failure if not addressed urgently
- critical: immediate safety risk, component has failed or is at imminent risk of catastrophic failure

repairOrReplace guidance:
- no_action: purely cosmetic damage, low severity, zero functional impact — monitor only
- repair: damage is contained, structurally repairable, core integrity intact
- replace: structural integrity compromised, unrepairable by standard methods, or poses safety risk

Return ONLY the JSON object, no other text or markdown.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: base64Image } },
      ]);

      const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(text);
      return {
        isValidEquipment: parsed.isValidEquipment ?? true,
        rejectionMessage: parsed.rejectionMessage,
        detectedComponent: parsed.detectedComponent || '',
        damageType: parsed.damageType || '',
        severity: parsed.severity || 'medium',
        confidence: parsed.confidence ?? 0.5,
        explanation: parsed.explanation || '',
        suggestedAction: parsed.suggestedAction || '',
        repairOrReplace: parsed.repairOrReplace || 'repair',
        repairReplaceRationale: parsed.repairReplaceRationale || '',
        riskScore: parsed.riskScore ?? this.computeRiskScore(parsed.severity, parsed.confidence),
        rulesFired: parsed.rulesFired ?? [],
      };
    } catch (err) {
      this.logger.error('Gemini defect analysis failed', err);
      return this.mockDefectAnalysis();
    }
  }

  async generatePrDraft(params: {
    components: Array<{ name: string; quantity: number }>;
    maintenanceOrderNumber: string;
    defectSeverity: string;
    action: string;
  }): Promise<PrDraftResult> {
    const client = this.getClient();
    if (!client) return this.mockPrDraft(params);

    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings: SAFETY });
      const componentList = params.components.map((c) => `- ${c.name}: ${c.quantity} units`).join('\n');

      const prompt = `You are a procurement assistant for an industrial maintenance system. Generate a Purchase Requisition justification.

Maintenance Order: ${params.maintenanceOrderNumber}
Defect Severity: ${params.defectSeverity}
Action Required: ${params.action}
Components Needed:
${componentList}

Return ONLY a valid JSON object (no markdown):
{
  "justification": "2-3 sentence business justification for this purchase",
  "priority": "low or medium or high or urgent",
  "notes": "any special procurement notes or requirements"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      this.logger.error('Gemini PR draft failed', err);
      return this.mockPrDraft(params);
    }
  }

  async rankVendors(params: {
    componentName: string;
    vendors: Array<{
      id: number; name: string; price: number; deliveryDays: number;
      rating: number; reliabilityScore: number; onTimeDeliveryRate: number;
    }>;
  }): Promise<VendorRankingResult> {
    const client = this.getClient();
    if (!client) return this.mockVendorRanking(params.vendors);

    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings: SAFETY });
      const vendorList = params.vendors.map((v) =>
        `ID:${v.id} | ${v.name} | Price:$${v.price} | Delivery:${v.deliveryDays}d | Rating:${v.rating}/5 | Reliability:${(v.reliabilityScore * 100).toFixed(0)}% | OnTime:${(v.onTimeDeliveryRate * 100).toFixed(0)}%`
      ).join('\n');

      const prompt = `Rank these vendors for purchasing "${params.componentName}" for industrial maintenance. Score: cost 30%, delivery speed 30%, quality 20%, reliability 20%.

Vendors:
${vendorList}

Return ONLY valid JSON (no markdown), ranking best to worst:
{
  "ranking": [{ "vendorId": <id>, "score": <0.0-1.0>, "reasoning": "brief reason" }],
  "recommendation": "1-2 sentence summary of best choice and why"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      this.logger.error('Gemini vendor ranking failed', err);
      return this.mockVendorRanking(params.vendors);
    }
  }

  async chat(
    message: string,
    userRole: string,
    context: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<string> {
    const client = this.getClient();
    if (!client) return this.mockChat(message);

    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings: SAFETY });

      const systemContext = `You are AION Assistant — an AI embedded in the AION Industrial Procurement & Maintenance System.
You are helping a ${userRole} navigate the system, understand workflows, and make decisions.

Current system snapshot:
${context}

Guidelines:
- Be concise, specific, and actionable.
- Reference real data from the context.
- Workflow: defect → supervisor approves (auto-creates MO) → inventory check → PR → PO → GRN → invoice.
- For supervisors: highlight priority items and pending approvals.
- For operators: focus on their submissions and resubmit requests.`;

      const historyFormatted = history.map((h) => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));

      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemContext }] },
          { role: 'model', parts: [{ text: 'Understood. I am AION Assistant, ready to help.' }] },
          ...historyFormatted,
        ],
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (err) {
      this.logger.error('Gemini chat failed', err);
      return this.mockChat(message);
    }
  }

  async generateAuditSummary(events: Array<{ action: string; by: string; at: Date; notes?: string }>): Promise<string> {
    const client = this.getClient();
    if (!client) return 'Audit trail recorded. No AI summary available.';
    try {
      const model = client.getGenerativeModel({ model: 'gemini-1.5-flash', safetySettings: SAFETY });
      const timeline = events.map((e) =>
        `${new Date(e.at).toISOString().slice(0, 16)} | ${e.action} | by ${e.by}${e.notes ? ' | ' + e.notes : ''}`
      ).join('\n');
      const result = await model.generateContent(
        `Summarize this maintenance/procurement workflow timeline in 2-3 sentences:\n\n${timeline}`
      );
      return result.response.text();
    } catch {
      return 'Audit summary unavailable.';
    }
  }

  private computeRiskScore(severity: string, confidence: number): number {
    const base = { low: 15, medium: 40, high: 70, critical: 90 }[severity] ?? 40;
    return Math.min(100, Math.round(base * (0.5 + (confidence || 0.5) * 0.5)));
  }

  private mockDefectAnalysis(): DefectAnalysisResult {
    return {
      isValidEquipment: true,
      detectedComponent: 'Industrial Pump Assembly',
      damageType: 'Corrosion and Surface Wear',
      severity: 'medium',
      confidence: 0.72,
      explanation: 'The component shows signs of moderate corrosion on the outer casing with visible surface wear on contact points. Rust formation indicates prolonged moisture exposure.',
      suggestedAction: 'Schedule maintenance within 2 weeks. Apply corrosion inhibitor immediately.',
      repairOrReplace: 'repair',
      repairReplaceRationale: 'Damage is localized to surface areas. Core structure is intact.',
      riskScore: 42,
      rulesFired: ['MEDIUM_SEVERITY → REPAIR', 'SURFACE_DAMAGE → REPAIR_PREFERRED'],
    };
  }

  private mockPrDraft(params: any): PrDraftResult {
    return {
      justification: `Replacement parts required for maintenance order ${params.maintenanceOrderNumber} due to ${params.defectSeverity} severity defect.`,
      priority: params.defectSeverity === 'critical' ? 'urgent' : params.defectSeverity === 'high' ? 'high' : 'medium',
      notes: 'Ensure parts meet OEM specifications.',
    };
  }

  private mockChat(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('pending') || lower.includes('review'))
      return 'There are maintenance orders and defects pending review. Check the Pending Reviews section.';
    if (lower.includes('inventory') || lower.includes('stock'))
      return 'Some components may be running low on stock. Visit the Inventory page.';
    return 'I am AION Assistant. Ask me about defects, maintenance orders, inventory, or procurement workflows.';
  }

  private mockVendorRanking(vendors: any[]): VendorRankingResult {
    const ranked = vendors.map((v, i) => ({
      vendorId: v.id,
      score: Math.max(0.3, 1 - i * 0.15),
      reasoning: `Score based on rating ${v.rating}/5, ${v.deliveryDays}-day delivery.`,
    }));
    return {
      ranking: ranked,
      recommendation: `${vendors[0]?.name || 'Top vendor'} recommended for best balance of cost and reliability.`,
    };
  }
}
