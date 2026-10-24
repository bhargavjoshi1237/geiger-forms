# Adjacent, form-related product categories: features form builders are absorbing (as of October 2026)

Scope: six categories that sit next to form builders. Scheduling/booking, e-signature and documents, interactive lead-gen (quiz/calculator/funnel), client intake and onboarding portals, workflow and approvals, and in-app feedback (micro-surveys and feature-request boards).

Freshness: "vendor page, fetched 2026-10-21" means I read the vendor's own live page today. "Third-party" means a review or comparison site, often run by a competitor, and those figures are unverified. Older items (2021 to 2024) are dated inline.

## Key question 0 (objective): For each category, what is the core job, which 5 to 10 features matter, which of them are form-adjacent, and which form builders have already moved in?

### Takeaway
Form builders have moved furthest into **e-signature** and **scheduling**. Jotform, Paperform, Fillout and Formstack sell signatures as metered plan features. Tally gives them away free. Fillout and Paperform now ship native scheduling. Typeform still relies on a Calendly question block. Form builders have moved least into **intake portals** (persistent requests, reminders that chase missing documents, item-level approval) and **in-app feedback** (in-product SDK targeting, voting boards). Formbricks is the main form/survey tool that has crossed into in-app surveys.

### Cited Findings

#### 1. Scheduling and booking (Calendly, Cal.com, SavvyCal, plus routing specialists such as Chili Piper)
- **Core job.** Turn a qualified prospect or client into a booked meeting with the right person, then cut no-shows. Calendly's Teams tier markets this as "Qualify, route, & schedule leads." — [Calendly pricing (vendor page, fetched 2026-10-21)](https://calendly.com/pricing)
- **Key features and where they sit in Calendly's tiers:**
  - Routing forms (lead routing): Teams and Enterprise only.
  - Round robin: Teams and Enterprise only.
  - Reminders and automations: Standard and above.
  - HubSpot: Standard and above. HubSpot routing is a Teams feature.
  - Salesforce: Teams and above.
  - Stripe and PayPal payments: Standard and above.
  - AI add-ons: "Callie," described as an AI assistant that schedules over email, and Notetaker, which produces recaps and action items.
  — [Calendly pricing](https://calendly.com/pricing)
- **Routing on top of existing forms.** Calendly Routing works with existing HubSpot, Marketo and Pardot forms, so the forms don't need rebuilding. Visible and hidden fields, plus enrichment from Clearbit or ZoomInfo, decide which booking page a lead sees. Known leads go to their account owner through a HubSpot or Salesforce lookup filtered by fields such as deal stage or territory. This is vendor marketing. — [Calendly blog: Routing](https://calendly.com/blog/routing); [Calendly Routing feature page](https://calendly.com/features/routing)
- **Cal.com.** Free (1 user) already includes Stripe and PayPal payments and email/SMS notifications. Teams ($12/user/mo, billed yearly) adds routing forms, round robin and booking analytics. Organizations is $28/user/mo. Cal.ai, an AI phone agent, is linked but not priced. — [Cal.com pricing (vendor page, fetched 2026-10-21)](https://cal.com/pricing)
- **SavvyCal.** Basic is $10/user/mo annually ($12 monthly). Premium is $17/user/mo annually ($20 monthly). Both include round robin, team scheduling, workflows and reminders. Stripe payments are Premium only. The page lists no routing or lead-qualification feature. — [SavvyCal pricing (vendor page, fetched 2026-10-21)](https://savvycal.com/pricing)
- **Form-adjacent features:** the qualifying form itself, answer-based routing, owner lookup, round robin, a booking step embedded right after submit, payment at booking, and reminders.
- **Fillout has moved in natively, and aggressively.** "Fillout Scheduling" books meetings "with a scheduling form." It syncs with Google and Outlook calendars and sends email/SMS reminders. It supports buffers and minimum notice, round robin and collective meetings, "routing can use page logic," Stripe payment before or after booking, and pushes to 50+ integrations (Salesforce, HubSpot, Slack, Airtable). It is free for a whole team up to 1,000 meetings per month. Fillout positions it against Calendly's $20/user/mo for routing and round robin. — [Fillout Scheduling (vendor page, fetched 2026-10-21)](https://www.fillout.com/scheduling)
- Fillout lists "Scheduling forms" on every plan, including Free. — [Fillout pricing](https://www.fillout.com/pricing)
- Fillout's round robin supports host priority levels and per-host locations. — [Fillout docs: round robin](https://www.fillout.com/help/round-robin)
- **Paperform has moved in natively.** Its scheduling forms sync with Google Calendar, send email reminders, convert time zones and take payment at booking through Stripe or PayPal. — [Paperform scheduling forms](https://paperform.co/scheduling-forms/)
- The Paperform pricing page lists "Unlimited" appointment bookings on every plan, Free included. — [Paperform pricing (vendor page, fetched 2026-10-21)](https://paperform.com/pricing/)
- **Typeform has not built native scheduling.** It offers a Calendly question block built and managed by Typeform. That block supports only personal event types (one-on-one and group), not shared or team event types, and it requires Typeform Basic or above. Calendly's help center page describing this was updated July 2026. — [Calendly help: Calendly + Typeform](https://calendly.com/help/calendly-typeform)
- Multiple Calendly questions plus logic jumps can route respondents to different people. — [Calendly integration page for Typeform](https://calendly.com/integration/typeform)
- Typeform community threads from 2021 to 2022 show users asking for native slot booking. Staff suggested a dropdown workaround, which does not remove a slot once someone takes it, or the Calendly app. Calendly was described as "the first application we've added to Typeform, as a question type." **Dated 2021 to 2022.** — [Typeform Community: appointment booking thread](https://community.typeform.com/questions/2112); [Typeform Community: clinics booking](https://community.typeform.com/conversations/611); [Typeform Community: Calendly app post](https://community.typeform.com/typeform-updates-24/under-the-hood-a-closer-look-at-our-calendly-application-3962)
- **Heyflow** (funnel builder) has a native Calendly block. It pre-fills contact details and advances the funnel after booking. It sits in the Growth and Scale "Conversion Bundle." The source is vendor content. — [Heyflow blog: funnel builder + Calendly](https://heyflow.com/blog/funnel-builder-calendly/)
- **Jotform** markets appointment-booking forms, using Jotform Workflows for confirmations and reminders and Jotform Sign for consent before appointments. This is marketing copy, not a field-level spec. — [Jotform appointment scheduling use case](https://www.jotform.com/use-cases/appointment-scheduling/)
- **Tally** offers only a Date & Time input. I found no evidence of booking or calendar sync. — [Tally features](https://www.tally.so/features)

#### 2. E-signature and document workflows (DocuSign, PandaDoc, Dropbox Sign, Jotform Sign, Papersign)
- **Core job.** Get a legally binding signature on a document generated from collected data, track it, chase it, and store it with an audit trail.
- **Key features, from DocuSign's tiers (third-party, conflicting):**
  - Templates and signing order.
  - Bulk Send.
  - Web Forms and PowerForms, where a form completion creates an envelope.
  - Payments and signer attachments.
  - Conditional or advanced fields and data verification.
  - SMS delivery at about $0.40 per send and ID verification at about $2.50 per attempt.
  - Envelope caps: Personal about 5/month. Standard and Business Pro are commonly cited at about 100 envelopes per user per year, but one source says 10 per user per month.
  — [Signeasy: DocuSign pricing 2026](https://signeasy.com/blog/business/docusign-pricing); [Activepieces: DocuSign pricing 2026](https://www.activepieces.com/blog/how-much-does-docusign-pricing-2026-cost.md); [AutomationAtlas](https://automationatlas.io/answers/docusign-pricing-explained-2026/)
- **PandaDoc (third-party).** Its distinguishing features are CRM integrations, approval workflows and a content library. One guide says API access, web forms, bulk send, notarization and QES (qualified electronic signatures) are commonly paid extras. — [Bind: PandaDoc pricing 2026](https://bindlegal.com/resources/comparisons/pandadoc-pricing-2026/); [Peony: PandaDoc pricing](https://www.peony.ink/blog/pandadoc-pricing); [Eversign guide](https://eversign.com/blog/pandadoc-pricing-guide)
- **Dropbox Sign.** Essentials is $15/mo monthly or $10.05/mo yearly. Standard is $25/user/mo monthly or $17.50/user/mo yearly. Premium is custom and unlimited. API pricing is separate. — [Dropbox Sign pricing (vendor page, fetched 2026-10-21)](https://sign.dropbox.com/products/dropbox-sign/pricing)
- **Form-adjacent features:**
  - A signature field on submit.
  - Generating a PDF or contract from answers.
  - Multi-party signing order.
  - Signing reminders.
  - An approval step before or after signing.
  - Payment at signing.
  - An audit trail.
- **Jotform has moved in, deeply.** Jotform Sign is metered by plan: 10, 100, 250 and 1,000 signed documents per month on Starter, Bronze, Silver and Gold, and unlimited on Enterprise. — [Jotform pricing (vendor page, fetched 2026-10-21)](https://www.jotform.com/pricing/)
- Jotform Sign has automated approval flows and is integrated with Jotform Approvals. — [Jotform Sign: automated approval flows](https://www.jotform.com/products/sign/features/automated-approval-flows/); [Jotform Approvals help](https://www.jotform.com/help/chapter-268-jotform-approvals)
- Capterra lists Jotform Sign from $34/user/mo, rated 4.8/5 from 216 reviews. Third-party, March 2026. — [Capterra: Jotform Sign](https://capterra.com/p/10014571/Jotform-Sign/)
- **Paperform launched Papersign in July 2023 (dated).** It is pitched as drafting, creating and signing in one platform, against DocuSign. — [ChannelLife AU](https://channellife.com.au/story/aussie-startup-paperform-launches-e-signature-software); [iTWire](https://itwire.com/business-it-news/business-software/paperform-adds-papersign-for-digital-signatures)
- Papersign is now **bundled into every Paperform plan**: 3, 25 and 100 documents per month on Free, Pro and Business, and unlimited on Enterprise. — [Paperform pricing](https://paperform.com/pricing/)
- A standalone Papersign Pro has been cited at $24/user/mo, with Free capped at 3 documents. Some of those pages are dated February 2024 (possibly stale). — [Papersign vs DocuSign](https://papersign.com/docusign-alternative)
- **Fillout:** "Collect signatures" is on Starter ($15/mo) and above. PDF generation is on all plans, Free included. — [Fillout pricing](https://www.fillout.com/pricing)
- **Tally:** e-signatures are free for all users (the /signature block). — [Tally help: electronic signatures](https://tally.so/help/electronic-signatures)
- **Formstack:** Forms alone is $83/mo annually and includes no e-signatures, no document generation and no approval routing. Suite (Forms + Documents + Sign) is $250/mo annually and includes unlimited eSignatures, 250 document deliveries per month and approval routing. — [Formstack pricing (vendor page, fetched 2026-10-21)](https://www.formstack.com/pricing)
- **Typeform:** lists a "Signature Question," but the pricing page doesn't say which plan includes it. — [Typeform pricing](https://www.typeform.com/pricing/)
- **involve.me:** e-signatures are only on Scale ($139/mo yearly). — [involve.me pricing](https://www.involve.me/pricing)

#### 3. Interactive lead-gen: quizzes, calculators, funnels (Outgrow, Interact, ScoreApp, involve.me, Heyflow)
- **Core job.** Trade value (a score, a recommendation, a quote) for a qualified lead's contact details, then segment and route or nurture by result.
- **Outgrow:**
  - Content types: quiz, assessment, poll, calculator, form, chatbots, recommendations, giveaways and landing pages, gated by tier.
  - Logic jump.
  - Charts and graphs.
  - HubSpot and ActiveCampaign integrations, with Marketo, SAP and Eloqua as paid add-ons on Business.
  - Plans are tiered by leads: from 250 leads/mo on Freelancer Limited ($14/mo yearly) to 50,000 leads/mo on Business ($600/mo yearly).
  - The page does not mention lead scoring or A/B testing.
  — [Outgrow pricing (vendor page, fetched 2026-10-21)](https://outgrow.co/pricing/)
- **ScoreApp:**
  - Scorecard and quiz builder with multiple score calculations.
  - Dynamic result pages and result emails, with dynamic PDF reports from Business.
  - Abandon emails.
  - Landing pages, with split testing on Pro.
  - CRM integrations: HubSpot, Salesforce, Keap.
  - AI quiz builder, with data enrichment on Pro.
  - No booking feature is listed.
  - Prices: Starter $30/mo (yearly), Business $75, Pro $112, Enterprise from $799/mo.
  — [ScoreApp pricing (vendor page, fetched 2026-10-21)](https://www.scoreapp.com/pricing/)
- **involve.me:**
  - Quizzes, calculators and funnels on all plans.
  - **Lead scoring on all plans.**
  - Payments on 1, 2 and 10 platforms by tier.
  - E-signatures on Scale only.
  - Built-in CRM on Start. HubSpot, Pipedrive and Zoho from Grow. Salesforce and webhooks on Scale.
  - AI funnel creation using credits.
  - Start is described as "Qualify leads with quiz funnels and built-in email sequences."
  - Prices: Start $29, Grow $69, Scale $139/mo yearly. Enterprise from $499.
  — [involve.me pricing (vendor page, fetched 2026-10-21)](https://www.involve.me/pricing)
- **Interact (third-party, competitor-run sources).** Lite is $27/mo for 500 leads, Growth $53/mo for 2,000 leads, Pro $125/mo for 8,000 leads, all yearly. Sources conflict on whether a free plan exists. — [Uplup: Interact alternatives](https://uplup.com/blog/interact-alternatives); [Dupple review](https://dupple.com/tools/interact)
- **Heyflow (third-party).** Starter is €49/mo (5 funnels, 50 responses), Growth €89, Scale €289. — [HubSpot marketplace listing (updated 2026-01-07)](https://ecosystem.hubspot.com/marketplace/listing/heyflow-993605); [Adtribute directory](https://www.adtribute.io/directory/heyflow)
- I could not confirm a native Heyflow lead-routing feature. Heyflow's own pricing page returned 403.
- **Form-adjacent features:**
  - Scoring and calculations.
  - Outcome or result screens.
  - PDF reports.
  - Result-based emails and abandon emails.
  - Enrichment.
  - Routing by score.
  - A/B tests and landing pages.
- **Typeform has moved in, and charges a premium for it.** "Typeform for Growth," announced July 2024 (dated), covers automated scoring, routing and emailing. — [Typeform blog: Typeform for Growth announcement](https://www.typeform.com/blog/typeform-for-growth-announcement)
- Growth plans let teams use enrichment variables to score and segment leads as they submit the form. — [Typeform Help: Typeform for Growth](https://help.typeform.com/hc/en-us/articles/27232463443604)
- Typeform's current price list:
  - Growth Flow: $266/mo yearly or $379/mo monthly. Includes enrichment (1,500/mo base, up to 5,000/mo), Salesforce, "Smart Insights," and the Contacts & Automations add-on.
  - Business: $91/mo yearly or $129/mo monthly.
  - Contacts & Automations add-on bought separately: +$25/mo or +$75/mo.
  - The same page shows a second, conflicting set of figures in its compare table.
  — [Typeform pricing (vendor page, fetched 2026-10-21)](https://www.typeform.com/pricing/)
- **Fillout:** "Calculations and scoring" on all plans, Free included. Clearbit lead enrichment is a separate "Conversion kit." — [Fillout pricing](https://www.fillout.com/pricing)
- **Paperform:** calculations field and scoring are Pro ($49/mo yearly) and above. — [Paperform pricing](https://paperform.com/pricing/)

#### 4. Client intake and onboarding portals (Content Snare, Dubsado, HoneyBook, Moxo)
- **Core job.** Collect everything needed from a client (answers, files, approvals) across many sessions, chase what is missing, and move the client from inquiry to contract to payment to kickoff.
- **Content Snare:**
  - Unlimited email reminders per request ("Set up as many email reminders as you like for each request").
  - SMS allowances of 40 to 400 per month by tier.
  - A simple client portal.
  - Unlimited questions and upload areas.
  - An approval system at the item level.
  - Templates and an AI Request Builder.
  - Plans are capped by active requests: 20 on Basic up to 200+ on Custom.
  - Prices (annual): Basic $35, Plus $71, Pro $119, Custom $215+ per month.
  — [Content Snare pricing (vendor page, fetched 2026-10-21)](https://contentsnare.com/pricing/)
- **HoneyBook:**
  - Lead forms: 2 on Starter, 10 on Essentials, unlimited on Premium.
  - Contracts with e-signature, invoices and payments, and a client portal on all tiers.
  - Scheduler and automations from Essentials.
  - "HoneyBook AI."
  - Prices: $29, $49 and $109/mo, billed yearly.
  — [HoneyBook pricing (vendor page, fetched 2026-10-21)](https://www.honeybook.com/pricing)
- **Dubsado:**
  - Lead capture forms: 1 active on Starter, unlimited on Premier.
  - Invoices and payment plans.
  - Client portal.
  - Scheduler and automated workflows on Premier only.
  - Prices: Starter $335/yr, Premier $525/yr.
  - Contracts and e-signature were not listed in the pricing table.
  — [Dubsado pricing (vendor page, fetched 2026-10-21)](https://www.dubsado.com/pricing)
- **Moxo:**
  - Login-free portals ("front door") for clients and vendors.
  - Onboarding flows.
  - "Agent Foundry" AI agents under human supervision.
  - Audit trail, SOC 2, SSO.
  - No public prices. — [Moxo pricing page (fetched 2026-10-21)](https://www.moxo.com/pricing)
- Third-party Moxo estimates conflict: "Business from $200/mo," a Team plan at $500/mo, and "from $99/mo." — [Agiled](https://agiled.app/blog/moxo-pricing); [Assembly](https://assembly.com/blog/moxo-pricing)
- **Form-adjacent features:**
  - A persistent, resumable request instead of a one-shot form.
  - Per-item upload areas.
  - Scheduled email and SMS chasers for incomplete items.
  - Item-level approve or reject with a request to resubmit.
  - A client-facing portal that lists outstanding forms.
  - Contract plus e-signature plus invoice in sequence.
- **Form builders are mostly absent here.** Jotform reminder emails go to manually entered recipients on a schedule. — [Jotform help: reminder emails](https://www.jotform.com/help/541-How-to-Set-Reminder-Emails-for-Your-Forms)
- A **July 2026** Jotform support answer says there is "currently no option to automatically send reminders to users with incomplete submissions." The request was escalated to developers. — [Jotform answers: reminders for incomplete submissions](https://www.jotform.com/answers/40167661-form-submission-reminder-emails-for-incomplete-submissions)
- Jotform's portal advice (2023, dated) is to build an app that links several forms. — [Jotform answers: creating a client portal](https://www.jotform.com/answers/7886781-creating-a-client-portal)
- Typeform's compare table shows partial-submit points: 1 on Basic and Plus, 3 on Business and Growth Flow. — [Typeform pricing](https://www.typeform.com/pricing/)

#### 5. Workflow, approval and process tools (Kissflow, Process Street, Pipefy)
- **Core job.** Turn a request into a governed, multi-step process (approvals, tasks, SLAs, handoffs) with an audit trail.
- **Process Street.** Every plan's feature list includes:
  - Unlimited forms.
  - Conditional logic, approvals, enforced task order and dynamic due dates.
  - Role assignments and task permissions.
  - Workflow run links and scheduled workflows.
  - Data Sets: 5,000 records on Startup, 10,000 on Pro.
  - Trigger from email.
  - Zapier, Power Automate and Make connectors.
  - Slack and Teams apps.
  - Analytics dashboards.
  - All plans say "Contact sales." — [Process Street pricing (vendor page, fetched 2026-10-21)](https://www.process.st/pricing/)
- Third-party Process Street estimates: about $25 to $30 per member per month on Pro and about $52.50 on Enterprise. These are unofficial and conflict with other figures. — [FlowForma: Process Street pricing (Apr 2026)](https://www.flowforma.com/blog/process-street-pricing)
- **Pipefy (third-party; the official page returned 403).** Starter is free. Business is $33/user/mo with conditional logic, automation and API. Enterprise is $65/user/mo with SSO and integrations. Unlimited is custom. — [Capterra: Pipefy pricing](https://www.capterra.com/p/144848/Pipefy/pricing/); [FlowForma: Pipefy pricing](https://www.flowforma.com/blog/pipefy-pricing)
- **Kissflow.** Quote-only. Pitches "unlimited applications," "unlimited integrations," "25+ AI-powered automation features," "no surcharges for AI or API usage," and vendor and customer portals. — [Kissflow pricing (vendor page, fetched 2026-10-21)](https://kissflow.com/pricing/)
- **Form-adjacent features:**
  - Approval steps: sequential or parallel, with custom outcomes.
  - Conditional assignment to approvers.
  - Due dates and SLAs.
  - Post-submit task checklists.
  - Status visible to the submitter.
  - Audit trail.
- **Form builders that have moved in:**
  - **Jotform Approvals** turns submissions into approval tasks, with custom outcomes beyond approve and deny, plus multistep and parallel approvals. — [Jotform Approvals help](https://www.jotform.com/help/chapter-268-jotform-approvals)
  - **Jotform Workflows** is described as a free workflow automation and approval builder. — [Jotform Workflows approvals](https://www.jotform.com/products/workflows/features/workflows-approvals/)
  - **Formstack** puts approval routing only in Suite (3x the price of Forms alone). — [Formstack pricing](https://www.formstack.com/pricing)
  - **Paperform** has Stepper workflow steps: 200/month on Free, unlimited on paid plans. Approvals are not named. — [Paperform pricing](https://paperform.com/pricing/)
  - **Fillout Workflows** is on all plans. Approvals are not named. — [Fillout pricing](https://www.fillout.com/pricing)

#### 6. In-app feedback, micro-surveys and feedback boards (Hotjar/Contentsquare, Sprig, Userpilot, Canny, Featurebase)
- **Core job.** Ask the right user the right question at the right moment in the product, analyze the answers, and close the loop: prioritize, ship, and notify the people who asked.
- **Hotjar's survey product is now Contentsquare "Voice of Customer (formerly Hotjar Ask)."** hotjar.com/pricing 308-redirects to contentsquare.com/pricing.
  - Free: 100 responses per month and 3 widgets or surveys.
  - Growth: "From $79/month," 500 to 100k responses.
  - Advanced targeting and embedded surveys on Growth and above.
  - AI survey generator and AI summary on all plans. AI-automated analysis on Growth and above.
  — [Contentsquare pricing (vendor page, fetched 2026-10-21)](https://contentsquare.com/pricing/?utm_source=hotjar-pricing)
- **Sprig.** Quote-only. Pricing scales with response volume, activated capabilities and deployment environments (link, email, web, mobile). Features include an adaptive survey architecture and AI agents (Design, Field, Analyze, Synthesize), with HIPAA and SOC 2 compliance. — [Sprig pricing (vendor page, fetched 2026-10-21)](https://sprig.com/pricing)
- **Userpilot.** Starter is $299/mo (NPS survey, segmentation). Growth is "From $849/mo" (advanced in-app surveys, resource center, session replays). Includes the AI agent "Lia." — [Userpilot pricing (vendor page, fetched 2026-10-21)](https://userpilot.com/pricing/)
- **Canny.**
  - Free: 25 tracked users.
  - Pro: "starts at" $79/mo billed yearly.
  - Business: custom.
  - Unlimited boards and voting on all plans.
  - Autopilot AI (captures from Intercom and Zendesk, deduplicates) on all plans.
  - Jira and Linear on Pro. HubSpot and Salesforce on Business.
  - Pricing scales by "tracked users," meaning people who gave feedback.
  — [Canny pricing (vendor page, fetched 2026-10-21)](https://canny.io/pricing)
- **Featurebase.** Now sold as a bundle of feedback plus support desk: Growth $29/seat/mo, Professional $59, Enterprise $99, billed yearly, plus $0.49 per AI resolution. Each paid plan "Includes Feedback." — [Featurebase pricing (vendor page, fetched 2026-10-21)](https://www.featurebase.app/pricing)
- **Form-adjacent features:**
  - An embeddable widget or SDK with event and segment triggers.
  - NPS and CSAT templates.
  - Respondent identification.
  - AI summarization of answers.
  - A public feature-request board with voting.
  - Status changes that notify voters (closing the loop).
  - A changelog.
- **The form/survey tool that has moved in: Formbricks** (open source).
  - In-product and link surveys on the free Hobby tier.
  - Pro ($74/mo): respondent identification, attribute-based segmentation, iOS and Android SDKs.
  - Scale ($325/mo): workflows.
  - Enterprise add-on: "feedback management" with AI topic labeling.
  — [Formbricks pricing (vendor page, fetched 2026-10-21)](https://formbricks.com/pricing)
- I found no evidence of Typeform, Jotform, Fillout, Tally or Paperform shipping an in-product targeting SDK or a voting board.

### Inferences
- How far each category has been absorbed by form builders, from most to least: **e-signature** (Jotform, Paperform, Fillout, Tally, Formstack), then **scheduling** (Fillout and Paperform native, Typeform and Heyflow through Calendly), then **scoring and routing** (Typeform Growth, Fillout, involve.me), then **approvals** (Jotform, Formstack), then **intake portals and chasers**, then **in-app feedback**. The last two remain the least-contested gaps.
- In each category, the specialist's moat sits after the form:
  - Scheduling: calendar availability and owner routing.
  - E-sign: legally robust audit trail and multi-party signing order.
  - Lead-gen: result pages and personalized PDFs.
  - Intake: persistent requests and chasers.
  - Workflow: SLAs and tasks.
  - Feedback: in-product targeting and voting.
- The capture part of every one of these is already a form.

### Gaps
- No official PandaDoc, DocuSign, Heyflow or Pipefy pricing could be read. PandaDoc returned 429, DocuSign timed out, Heyflow and Pipefy returned 403. Their figures above are third-party and conflict.
- Found no launch date for Jotform Sign, and no launch date for Fillout Scheduling.
- Interact's own pricing page returned 404, so its figures are competitor-reported.
- Found no confirmation of which Typeform plan includes the Signature question, Stripe payments or scoring.

## Key question 1: Which form-adjacent features have the strongest evidence of demand (user requests, competitor adoption, pricing premiums)?

### Takeaway
The strongest demand evidence is for **(a) qualify, route and book right after submit**, and **(b) e-signature on submission**. Both show convergent competitor adoption, explicit plan-tier gating, and (for booking) measured conversion lifts. **Lead scoring with enrichment** carries the biggest pricing premium inside a form builder: Typeform Growth Flow costs roughly 3x Business. **Approval routing** and **document generation plus sign** carry a 3x bundle premium at Formstack. **Reminders for incomplete submissions** show an explicit, unmet user request (Jotform, July 2026).

### Cited Findings
- **Booking after qualification, competitor adoption.** Fillout made scheduling, routing and round robin free and positions it against Calendly's $20/user/mo for routing. — [Fillout Scheduling](https://www.fillout.com/scheduling)
- Paperform offers unlimited bookings on every plan. — [Paperform pricing](https://paperform.com/pricing/)
- Typeform built a Calendly question block. — [Calendly help](https://calendly.com/help/calendly-typeform)
- Heyflow put a native Calendly block in its paid "Conversion Bundle." — [Heyflow blog](https://heyflow.com/blog/funnel-builder-calendly/)
- Calendly built routing that sits on top of other vendors' forms (HubSpot, Marketo, Pardot). — [Calendly blog: Routing](https://calendly.com/blog/routing)
- **Booking after qualification, pricing gate.** Calendly reserves routing forms and round robin for Teams ($16/seat, versus $10 Standard). — [Calendly pricing](https://calendly.com/pricing)
- Cal.com reserves routing forms for Teams ($12/user/mo). — [Cal.com pricing](https://cal.com/pricing)
- Chili Piper's "Routing & Scheduling" (web-form routing, round robin, "instant calls from forms") is $1,250/mo with 15 seats, then $45/seat. — [Chili Piper pricing](https://www.chilipiper.com/pricing)
- **Booking after qualification, outcome data (vendor-published, not independent).** RevenueHero reports a median 62% qualified-to-booked rate across more than one million B2B SaaS inbound form submissions, with the top 10% at 78% or higher. — [RevenueHero benchmarks 2026](https://www.revenuehero.io/blog/demo-request-to-booked-conversion-rate-benchmarks-in-2026)
- A March 2026 RevenueHero report says more than 10,000 leads booked "right after the form fill" in one week, a 61.3% average. — [RevenueHero Breaking Inbound #13](https://www.revenuehero.io/breaking-inbound/breaking-inbound-13)
- Chili Piper customer quotes claim demo-request book rates rising from about 50% to 76%, and from about 40% to about 90%. These are vendor case studies, seen as a search snippet. — [Chili Piper Form Concierge](https://chilipiper.com/products/form-concierge-old)
- **Booking after qualification, user requests.** Typeform users were asking for native booking with live slot removal in 2021 to 2022 (dated). — [Typeform Community](https://community.typeform.com/questions/2112)
- **E-signature, competitor adoption and metering.** Jotform meters signed documents by plan (10 up to 1,000/mo) and also meters payment submissions (10 up to 1,000/mo). — [Jotform pricing](https://www.jotform.com/pricing/)
- Paperform bundles Papersign in all plans (3, 25, 100 documents, then unlimited). — [Paperform pricing](https://paperform.com/pricing/)
- Fillout gates "Collect signatures" to Starter and above. — [Fillout pricing](https://www.fillout.com/pricing)
- Tally makes signatures free. — [Tally help](https://tally.so/help/electronic-signatures)
- involve.me gates e-signatures to Scale (about 2x Grow). — [involve.me pricing](https://www.involve.me/pricing)
- **Scoring and enrichment, pricing premium.** Typeform Growth Flow costs $266 to $379/mo versus Business at $91 to $129/mo, about 2.9x. It bundles enrichment, Salesforce and automations. — [Typeform pricing](https://www.typeform.com/pricing/)
- Typeform describes Growth as "automated scoring, routing and emailing" (July 2024). — [Typeform blog](https://www.typeform.com/blog/typeform-for-growth-announcement)
- ScoreApp, a scoring-only product, charges $30 to $799/mo. — [ScoreApp pricing](https://www.scoreapp.com/pricing/)
- **Approvals and document generation, bundle premium.** Formstack Suite (Forms + Documents + Sign + approval routing) is $250/mo versus Forms alone at $83/mo (both annual), about 3x. — [Formstack pricing](https://www.formstack.com/pricing)
- **Incomplete-submission reminders, explicit unmet request.** Jotform support said in July 2026 that there is no automatic reminder for incomplete submissions and escalated it to developers. — [Jotform answers](https://www.jotform.com/answers/40167661-form-submission-reminder-emails-for-incomplete-submissions)
- Content Snare builds its whole product around unlimited reminders per request. — [Content Snare pricing](https://contentsnare.com/pricing/)
- **Feedback boards.** Canny charges from $79/mo and gates CRM and PM integrations to higher tiers. — [Canny pricing](https://canny.io/pricing)
- Featurebase now bundles feedback into a per-seat support suite. — [Featurebase pricing](https://www.featurebase.app/pricing)
- Formbricks is the only form/survey builder found adding in-app SDKs. — [Formbricks pricing](https://formbricks.com/pricing)

### Inferences
- Ranked by evidence strength (my judgment):
  1. Book after qualify (routing plus round robin).
  2. E-signature with document generation.
  3. Scoring, enrichment and result-based follow-up.
  4. Approval steps.
  5. Reminders and chasers for incomplete or missing items.
  6. In-app micro-survey widget.
  7. Feature-request voting board.
- Items 1 and 2 are now table stakes among challenger form builders, so Fillout and Tally give them away. They work as parity features, not premium ones.
- Items 3 and 4 still command premiums, at Typeform and Formstack respectively.
- Items 5 to 7 are white space with little form-builder competition.

### Gaps
- Found no public user-vote counts (Canny-style boards) for these features on Typeform, Tally or Fillout roadmaps. Tally's roadmap page did not surface.
- Found no independent, non-vendor study of form-to-meeting conversion lift. All the figures are from RevenueHero or Chili Piper.
- Found no usage data on how many Jotform or Paperform customers actually use Sign or appointments.

## Key question 2: What is the operation cycle in each category, and where does a form currently stop?

### Takeaway
In every category a form covers only the **capture** step, sometimes plus light logic. The value specialists charge for comes in the steps after submit: route, book, sign, chase, approve, notify, close the loop. The table below gives each cycle. The cycles are my synthesis; the "where it stops" column is supported by the citations under it.

### Cited Findings
| Category | Operation cycle | Where a typical form stops today |
|---|---|---|
| Scheduling | capture, then qualify (answers plus enrichment), route (owner lookup or round robin), book, remind (email/SMS), reschedule or handle no-show, log to CRM | After qualify. Typeform hands off to a Calendly block that supports only personal event types. Fillout and Paperform go on through book and remind. |
| E-sign | collect data, then generate the document, set signing order, send, remind, sign with audit trail, countersign or approve, store, take payment | After a single-signer signature field. Tally gives a free signature, but generation and signing order are not documented. Formstack needs the 3x Suite for document generation plus Sign. |
| Lead-gen | attract (landing page), then engage (quiz or calculator), score, show a personalized result or PDF, capture, route or book, nurture with emails, A/B test | After capture plus a calculation. Result PDFs, abandon emails and split tests sit in ScoreApp's Business and Pro tiers. Typeform charges a Growth premium for scoring, routing and emailing. |
| Intake and onboarding | inquiry form, then proposal, contract plus e-sign, invoice, onboarding questionnaire plus document request, chase reminders, item approval, kickoff | After one-shot submission. Jotform has no automatic reminder for incomplete submissions (July 2026), and its portal is "build an app linking forms" (2023). |
| Workflow and approval | request form, then conditional routing to approvers (sequential or parallel), SLA and escalation, tasks, handoff, completion, audit and analytics | After the notification email, unless the builder has an approval add-on (Jotform Approvals, Formstack Suite). |
| In-app feedback | event or segment trigger, then micro-survey (NPS/CSAT), AI analysis, feature board with voting, status update, notify voters, changelog | At link surveys. Only Formbricks, among form/survey tools found, ships in-product SDKs and segmentation. |

- Calendly's Typeform block supports only personal event types, not shared or team types. — [Calendly help](https://calendly.com/help/calendly-typeform)
- Fillout Scheduling covers reminders, rescheduling and payment. — [Fillout Scheduling](https://www.fillout.com/scheduling)
- Formstack puts document generation, Sign and approval routing only in Suite. — [Formstack pricing](https://www.formstack.com/pricing)
- ScoreApp puts PDF reports and abandon emails in Business and split testing in Pro. — [ScoreApp pricing](https://www.scoreapp.com/pricing/)
- Jotform has no automatic reminder for incomplete submissions. — [Jotform answers (July 2026)](https://www.jotform.com/answers/40167661-form-submission-reminder-emails-for-incomplete-submissions)
- Jotform's suggested client portal is an app that links several forms. — [Jotform answers (2023)](https://www.jotform.com/answers/7886781-creating-a-client-portal)
- Process Street adds approvals, dynamic due dates and enforced task order after the form. — [Process Street pricing](https://www.process.st/pricing/)
- Canny's loop runs: capture from Intercom or Zendesk, deduplicate, vote, then send to Jira or Linear. — [Canny pricing](https://canny.io/pricing)
- Formbricks offers in-product surveys, SDKs and segments. — [Formbricks pricing](https://formbricks.com/pricing)
- HoneyBook chains lead form, contract with e-sign, invoice, scheduler and automations in one product. — [HoneyBook pricing](https://www.honeybook.com/pricing)

### Inferences
- The shared missing primitive across categories is a **post-submit state machine**: a submission carries a status (pending signature, awaiting approval, missing items, booked) plus timed follow-ups (reminders, escalations). With that primitive, a builder could deliver approvals, chasers and multi-step signing on one engine rather than three features.
- "Partial or resumable submission plus reminders" is the bridge from a form to an intake portal. Typeform already meters partial-submit points by plan, which suggests the plumbing is valued.

### Gaps
- No primary data on drop-off rates at each hand-off, such as form to external Calendly redirect. Heyflow claims a redirect adds a "second decision point," but that is vendor opinion. — [Heyflow blog](https://heyflow.com/blog/funnel-builder-calendly/)

## Key question 3: Which adjacent features could be delivered through companion suite apps (project management, notes, events/ticketing, comms/email, campaigns, dashboards) rather than built natively?

### Takeaway
Build natively the steps that must happen **inside the respondent's session**: the signature field, scoring and outcome screens, booking-slot selection, save-and-resume. Delegate the steps that happen **after submit, over time, or to internal staff** to companion apps:
- Reminders and chasers go to Comms.
- Nurture after scoring goes to Campaigns.
- Approvals, onboarding checklists and feature-request triage go to project management (Flow).
- Group sessions and ticketed bookings go to Events.
- Lead-score, NPS and booking analytics go to Dash.
- Document templates go to Docs.
- Internal notes on submissions go to Notes.

### Cited Findings
- The Geiger suite already defines per-product schemas for Notes, Flow (project management), Campaign, Comms, Events, Docs, Chat, Content, Canvas, Assets, Office, Pods, Grey, Property, Dash and Forms, all on one shared Supabase project. — [C:\Pro\geiger-forms\SUPABASE_CONVENTIONS.md](C:\Pro\geiger-forms\SUPABASE_CONVENTIONS.md); [C:\Pro\geiger-forms\MIGRATION_CONVENTIONS.md](C:\Pro\geiger-forms\MIGRATION_CONVENTIONS.md)
- Incumbents deliver these steps through integrations, which shows the integration pattern is accepted:
  - Calendly routing sits on top of third-party forms and CRM lookups. — [Calendly blog](https://calendly.com/blog/routing)
  - Typeform's scheduling is a Calendly app. — [Calendly help](https://calendly.com/help/calendly-typeform)
  - Fillout pushes bookings to 50+ integrations. — [Fillout Scheduling](https://www.fillout.com/scheduling)
  - Canny's value is partly its Jira, Linear, HubSpot and Salesforce links. — [Canny pricing](https://canny.io/pricing)
  - Process Street relies on Zapier, Power Automate and Make connectors plus Slack and Teams apps. — [Process Street pricing](https://www.process.st/pricing/)
- Bundling across products is the incumbents' own strategy:
  - "Every plan includes all three products" (Paperform forms, scheduling and Papersign). — [Paperform pricing](https://paperform.com/pricing/)
  - Formstack Suite bundles Forms, Documents and Sign. — [Formstack pricing](https://www.formstack.com/pricing)
  - Jotform cross-sells Workflows, Sign and Tables around appointments. — [Jotform appointment use case](https://www.jotform.com/use-cases/appointment-scheduling/)
  - Featurebase bundles feedback with support. — [Featurebase pricing](https://www.featurebase.app/pricing)
- The steps that specialists charge for are communications-heavy, which maps to a Comms or Campaign app:
  - Content Snare: unlimited email reminders and SMS allowances. — [Content Snare pricing](https://contentsnare.com/pricing/)
  - ScoreApp: result emails and abandon emails. — [ScoreApp pricing](https://www.scoreapp.com/pricing/)
  - involve.me: "built-in email sequences." — [involve.me pricing](https://www.involve.me/pricing)
  - Calendly, Cal.com and SavvyCal: email and SMS reminders. — [Calendly pricing](https://calendly.com/pricing); [Cal.com pricing](https://cal.com/pricing)

### Inferences (my mapping, not from external sources)
- **Comms or email app:**
  - Booking reminders and no-show nudges.
  - Signature and approval reminders.
  - Content Snare-style chasers for missing items.
  - Result emails after a quiz.
  - Abandon or incomplete-submission emails, the gap Jotform users report.
  - Forms needs only to emit a "submission state changed" event and a recipient. Comms owns cadence and templates.
- **Campaign app:**
  - Score- or segment-based nurture sequences.
  - A/B tests on landing pages or quiz variants.
  - Giveaway and lead-magnet distribution.
  - Typeform charges a Growth premium for this, so a suite can bundle it as a differentiator.
- **Flow (project management):**
  - Approval chains modelled as tasks with assignees, due dates and SLAs (the Process Street, Pipefy and Kissflow pattern).
  - Client-onboarding checklists created from an intake submission.
  - Feature-request triage: Canny-style ideas becoming issues, with voters notified on status change.
  - Forms supplies the trigger and the approval UI in the respondent or approver view.
- **Events (ticketing):**
  - Booking for group or capacity-limited sessions (webinars, classes, consultations sold as tickets), plus payment at booking.
  - One-to-one calendar-availability scheduling with round robin likely still needs native calendar sync. This is the core of Fillout Scheduling and Calendly. It could live in Forms or as a shared suite service.
- **Docs:** contract and proposal templates that Forms merges answers into, PandaDoc and Formstack Documents style. The legally binding signature, audit trail and signing order is better kept native or in one shared service, because jurisdictional compliance is the e-sign moat.
- **Dash (dashboards):** lead-score distributions, booking conversion (the qualified-to-booked metric RevenueHero benchmarks), NPS and CSAT trends, and approval cycle-time analytics.
- **Notes:** internal reviewer notes and comments on submissions or intake requests. This is low effort but rounds out the HoneyBook and Moxo client record.
- **Build natively in Forms**, because these happen inside the respondent session:
  - Signature field plus PDF of the submission.
  - Calculation and scoring plus outcome screens.
  - An embedded booking step, with slot selection after routing logic.
  - Save-and-resume and partial submissions.
  - Per-item file-upload requests.
  - An embeddable in-app widget or SDK for micro-surveys.
  - A public voting board, which is form-like (submit plus upvote).

### Gaps
- I did not inspect the companion apps' actual capabilities (whether Comms supports SMS, or Events supports calendar sync). This mapping assumes the generic category behaviour implied by each app's name.

## Key question 4: Pricing signals. What do these adjacent tools charge, and what does that suggest about the value of bundling?

### Takeaway
Each adjacent tool typically costs **$10 to $50 per user per month** (scheduling, e-sign, workflow) or **$30 to $150+ per month flat** (quiz, intake, feedback). Routing-centric and in-app tools jump to **$299 to $1,250+ per month**. A small team stitching scheduling, e-sign, quizzes, intake and feedback together could easily spend $150 to $400+ a month in tool fees, often more than the form builder itself. That is strong headroom for a bundled suite. Challengers (Fillout, Tally, Paperform) are already compressing scheduling and e-sign toward free or bundled.

### Cited Findings
**Scheduling**
- Calendly: Standard $10/seat, Teams $16/seat (routing), Enterprise from $15k/yr. — [Calendly pricing](https://calendly.com/pricing)
- Cal.com: Teams $12/user/mo yearly (routing), Organizations $28. — [Cal.com pricing](https://cal.com/pricing)
- SavvyCal: $10 to $17/user/mo yearly. — [SavvyCal pricing](https://savvycal.com/pricing)
- Chili Piper Routing & Scheduling: $1,250/mo for 15 seats. — [Chili Piper pricing](https://www.chilipiper.com/pricing)
- Fillout Scheduling: free up to 1,000 meetings/mo. — [Fillout Scheduling](https://www.fillout.com/scheduling)

**E-sign**
- Dropbox Sign: $10.05 to $25/user/mo. — [Dropbox Sign pricing](https://sign.dropbox.com/products/dropbox-sign/pricing)
- DocuSign (third-party, conflicting): Personal about $10 to $15/mo. Standard about $25 to $45/user/mo. Business Pro (with web forms) about $40 to $65/user/mo. Envelope caps. — [Signeasy](https://signeasy.com/blog/business/docusign-pricing)
- PandaDoc (third-party): about $19 to $35 Starter and about $49 to $65 Business per user/mo. — [Bind](https://bindlegal.com/resources/comparisons/pandadoc-pricing-2026/)
- Jotform Sign (Capterra): from $34/user/mo. — [Capterra](https://capterra.com/p/10014571/Jotform-Sign/)
- Papersign standalone Pro: about $24/user/mo (possibly 2024 data). — [Papersign](https://papersign.com/docusign-alternative)

**Lead-gen**
- Outgrow: $14 to $600/mo yearly. — [Outgrow pricing](https://outgrow.co/pricing/)
- ScoreApp: $30 to $112/mo yearly; Enterprise from $799. — [ScoreApp pricing](https://www.scoreapp.com/pricing/)
- involve.me: $29 to $139/mo yearly; Enterprise from $499. — [involve.me pricing](https://www.involve.me/pricing)
- Interact (third-party): $27 to $125/mo. — [Uplup](https://uplup.com/blog/interact-alternatives)
- Heyflow (third-party): €49 to €289/mo. — [HubSpot listing](https://ecosystem.hubspot.com/marketplace/listing/heyflow-993605)

**Intake**
- Content Snare: $35 to $119/mo yearly, Custom $215+. — [Content Snare pricing](https://contentsnare.com/pricing/)
- HoneyBook: $29 to $109/mo yearly. — [HoneyBook pricing](https://www.honeybook.com/pricing)
- Dubsado: $335 to $525/yr. — [Dubsado pricing](https://www.dubsado.com/pricing)
- Moxo: quote-only; third-party estimates of $99 to $500/mo conflict. — [Agiled](https://agiled.app/blog/moxo-pricing)

**Workflow**
- Pipefy (third-party): $33 to $65/user/mo. — [Capterra](https://www.capterra.com/p/144848/Pipefy/pricing/)
- Process Street: quote-only; about $25 to $52.50/member/mo (unofficial). — [FlowForma](https://www.flowforma.com/blog/process-street-pricing)
- Kissflow: quote-only. — [Kissflow pricing](https://kissflow.com/pricing/)

**Feedback**
- Contentsquare Voice of Customer: from $79/mo. — [Contentsquare pricing](https://contentsquare.com/pricing/?utm_source=hotjar-pricing)
- Canny Pro: from $79/mo yearly. — [Canny pricing](https://canny.io/pricing)
- Featurebase: $29 to $99/seat/mo. — [Featurebase pricing](https://www.featurebase.app/pricing)
- Userpilot: $299 to $849+/mo. — [Userpilot pricing](https://userpilot.com/pricing/)
- Formbricks: $74 to $325/mo. — [Formbricks pricing](https://formbricks.com/pricing)
- Sprig: quote-only. — [Sprig pricing](https://sprig.com/pricing)

**Bundle premiums inside form builders**
- Formstack Suite is about 3x Forms alone ($250 vs $83/mo). — [Formstack pricing](https://www.formstack.com/pricing)
- Typeform Growth Flow is about 2.9x Business ($266 vs $91/mo yearly). — [Typeform pricing](https://www.typeform.com/pricing/)
- involve.me puts e-sign in Scale, about 2x Grow. — [involve.me pricing](https://www.involve.me/pricing)
- Jotform meters signatures and payments per tier from $34/mo (Bronze, yearly). — [Jotform pricing](https://www.jotform.com/pricing/)

### Inferences
- Rough "stitched stack" for a 3-person team (my arithmetic from the cited list prices; illustrative only):

  | Need | Tool and plan | Monthly cost |
  |---|---|---|
  | Scheduling with routing | Calendly Teams, 3 × $16 | about $48 |
  | E-sign | Dropbox Sign Standard, 3 × $17.50 | about $53 |
  | Quizzes | ScoreApp Business | $75 |
  | Intake | Content Snare Plus | $71 |
  | Feedback board | Canny Pro | $79 |
  | **Total** | | **about $326/mo** |

  This is before the form builder itself.
- The pricing structure itself signals where value is captured. Per-seat billing (scheduling, e-sign, workflow) reflects internal-user value. Per-response, per-lead or per-tracked-user billing (quiz, feedback, Typeform enrichment) reflects audience-scale value. A bundled suite can undercut on seats while monetizing volume.
- Challengers are commoditizing booking and signature (Fillout free scheduling, Tally free signatures, Paperform bundled Papersign). Charging a premium for those alone is unlikely to work. The premium is more defensible on routing plus enrichment plus nurture (Typeform Growth), multi-step approvals and document generation (Formstack Suite), and intake chasers (Content Snare's whole price point).

### Gaps
- Official monthly-billing figures were not visible for Calendly (only the $10 and $16 headline numbers), Canny, or HoneyBook monthly.
- No confirmed list prices for DocuSign, PandaDoc, Heyflow, Pipefy, Process Street, Kissflow, Moxo or Sprig.
- Typeform's pricing page shows two inconsistent price sets. I quoted the plan-card figures.
