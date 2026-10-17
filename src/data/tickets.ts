import type { Ticket } from "@/lib/types";

/**
 * Seeded support tickets for a fictional subscription product, "Brightbox".
 * The first ten teach rules. The last four are held out: they are never used to
 * learn a rule and only score how well the learned rules carry over.
 */
export const TICKETS: Ticket[] = [
  {
    id: "t1",
    customer: "Mark",
    subject: "Refund for my annual plan",
    body: "Hi, I bought the annual plan about 45 days ago and I'm not using it anymore. Can I get my money back?",
    policies: ["refund-window", "sign-off"],
    heldOut: false,
    agentEdit:
      "Hi Mark,\n\nThanks for reaching out. Our refund window is 30 days from purchase, and your plan is just past it, so I can't refund this one. I can cancel it now so it won't renew next year, and you keep access until the period ends.\n\nBrightbox Support",
  },
  {
    id: "t2",
    customer: "Priya",
    subject: "Charged twice this month",
    body: "I see two charges of $29 on my card for this month. Please fix this.",
    policies: ["escalate-billing", "sign-off"],
    heldOut: false,
    agentEdit:
      "Hi Priya,\n\nSorry about the double charge. I've passed your account to a billing specialist who will check both payments and reply here with the outcome.\n\nBrightbox Support",
  },
  {
    id: "t3",
    customer: "Dan",
    subject: "Export keeps failing",
    body: "My project export fails every time. I need it working today. Can you fix it?",
    policies: ["no-delivery-promise", "sign-off"],
    heldOut: false,
    agentEdit:
      "Hi Dan,\n\nSorry the export keeps failing. I've sent the details to our engineers and I'll update you here as soon as I have news. In the meantime, try exporting a smaller section of the project.\n\nBrightbox Support",
  },
  {
    id: "t4",
    customer: "Sofia",
    subject: "Charged after I cancelled",
    body: "I cancelled in the spring and was still charged last week. I never agreed to this. I want it refunded, it was 70 days ago.",
    policies: ["refund-window", "no-blame"],
    heldOut: false,
    agentEdit:
      "Hi Sofia,\n\nI'm sorry for the frustration. I can see your cancellation request, and I understand why the charge was unexpected. Because the charge is outside our 30-day refund window I can't refund it myself, so I've asked the team to review your case.\n\nBrightbox Support",
  },
  {
    id: "t5",
    customer: "Liam",
    subject: "Free trial turned into $120 charge",
    body: "I forgot to cancel my free trial and now I've been charged $120 for the year. Can someone sort this out?",
    policies: ["escalate-billing", "no-blame"],
    heldOut: false,
    agentEdit:
      "Hi Liam,\n\nThanks for letting us know, and I'm sorry about the surprise charge. Because it's over $100 I've passed this to a billing specialist, who will review your trial and reply here.\n\nBrightbox Support",
  },
  {
    id: "t6",
    customer: "Aisha",
    subject: "Locked out of my account",
    body: "I can't log in. Can you just fix it for me?",
    policies: ["no-sensitive", "sign-off"],
    heldOut: false,
    agentEdit:
      "Hi Aisha,\n\nSorry you're locked out. Use the Forgot access link on the sign-in page and we'll email a secure reset link to your address on file. Let me know if the email doesn't arrive.\n\nBrightbox Support",
  },
  {
    id: "t7",
    customer: "Chen",
    subject: "Please refund my purchase",
    body: "I paid for the pro plan two months ago and want a refund now.",
    policies: ["refund-window"],
    heldOut: false,
    agentEdit:
      "Hi Chen,\n\nThanks for asking. Pro plan refunds are only possible within 30 days of purchase, so I can't refund a payment from two months ago. I can switch you to the free plan from your next billing date if you'd like.\n\nBrightbox Support",
  },
  {
    id: "t8",
    customer: "Hannah",
    subject: "When will sync be back?",
    body: "Sync has been down since this morning. When exactly will it be fixed?",
    policies: ["no-delivery-promise"],
    heldOut: false,
    agentEdit:
      "Hi Hannah,\n\nSync is down for some users and our engineers are working on it. I don't have a confirmed fix time yet, but you can follow updates on our status page and I'll message you when it's back.\n\nBrightbox Support",
  },
  {
    id: "t9",
    customer: "Omar",
    subject: "Charged $240 after changing plan",
    body: "I switched plans and was charged $240. That doesn't look right.",
    policies: ["escalate-billing"],
    heldOut: false,
    agentEdit:
      "Hi Omar,\n\nThanks for flagging this. I've passed your plan change to a billing specialist so they can check the $240 charge, and they'll reply on this thread.\n\nBrightbox Support",
  },
  {
    id: "t10",
    customer: "Grace",
    subject: "Can't find the cancel button",
    body: "I looked everywhere and there's no cancel button. Why is it so hard to cancel?",
    policies: ["no-blame", "sign-off"],
    heldOut: false,
    agentEdit:
      "Hi Grace,\n\nSorry it was hard to find. Go to Settings, then Plan, and choose Cancel plan at the bottom of the page. I can also cancel it for you right now if you reply yes.\n\nBrightbox Support",
  },
  {
    id: "h1",
    customer: "Noah",
    subject: "Refund request, 50 days",
    body: "I signed up 50 days ago and want a refund because I never used it.",
    policies: ["refund-window", "sign-off"],
    heldOut: true,
    agentEdit:
      "Hi Noah,\n\nThanks for getting in touch. Refunds are available within 30 days of purchase, so I can't refund a payment from 50 days ago. I can cancel your plan so it doesn't renew.\n\nBrightbox Support",
  },
  {
    id: "h2",
    customer: "Elena",
    subject: "Double charge of $59",
    body: "You charged me $59 twice. Please sort this out.",
    policies: ["escalate-billing"],
    heldOut: true,
    agentEdit:
      "Hi Elena,\n\nSorry about the double charge. A billing specialist will check both payments and reply here with the outcome.\n\nBrightbox Support",
  },
  {
    id: "h3",
    customer: "Raj",
    subject: "Sync broken, deadline tomorrow",
    body: "Sync is broken and I have a deadline tomorrow. I need to know it will be working by then.",
    policies: ["no-delivery-promise", "no-blame"],
    heldOut: true,
    agentEdit:
      "Hi Raj,\n\nI understand the pressure of a deadline. Our engineers are working on sync, but I can't give you a confirmed fix time. As a backup you can export your work from the web app today.\n\nBrightbox Support",
  },
  {
    id: "h4",
    customer: "Zoe",
    subject: "Account suspended, card expired",
    body: "My account got suspended. I think my card expired. What do you need from me to fix it?",
    policies: ["no-sensitive", "sign-off"],
    heldOut: true,
    agentEdit:
      "Hi Zoe,\n\nSorry about the suspension. You can update your payment details yourself in Settings, then Billing. Please don't send payment details in this thread; we never need them by message.\n\nBrightbox Support",
  },
];

/**
 * The order the agent works through the training tickets. Each kind of lesson (refund window,
 * billing escalation, fix-time promises) shows up twice early on, so the chart can show a rule
 * being learned and then used. The held-out tickets are not affected by this order.
 */
const TRAINING_ORDER = ["t1", "t2", "t3", "t7", "t9", "t8", "t4", "t5", "t6", "t10"];

export const TRAINING_TICKETS = TRAINING_ORDER.map((id) => {
  const ticket = TICKETS.find((t) => t.id === id && !t.heldOut);
  if (!ticket) throw new Error(`Training ticket missing: ${id}`);
  return ticket;
});
export const HELD_OUT_TICKETS = TICKETS.filter((t) => t.heldOut);
