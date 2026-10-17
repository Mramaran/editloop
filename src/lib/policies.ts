import type { Policy } from "./types";

/**
 * The support team's hidden house rules. The assistant is never shown these.
 * They are only used to score a draft, so the edit rate is measured the same way
 * for every run and does not depend on a model judging itself.
 */
export const POLICIES: Record<string, Policy> = {
  "refund-window": {
    id: "refund-window",
    label: "Do not promise a refund after 30 days",
    forbid: [
      /\bwe(?:'ll| will)\s+(?:issue|process|send|give)\s+(?:you\s+)?(?:a\s+|your\s+)?(?:full\s+)?refund/i,
      /\byou(?:'ll| will)\s+(?:get|receive)\s+(?:a\s+|your\s+)?(?:full\s+)?refund/i,
      /\b(?:full\s+)?refund\s+(?:has been|is being)\s+(?:issued|processed)/i,
      /\b(?:we|I)(?:'ll| will| can)\s+refund\s+(?:you|your|the)\b/i,
      /\b(?:issued|processed|sent)\s+(?:you\s+)?(?:a|your)\s+(?:full\s+)?refund/i,
    ],
  },
  "sign-off": {
    id: "sign-off",
    label: "Sign off as Brightbox Support",
    require: [/Brightbox Support\s*$/],
  },
  "escalate-billing": {
    id: "escalate-billing",
    label: "Send billing disputes to a billing specialist",
    require: [/billing specialist/i],
  },
  "no-delivery-promise": {
    id: "no-delivery-promise",
    label: "Never guarantee a fix time",
    forbid: [
      // Saying "I can't guarantee a fix time" is what the policy wants, so a negation is allowed.
      /(?<!n't\s|not\s|cannot\s|never\s|unable to\s)\bguarantee[ds]?\b/i,
      /\bby (?:tomorrow|tonight|end of (?:the )?day)\b/i,
      /\bwithin (?:24|48) hours\b/i,
    ],
  },
  "no-blame": {
    id: "no-blame",
    label: "Never blame the customer",
    forbid: [
      /\byou (?:should have|failed to|didn't read|did not read|forgot)\b/i,
      /\byour mistake\b/i,
    ],
  },
  "no-sensitive": {
    id: "no-sensitive",
    label: "Never ask for passwords or card numbers",
    // Only asking for the secret counts. Telling the customer how to reset it, or never to send it, is fine.
    forbid: [
      /(?<!n't\s|not\s|never\s|no need to\s)\b(?:send|share|tell|provide|enter|confirm|give|type)\s+(?:me\s+|us\s+)?(?:your|the)\s+(?:full\s+)?(?:password|card number|cvv)\b/i,
    ],
  },
};
