/**
 * src/world/tools.ts — the 13 τ²-bench telecom **agent** tools (`benchmarks/tau2-telecom/reference/tool-schemas.json`
 * → `agent_tools`), exported as `TOOL_DEFS: ToolDef[]` for the eval config's tool surface.
 *
 * The `user_tools` in tool-schemas.json (check_status_bar, toggle_airplane_mode, make_payment, …) are
 * the PHONE-side tools the τ² user-simulator owns — they are never exposed to the agent, so they are
 * intentionally NOT modeled here or in `world.ts`'s `exec` dispatch.
 *
 * `description` text is copied verbatim from the source tool docstrings (including the multi-line
 * "Checks:" / "Logic:" postcondition notes some tools carry — those are load-bearing for the guard
 * author and the judge, not decorative). `inputSchema` is a straight JSON-schema rendering of each
 * tool's `function.parameters` (property types/required/defaults preserved; the schema's own
 * cosmetic `title` keys are dropped as non-semantic).
 */
import type { ToolDef } from 'looprun';

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'get_customer_by_phone',
    description: 'Finds a customer by their primary contact or line phone number.',
    inputSchema: {
      type: 'object',
      properties: {
        phone_number: { type: 'string', description: 'The phone number to search for.' },
      },
      required: ['phone_number'],
    },
  },
  {
    name: 'get_customer_by_id',
    description: 'Retrieves a customer directly by their unique ID.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'The unique identifier of the customer.' },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_customer_by_name',
    description:
      'Searches for customers by name and DOB. May return multiple matches if names are similar,\n\nDOB helps disambiguate.',
    inputSchema: {
      type: 'object',
      properties: {
        full_name: { type: 'string', description: 'The full name of the customer.' },
        dob: { type: 'string', description: 'Date of birth for verification, in the format YYYY-MM-DD.' },
      },
      required: ['full_name', 'dob'],
    },
  },
  {
    name: 'get_details_by_id',
    description:
      'Retrieves the details for a given ID.\n\nThe ID must be a valid ID for a Customer, Line, Device, Bill, or Plan.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The ID of the object to retrieve.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'suspend_line',
    description:
      'Suspends a specific line (max 6 months).\n\nChecks: Line status must be Active.\nLogic: Sets line status to Suspended, records suspension_start_date.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer who owns the line.' },
        line_id: { type: 'string', description: 'ID of the line to suspend.' },
        reason: { type: 'string', description: 'Reason for suspension.' },
      },
      required: ['customer_id', 'line_id', 'reason'],
    },
  },
  {
    name: 'resume_line',
    description:
      'Resumes a suspended line.\n\nChecks: Line status must be Suspended or Pending Activation.\nLogic: Sets line status to Active, clears suspension_start_date.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer who owns the line.' },
        line_id: { type: 'string', description: 'ID of the line to resume.' },
      },
      required: ['customer_id', 'line_id'],
    },
  },
  {
    name: 'get_bills_for_customer',
    description: "Retrieves a list of the customer's bills, most recent first.",
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer.' },
        limit: { type: 'integer', description: 'Maximum number of bills to return.', default: 12 },
      },
      required: ['customer_id'],
    },
  },
  {
    name: 'send_payment_request',
    description:
      'Sends a payment request to the customer for a specific bill.\n\nChecks:\n    - Customer exists\n    - Bill exists and belongs to the customer\n    - No other bills are already awaiting payment for this customer\nLogic: Sets bill status to AWAITING_PAYMENT and notifies customer.\nWarning: This method does not check if the bill is already PAID.\nAlways check the bill status before calling this method.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer who owns the bill.' },
        bill_id: { type: 'string', description: 'ID of the bill to send payment request for.' },
      },
      required: ['customer_id', 'bill_id'],
    },
  },
  {
    name: 'get_data_usage',
    description:
      'Retrieves current billing cycle data usage for a line, including data\n\nrefueling amount, data limit, and cycle end date.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer who owns the line.' },
        line_id: { type: 'string', description: 'ID of the line to check usage for.' },
      },
      required: ['customer_id', 'line_id'],
    },
  },
  {
    name: 'enable_roaming',
    description: 'Enables international roaming on a line.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer who owns the line.' },
        line_id: { type: 'string', description: 'ID of the line to enable roaming for.' },
      },
      required: ['customer_id', 'line_id'],
    },
  },
  {
    name: 'disable_roaming',
    description: 'Disables international roaming on a line.',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer who owns the line.' },
        line_id: { type: 'string', description: 'ID of the line to disable roaming for.' },
      },
      required: ['customer_id', 'line_id'],
    },
  },
  {
    name: 'transfer_to_human_agents',
    description:
      "Transfer the user to a human agent, with a summary of the user's issue.\n\nOnly transfer if\n -  the user explicitly asks for a human agent\n -  given the policy and the available tools, you cannot solve the user's issue.",
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: "A summary of the user's issue." },
      },
      required: ['summary'],
    },
  },
  {
    name: 'refuel_data',
    description:
      "Refuels data for a specific line, adding to the customer's bill.\n\nChecks: Line status must be Active, Customer owns the line.\nLogic: Adds data to the line and charges customer based on the plan's refueling rate.",
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'ID of the customer who owns the line.' },
        line_id: { type: 'string', description: 'ID of the line to refuel data for.' },
        gb_amount: { type: 'number', description: 'Amount of data to add in gigabytes.' },
      },
      required: ['customer_id', 'line_id', 'gb_amount'],
    },
  },
];
