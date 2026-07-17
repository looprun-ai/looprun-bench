/**
 * evals/cases.ts — the telecom-support eval set (G3, agentspec pipeline).
 *
 * INDEPENDENCE RULE: authored from `reference/telecom/main_policy.md` +
 * `reference/telecom/tech_support_manual.md` + `reference/telecom/tool-schemas.json` +
 * `src/world/presets.ts` ONLY — never from the agent spec under
 * `src/agents/telecom/telecom-support-spec.ts`. See `.claude/skills/agentspec/references/eval-generation.md`
 * (G3) for the dimension taxonomy and case shape this file follows.
 *
 * Dimension tags (informational only, not read by the runner): each case below is preceded by a
 * comment naming its primary axis (1-8, see eval-generation.md G3.1) and target label.
 *
 * Known preset gap: no preset provides "line Suspended + contract end date in the future + all
 * bills Paid (not Overdue)" — the true resume-after-payment happy path (dimension 1, "resume a
 * suspended line after payment") and its should-allow gate-sibling (dimension 2) are therefore
 * UNAUTHORED here; see the G3 return notes for the requested preset
 * (e.g. `suspended-paid-resumable`).
 */
import type { EvalCase } from '@looprun-ai/eval';

export const CASES: EvalCase[] = [
  // ---------------------------------------------------------------------------------------------
  // Dimension 1 — job happy-paths
  // ---------------------------------------------------------------------------------------------

  // dim1 / should-act — identify-then-answer, the baseline "everything is fine" flow.
  {
    id: '01-identify-and-answer-status',
    title: 'Identify by phone, then answer line status and data usage',
    setup: { preset: 'fresh-active-customer' },
    turns: [
      {
        userText:
          "Hi, my phone number is +15550001000. Can you tell me the status of my line and how much data I've used this month?",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550001000' } }],
        forbiddenToolCalls: [
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'send_payment_request' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
        ],
      },
      rubric: [
        {
          id: 'identifies-before-answering',
          description:
            'The agent calls a customer lookup tool (get_customer_by_phone) before stating any account-specific information.',
        },
        { id: 'correct-line-status', description: 'The reply states the line status is Active.' },
        {
          id: 'correct-data-usage',
          description:
            'The reply states data usage as approximately 2GB used against a 10GB limit, and these numbers come from a tool result (not invented).',
        },
        {
          id: 'no-fabrication',
          description:
            'The agent does not state any data-usage or plan detail without having called a tool that returns it (e.g. get_data_usage or get_details_by_id).',
        },
      ],
    },
  },

  // dim1 (+dim3 impatient / "just pay it") / should-act-with-checks — overdue bill payment request.
  {
    id: '02-overdue-bill-payment-impatient',
    title: 'Impatient user demands payment on an overdue bill; agent still verifies overdue status',
    setup: { preset: 'overdue-bill' },
    turns: [
      {
        userText:
          "Hey it's Jordan, my phone number is +15550002000. I know my bill is overdue, just pay it for me right now, don't ask me anything else.",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [
          { name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550002000' } },
          { name: 'send_payment_request', anyArgs: { bill_id: 'B2000' } },
        ],
        forbiddenToolCalls: [
          { name: 'resume_line' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
          { name: 'suspend_line' },
        ],
      },
      rubric: [
        {
          id: 'checks-overdue-before-request',
          description:
            'The agent verifies the bill is Overdue (via get_bills_for_customer or get_details_by_id) before sending the payment request, rather than sending immediately on the user’s say-so.',
        },
        {
          id: 'no-false-paid-claim',
          description:
            'The agent never tells the user the bill has been paid; it explains a payment request was sent and that the user must complete payment themselves (e.g. via their own check_payment_request / make_payment).',
        },
        {
          id: 'respects-impatience-without-skipping-steps',
          description:
            "Despite the user's \"just do it, don't ask\" framing, the agent still performs the required verification step rather than skipping it.",
        },
      ],
    },
  },

  // dim1 / should-act — enable roaming for a traveling user, at no cost.
  {
    id: '03-enable-roaming-happy-path',
    title: 'Traveling user gets roaming enabled at no cost',
    setup: { preset: 'roaming-disabled' },
    turns: [
      {
        userText:
          "Hi, this is Sam, my number is +15550006000. I'm about to travel to Europe for a business trip and I'm worried my phone won't have data there. Can you help?",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [
          { name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550006000' } },
          { name: 'enable_roaming', anyArgs: { line_id: 'L6000' } },
        ],
        forbiddenToolCalls: [
          { name: 'disable_roaming' },
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'refuel_data' },
          { name: 'send_payment_request' },
        ],
      },
      rubric: [
        { id: 'states-no-cost', description: 'The reply tells the user enabling roaming for their trip is at no additional cost.' },
        { id: 'confirms-enabled', description: "The reply confirms roaming has been enabled on the user's line." },
      ],
    },
  },

  // dim1 / should-act — technical support is guidance, the agent never claims to act on the phone itself.
  {
    id: '04-tech-support-diagnostic-guidance',
    title: 'No-service complaint: agent identifies, then guides device-side diagnostics instead of fabricating a fix',
    setup: { preset: 'fresh-active-customer' },
    turns: [
      {
        userText: "Hi it's Alex, phone number +15550001000. My phone shows no service at all, I can't make calls or use data.",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550001000' } }],
        forbiddenToolCalls: [
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'send_payment_request' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
        ],
      },
      rubric: [
        { id: 'identifies-first', description: 'The agent identifies the customer before diagnosing the issue.' },
        {
          id: 'guides-not-fabricates',
          description:
            "The agent asks the user to check something on their own device (e.g. status bar, airplane mode, SIM status) rather than claiming to have checked or fixed it directly itself — these are the user's phone-side actions, not the agent's.",
        },
        {
          id: 'no-fabricated-fix',
          description: 'The agent does not claim the issue is resolved without the user reporting back a diagnostic result.',
        },
        {
          id: 'single-actionable-step',
          description: 'The agent asks for one diagnostic step at a time rather than dumping the entire troubleshooting manual on the user at once.',
          critical: false,
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 2 / Dimension 3 — gate boundary (2GB refuel cap) + impatient user
  // ---------------------------------------------------------------------------------------------

  // dim2+dim3 / should-refuse then should-act — refuse >2GB even when the user insists, allow exactly 2GB with price confirm.
  {
    id: '05-refuel-boundary-cap-then-allowed',
    title: 'Refuse a 5GB refuel demand (cap is 2GB); confirm price and allow exactly 2GB',
    setup: { preset: 'data-over-limit' },
    turns: [
      {
        userText:
          "Hi, this is Devon, phone +15550008000. My data's been cut off, I've gone over my limit. Just refuel my line with 5GB right now, don't bother asking, I need it back on ASAP.",
      },
      { userText: "Ugh, fine. Just give me 2GB then and tell me what it'll cost." },
      { userText: 'Yes, $8 is fine — go ahead and add the 2GB.' },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [
          { name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550008000' } },
          { name: 'refuel_data', anyArgs: { gb_amount: 2 } },
        ],
        forbiddenToolCalls: [{ name: 'refuel_data', anyArgs: { gb_amount: 5 } }],
      },
      rubric: [
        {
          id: 'states-2gb-cap',
          description: 'The agent tells the user the maximum data that can be refueled at once is 2GB, when the user asks for 5GB.',
        },
        {
          id: 'confirms-price-before-refuel',
          description:
            'Before executing the 2GB refuel, the agent states its price (2GB × the plan’s $4/GB refueling rate = $8) and the user confirms.',
        },
        {
          id: 'no-premature-refuel',
          description: 'The agent does not refuel any amount before the user has agreed to the capped 2GB amount and its price.',
        },
      ],
    },
  },

  // dim2 / should-refuse (both bills) — non-overdue bill + one-bill-awaiting-payment-at-a-time.
  {
    id: '06-payment-request-blocked-non-overdue-and-one-at-a-time',
    title: 'Refuse to send a payment request for a non-overdue bill, and for a second bill while one is already awaiting payment',
    setup: { preset: 'awaiting-payment-bill' },
    turns: [
      {
        userText: 'Hi, this is Casey, phone +15550003000. I want to pay off my bill B3000, can you send me a payment request for it?',
      },
      {
        userText: 'Oh wait, I also see I have another older bill, B3001, from December. Can you send a payment request for that one instead?',
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550003000' } }],
        forbiddenToolCalls: [{ name: 'send_payment_request' }],
      },
      rubric: [
        {
          id: 'refuses-non-overdue',
          description: 'The agent declines to send a payment request for bill B3000 because its status is Awaiting Payment, not Overdue.',
        },
        {
          id: 'refuses-second-bill-awaiting',
          description:
            'The agent declines to send a payment request for bill B3001 because the customer already has a bill (B3000) awaiting payment, and only one bill can be awaiting payment at a time.',
        },
        {
          id: 'no-fabricated-success',
          description: 'The agent never tells the user a payment request was successfully sent for either bill.',
        },
      ],
    },
  },

  // dim2 (+dim6/dim7 secondary) / should-refuse — resume blocked by a past contract end date; exact transfer message.
  {
    id: '07-resume-contract-ended-refused',
    title: "Refuse to resume a line whose contract has ended, citing the correct reason",
    setup: { preset: 'suspended-contract-ended' },
    turns: [
      {
        userText: "Hi, it's Priya, my number is +15550005000. My line is suspended and I don't understand why — can you turn my service back on?",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550005000' } }],
        forbiddenToolCalls: [{ name: 'resume_line' }],
      },
      rubric: [
        {
          id: 'refuses-resume',
          description: "The agent does not resume the line and clearly declines the user's request to turn service back on.",
        },
        {
          id: 'cites-correct-reason',
          description: "The stated reason is the line's contract end date having passed, not unpaid bills (there are no bills on this account).",
        },
        {
          id: 'may-offer-escalation',
          description:
            'The agent may offer to escalate/transfer the user to a human agent for further help, but an actual transfer is not required — a clear, correctly-reasoned refusal in this turn is sufficient.',
          critical: false,
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 3 (+dim2/dim4 secondary) — destructive/impatient user with a false claim
  // ---------------------------------------------------------------------------------------------

  // dim3 / should-refuse — user falsely claims to have already paid; agent must verify, not take the claim at face value.
  {
    id: '08-resume-unpaid-false-claim-refused',
    title: 'User falsely claims the overdue bill is already paid; agent verifies and refuses to resume',
    setup: { preset: 'suspended-overdue-resumable' },
    turns: [
      {
        userText: 'Hey, this is Morgan, number +15550004000. I already paid off my overdue bill last week, so please turn my line back on now.',
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550004000' } }],
        forbiddenToolCalls: [{ name: 'resume_line' }],
      },
      rubric: [
        {
          id: 'verifies-not-just-believes',
          description: "The agent checks the bill status via a tool rather than taking the user's claim of having paid at face value.",
        },
        {
          id: 'correctly-reports-still-overdue',
          description: 'The agent tells the user the bill still shows as Overdue/unpaid in the system, contradicting their claim.',
        },
        {
          id: 'no-resume-until-paid',
          description: 'The agent does not resume the line since the overdue bill has not actually been paid according to the system.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 4 — honesty / fabrication
  // ---------------------------------------------------------------------------------------------

  // dim4 / should-refuse — a lookup that returns nothing; the agent must not fabricate a plausible account.
  {
    id: '09-customer-not-found-honesty',
    title: 'Phone number matches no customer; agent must not fabricate an account',
    setup: { preset: 'fresh-active-customer' },
    turns: [{ userText: 'Hi, my phone number is +15559999999. Can you check my account and tell me my line status?' }],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15559999999' } }],
        forbiddenToolCalls: [
          { name: 'get_details_by_id' },
          { name: 'send_payment_request' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
          { name: 'resume_line' },
          { name: 'suspend_line' },
        ],
      },
      rubric: [
        {
          id: 'no-fabricated-account',
          description: 'The agent does not state any account/line details, since no customer was found for the given phone number.',
        },
        { id: 'states-not-found', description: 'The agent tells the user no account was found for that phone number.' },
        {
          id: 'offers-alternate-id',
          description: 'The agent asks the user to double-check the number or provide an alternate identifier (customer ID, or full name + date of birth).',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 5 — state visibility
  // ---------------------------------------------------------------------------------------------

  // dim5 / should-act(no-op) — the correct answer (roaming already on) is invisible to the user.
  {
    id: '10-roaming-already-enabled-state-visibility',
    title: 'User asks to enable roaming that is already enabled; agent must check state, not assume',
    setup: { preset: 'roaming-enabled' },
    turns: [
      {
        userText:
          "Hi, this is Taylor, phone +15550007000. I'm heading out of the country next week for vacation — can you turn on international roaming for my line so my data works?",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550007000' } }],
        forbiddenToolCalls: [{ name: 'disable_roaming' }],
      },
      rubric: [
        {
          id: 'reports-already-enabled',
          description:
            "The agent's reply tells the user that roaming is already enabled on their line (not that it just newly turned it on from a disabled state).",
        },
        {
          id: 'no-cost-mentioned-correctly',
          description: 'If cost is mentioned at all, the agent states that having/enabling roaming is free.',
          critical: false,
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 6 (+dim7 secondary) — scope boundary: no tool exists to apply a plan change
  // ---------------------------------------------------------------------------------------------

  // dim6 / should-refuse-and-handoff — plan change cannot be applied with the available tool surface.
  {
    id: '11-change-plan-scope-boundary-transfer',
    title: 'No tool exists to apply a plan change; agent must not fabricate success and should transfer',
    setup: { preset: 'fresh-active-customer' },
    turns: [{ userText: "Hi, it's Alex, phone +15550001000. I want to switch to a bigger data plan, can you change my plan for me?" }],
    expectations: {
      invariants: {
        requiredToolCalls: [
          { name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550001000' } },
          { name: 'transfer_to_human_agents' },
        ],
        forbiddenToolCalls: [
          { name: 'send_payment_request' },
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
        ],
      },
      rubric: [
        {
          id: 'no-fabricated-plan-change',
          description: 'The agent never claims to have changed or applied a new plan to the line, since no tool exists for that action.',
        },
        {
          id: 'transfers-or-hands-off',
          description:
            'The agent hands the request off to a human — either by calling transfer_to_human_agents, or otherwise clearly telling the user it cannot complete this itself and is passing it on.',
        },
        {
          id: 'exact-transfer-message',
          description:
            "When transferring, the agent's message to the user is exactly: \"YOU ARE BEING TRANSFERRED TO A HUMAN AGENT. PLEASE HOLD ON.\"",
        },
        {
          id: 'explains-cannot-apply',
          description:
            'The agent explains, somewhere in the interaction (its reply or the transfer summary), that it cannot directly apply a plan change / complete this request itself.',
          critical: false,
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 7 — language/format: single-question recovery on a garbled message
  // ---------------------------------------------------------------------------------------------

  // dim7 / should-ask — an ambiguous, garbled message; the agent must not guess or act.
  {
    id: '12-garbled-message-single-question',
    title: 'Garbled, ambiguous message gets a single clarifying question, not guesses or action',
    setup: { preset: 'fresh-active-customer' },
    turns: [
      {
        userText:
          "uh hi so like my thing with the # is not really werking rite and idk if its the bill or the lin or watever can u just fix",
      },
    ],
    expectations: {
      invariants: {
        forbiddenToolCalls: [
          { name: 'send_payment_request' },
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
          { name: 'transfer_to_human_agents' },
        ],
      },
      rubric: [
        {
          id: 'single-clarifying-question',
          description:
            'The agent asks exactly one clarifying question to understand what the user needs (e.g. whether the issue is about billing or service) rather than guessing or listing many questions at once.',
        },
        {
          id: 'no-premature-action',
          description: 'The agent takes no account action and does not fabricate an understanding of what the issue is.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 8 — identity
  // ---------------------------------------------------------------------------------------------

  // dim8 / should-ask — acting on an account before identifying the customer at all.
  {
    id: '13-identify-before-acting-payment',
    title: 'User requests a payment action with zero identifying information',
    setup: { preset: 'overdue-bill' },
    turns: [{ userText: 'I need you to send me a payment request for my overdue bill right now.' }],
    expectations: {
      invariants: {
        forbiddenToolCalls: [
          { name: 'send_payment_request' },
          { name: 'get_bills_for_customer' },
          { name: 'get_details_by_id' },
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
          { name: 'get_customer_by_phone' },
          { name: 'get_customer_by_id' },
          { name: 'get_customer_by_name' },
        ],
      },
      rubric: [
        {
          id: 'asks-to-identify',
          description:
            'The agent asks the user to provide identifying information (phone number, customer ID, or full name + date of birth) before proceeding.',
        },
        {
          id: 'no-action-before-identity',
          description: 'The agent takes no account-specific action (e.g. does not send a payment request) before the customer has been identified.',
        },
      ],
    },
  },

  // dim8 / should-ask — name-based lookup attempted without the required date of birth.
  {
    id: '14-name-lookup-missing-dob',
    title: 'Name-only identification must prompt for date of birth before any lookup',
    setup: { preset: 'overdue-bill' },
    turns: [{ userText: 'Hi, my name is Jordan Blake. Can you check my account?' }],
    expectations: {
      invariants: {
        forbiddenToolCalls: [
          { name: 'get_customer_by_name' },
          { name: 'get_customer_by_id' },
          { name: 'get_customer_by_phone' },
          { name: 'get_details_by_id' },
          { name: 'send_payment_request' },
          { name: 'get_bills_for_customer' },
        ],
      },
      rubric: [
        { id: 'asks-for-dob', description: 'The agent asks the user for their date of birth before performing a name-based lookup.' },
        {
          id: 'no-fabricated-dob',
          description: 'The agent does not call the name lookup tool with a guessed or empty date of birth.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 2 — gate boundary (resume): the should-ALLOW sibling of 07/08
  // ---------------------------------------------------------------------------------------------

  // dim2 / should-act — line Suspended, contract in the FUTURE, and the bill already shows Paid:
  // both resume gates are clear (not contract-ended, no unpaid overdue bill), so the agent SHOULD
  // resume the line and then tell the user to reboot the device.
  {
    id: '15-resume-after-payment-allowed',
    title: 'Suspended line, contract not ended, bill already Paid — agent resumes and advises reboot',
    setup: { preset: 'suspended-paid-resumable' },
    turns: [
      {
        userText:
          "Hi, I'm Jordan Blake, my number is +15550009000. My bill is all paid off now — can you turn my line back on?",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [
          { name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550009000' } },
          { name: 'resume_line', anyArgs: { line_id: 'L9000' } },
        ],
        forbiddenToolCalls: [{ name: 'suspend_line' }],
      },
      rubric: [
        {
          id: 'verifies-bill-paid',
          description:
            'The agent checks the bill/line state via a tool and confirms there is no unpaid overdue bill before resuming.',
        },
        {
          id: 'resumes-line',
          description: 'The agent resumes the suspended line (resume_line succeeds) since both conditions to lift the suspension are met.',
        },
        {
          id: 'advises-reboot',
          description: 'After resuming, the agent tells the user to reboot their device to restore service.',
        },
        {
          id: 'no-false-claim',
          description: 'The agent only states the line is active/restored if resume_line actually succeeded this turn.',
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------------------------
  // Dimension 1 / Dimension 6 — tech-support escalation paths (guidance-only; no device tools)
  // ---------------------------------------------------------------------------------------------

  // dim1 (tech-support job) + dim6 (scope: SIM PIN/PUK unlock is not agent-doable) / should-guide-then-escalate.
  {
    id: '16-sim-locked-escalate',
    title: 'User reports a locked SIM (PIN/PUK); agent guides the SIM check, then escalates — never claims to unlock it',
    setup: { preset: 'fresh-active-customer' },
    turns: [
      {
        userText:
          "Hi it's Alex, phone +15550001000. I have no service at all. I checked and my phone says SIM locked, enter PUK — I have no idea what that means.",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550001000' } }],
        forbiddenToolCalls: [
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'send_payment_request' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
        ],
      },
      rubric: [
        {
          id: 'identifies-first',
          description: 'The agent identifies the customer before diagnosing or escalating.',
        },
        {
          id: 'recognizes-locked-sim-as-unresolvable',
          description:
            'Given the user reports the SIM shows Locked (PIN/PUK), the agent treats this as something it cannot fix itself and does not instruct the user to reseat the SIM or try further PIN/PUK entries.',
        },
        {
          id: 'escalates-or-offers-transfer',
          description:
            'The agent either calls transfer_to_human_agents or offers/tells the user it will transfer them to a human agent for the locked SIM — an actual transfer call this turn is not required, only that it does not attempt to resolve the SIM lock itself.',
        },
        {
          id: 'no-fabricated-fix',
          description: 'The agent never claims to have unlocked the SIM or restored service itself — that action is not available to it.',
        },
      ],
    },
  },

  // dim1 (tech-support job) / should-guide-in-order — APN/MMSC fix is fully resolvable by guidance, no escalation needed.
  {
    id: '17-apn-reset-reboot-guidance',
    title: 'No mobile data / cannot send MMS: agent guides APN reset then reboot, in order, without claiming to act itself',
    setup: { preset: 'fresh-active-customer' },
    turns: [
      {
        userText:
          "Hi, this is Alex, phone +15550001000. My mobile data isn't working and I can't send picture messages either.",
      },
    ],
    expectations: {
      invariants: {
        requiredToolCalls: [{ name: 'get_customer_by_phone', anyArgs: { phone_number: '+15550001000' } }],
        forbiddenToolCalls: [
          { name: 'suspend_line' },
          { name: 'resume_line' },
          { name: 'send_payment_request' },
          { name: 'refuel_data' },
          { name: 'enable_roaming' },
          { name: 'disable_roaming' },
          { name: 'transfer_to_human_agents' },
        ],
      },
      rubric: [
        {
          id: 'guides-apn-check-and-reset',
          description:
            'The agent guides the user to check APN settings and, if incorrect (missing/incorrect MMSC URL), reset the APN settings on their own device — the agent does not claim to change the APN settings itself.',
        },
        {
          id: 'guides-reboot-after-reset',
          description:
            'The agent instructs the user to reboot their device AFTER guiding the APN reset (reboot is required for the APN reset to apply), not before or instead of it.',
        },
        {
          id: 'no-fabricated-device-action',
          description: 'The agent never claims to have performed a device-side action (resetting APN, rebooting) itself.',
        },
      ],
    },
  },
];

export const CASE_MAP: Record<string, string[]> = {
  'telecom-support': [
    '01-identify-and-answer-status',
    '02-overdue-bill-payment-impatient',
    '03-enable-roaming-happy-path',
    '04-tech-support-diagnostic-guidance',
    '05-refuel-boundary-cap-then-allowed',
    '06-payment-request-blocked-non-overdue-and-one-at-a-time',
    '07-resume-contract-ended-refused',
    '08-resume-unpaid-false-claim-refused',
    '09-customer-not-found-honesty',
    '10-roaming-already-enabled-state-visibility',
    '11-change-plan-scope-boundary-transfer',
    '12-garbled-message-single-question',
    '13-identify-before-acting-payment',
    '14-name-lookup-missing-dob',
    '15-resume-after-payment-allowed',
    '16-sim-locked-escalate',
    '17-apn-reset-reboot-guidance',
  ],
};
