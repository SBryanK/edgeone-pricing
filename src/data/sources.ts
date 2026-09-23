/**
 * Where each price in ./pricing.ts comes from, and whether it was re-checked
 * against the official Tencent Cloud EdgeOne documentation on PRICING_AS_OF.
 *
 *  - 'verified'  — the figure (or the rule that derives it) is stated in the
 *                  linked official page.
 *  - 'reference' — carried over from the previous internal price sheet and
 *                  NOT re-confirmed in the official docs during the last
 *                  review. Treat as indicative and confirm before quoting.
 *
 * When you re-verify an item, update its entry here and PRICING_AS_OF.
 */

export type VerificationStatus = 'verified' | 'reference';

export interface PriceSource {
  status: VerificationStatus;
  url: string;
  /** Short English note shown in tooltips / exports. */
  note?: string;
}

const DOCS = {
  billingOverview: 'https://www.tencentcloud.com/document/product/1145/55640',
  planFees: 'https://www.tencentcloud.com/document/product/1145/55642',
  planComparison: 'https://www.tencentcloud.com/document/product/1145/55650',
  outOfPlan: 'https://www.tencentcloud.com/document/product/1145/55643',
  vau: 'https://www.tencentcloud.com/document/product/1145/55645',
  crossBorder: 'https://www.tencentcloud.com/document/product/1145/57404',
  ddosDefender: 'https://edgeone.ai/document/74807',
  edgeFunctions: 'https://edgeone.ai/document/68358',
  logAnalysis: 'https://edgeone.ai/document/77324',
  edgeInference: 'https://edgeone.ai/document/78862',
  imageProcessing: 'https://edgeone.ai/document/54771',
  pricingPage: 'https://edgeone.ai/pricing',
} as const;

export const OFFICIAL_DOCS = DOCS;

export const PRICE_SOURCES: Record<string, PriceSource> = {
  plan_personal: { status: 'verified', url: DOCS.planFees, note: 'List price $4.2/month; 50 GB traffic included.' },
  plan_basic: { status: 'verified', url: DOCS.planFees, note: 'List price $57/month; 500 GB traffic and 20M requests included.' },
  plan_standard: { status: 'reference', url: DOCS.planFees, note: 'Quota (3 TB, 50M requests) verified; the $590 list price was not re-confirmed.' },
  enterprise_postpaid: { status: 'reference', url: DOCS.pricingPage, note: 'Enterprise fee is not published; contact sales.' },
  enterprise_prepaid: { status: 'reference', url: DOCS.pricingPage, note: 'Enterprise fee is not published; contact sales.' },

  l7_traffic: { status: 'verified', url: DOCS.outOfPlan, note: 'Chinese-mainland tiers and the attained/progressive rules verified from official examples; other regions carried over.' },
  l4_traffic: { status: 'verified', url: DOCS.outOfPlan, note: 'Chinese-mainland 10–50 TB rate verified from the official example; other cells carried over.' },
  l7_bandwidth: { status: 'reference', url: DOCS.outOfPlan },
  l4_bandwidth: { status: 'reference', url: DOCS.outOfPlan },
  http_requests: { status: 'reference', url: DOCS.outOfPlan, note: 'Linear monthly pricing confirmed; the unit price was not re-confirmed.' },

  quic_requests: { status: 'verified', url: DOCS.vau, note: '100 VAU per million, 50% QUIC discount.' },
  smart_acceleration: { status: 'verified', url: DOCS.vau, note: '100 VAU per million requests.' },
  bot_requests: { status: 'verified', url: DOCS.vau, note: '100 VAU per million requests.' },
  site_quota: { status: 'verified', url: DOCS.vau, note: '100 VAU per site per month, prorated by days.' },
  web_rules_quota: { status: 'verified', url: DOCS.vau, note: '100 VAU per rule per month.' },
  l4_instance_vau: { status: 'reference', url: DOCS.vau },

  ddos_essential: { status: 'reference', url: DOCS.ddosDefender },
  ddos_premium: { status: 'reference', url: DOCS.ddosDefender },
  ddos_china_extension: { status: 'reference', url: DOCS.ddosDefender },
  ddos_traffic_overage: { status: 'reference', url: DOCS.ddosDefender },
  ddos_resource_overage: { status: 'reference', url: DOCS.ddosDefender },
  ddos_global_proxy_hourly: { status: 'verified', url: DOCS.ddosDefender, note: '$0.05 per resource-hour for the 0–100 tier.' },
  ddos_china_l4_proxy_hourly: { status: 'reference', url: DOCS.ddosDefender },

  china_optimization: { status: 'verified', url: DOCS.crossBorder, note: '$0.57/GB; not deductible from plan traffic.' },
  china_optimization_bandwidth: { status: 'reference', url: DOCS.crossBorder },
  secure_accel_traffic_cn: { status: 'reference', url: DOCS.outOfPlan },
  secure_accel_traffic_global: { status: 'reference', url: DOCS.outOfPlan },
  secure_accel_bandwidth_cn: { status: 'reference', url: DOCS.outOfPlan },
  secure_accel_bandwidth_global: { status: 'reference', url: DOCS.outOfPlan },
  advanced_web_protection: { status: 'reference', url: DOCS.pricingPage },
  edge_function_requests: { status: 'verified', url: DOCS.edgeFunctions, note: '$0.2389 per million requests beyond plan quota.' },
  edge_function_cpu: { status: 'verified', url: DOCS.edgeFunctions, note: '$0.0155 per million ms beyond plan quota.' },
  log_storage_cn: { status: 'verified', url: DOCS.logAnalysis, note: '$0.11/GB/month in Chinese-mainland AZs.' },
  log_storage_global: { status: 'reference', url: DOCS.logAnalysis },
  log_storage_guarantee: { status: 'reference', url: DOCS.logAnalysis },
  ai_inference_a: { status: 'reference', url: DOCS.edgeInference },
  ai_inference_b: { status: 'reference', url: DOCS.edgeInference },
  ai_inference_c: { status: 'reference', url: DOCS.edgeInference },
  media_processing: { status: 'reference', url: DOCS.imageProcessing },
  image_processing: { status: 'reference', url: DOCS.imageProcessing, note: 'Free during beta; placeholder price.' },
  video_processing: { status: 'reference', url: DOCS.imageProcessing },
};

const FALLBACK_SOURCE: PriceSource = { status: 'reference', url: DOCS.pricingPage };

export function getPriceSource(serviceId: string): PriceSource {
  return PRICE_SOURCES[serviceId] ?? FALLBACK_SOURCE;
}
