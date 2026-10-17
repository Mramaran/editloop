export interface Policy {
  id: string;
  label: string;
  /** Reply fails if any of these match. */
  forbid?: RegExp[];
  /** Reply fails if any of these do not match. */
  require?: RegExp[];
}

export interface Ticket {
  id: string;
  customer: string;
  subject: string;
  body: string;
  /** Policy ids a good reply must satisfy. */
  policies: string[];
  heldOut: boolean;
  /** The reply the support agent would write. Used as the human edit in guided mode. */
  agentEdit: string;
}

export interface Rule {
  id: string;
  text: string;
  sourceTicketId: string;
  /** Times a draft reported using this rule. */
  fired: number;
  /** Times the agent kept a draft that used this rule. */
  accepted: number;
}

export interface DraftResult {
  reply: string;
  appliedRuleIds: string[];
}

export interface CheckResult {
  failed: string[];
  total: number;
}
