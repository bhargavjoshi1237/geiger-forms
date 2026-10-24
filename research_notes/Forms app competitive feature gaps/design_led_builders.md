# Design-led / Conversational Form Builders: Feature Inventory (Typeform, Tally, Fillout, Paperform, Heyflow; plus Youform and Feathery)

*All vendor pages were observed on 2026-10-21 unless a date is given. Prices are in USD unless marked EUR. "Unverified" means a search snippet or third-party claim that I could not confirm on the vendor's own page. Stage tags [1]–[11] follow the lifecycle framework: 1 Build, 2 Logic, 3 Design, 4 Distribute, 5 Collect, 6 Manage, 7 Analyze, 8 Integrate/automate, 9 Collaborate/admin, 10 Trust, 11 Pricing.*

## Q1. What does each product offer across the form lifecycle, and how deep does each capability go?

### Takeaway
Every product now covers the full lifecycle in some form. They differ in depth and in where they push past forms: Typeform into AI "flows" (enrichment, research interviews), Fillout into a database and app platform (Zite) with record lookup and update, Paperform into commerce, e-signature and automation (Stepper), Heyflow into paid-traffic conversion funnels, and Tally into a free, doc-style builder that is now AI- and MCP-native. Logic depth runs from Tally's show/hide plus a formula editor, through Typeform's jump logic plus variables and a Logic Map, to Fillout's record pre-fetch and update, workflow graph with loops, and approvals.

### Cited Findings

#### Typeform
- [1 Build] Every paid plan from Basic up includes unlimited typeforms and questions, AI form creation, conditional logic, webhooks and integrations. — [Typeform pricing](https://www.typeform.com/pricing)
- [1 Build] Typeform AI builds forms from prompts, "optimizes and translates them" and surfaces insights. It powers Growth Flow and Research Flow. — [Typeform blog, Jun 2026](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
- [1 Build] In March 2026 Typeform AI added "Extended Thinking" (more advanced LLMs, Growth and Enterprise only), the option to drop a URL into a prompt, and AI-generated sample responses for new forms. — [Typeform Community, 27 Mar 2026](https://community.typeform.com/typeform-updates-24/march-community-wrap-up-17901)
- [1 Build] Question types promoted in 2026 as "closing questions":
  - Signature: agreements, consent, waivers.
  - Scheduler: real availability, synced with Google Calendar and Calendly.
  - Video: respondents record answers, and the creator can record the question.
  - Payment: Stripe or PayPal, with dynamic pricing.
  - Form pages: several questions on one screen.
  — [Typeform blog, Jun 2026](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
- [1 Build] Spring 2025 brought a Knowledge Quiz, a Video Questions update and a Multi-Question Pages update. Summer 2025 brought Match Quizzes. — [Typeform What's New](https://www.typeform.com/whats-new)
- [2 Logic] Logic jumps can be triggered by a question's answer or by a hidden-field value. — [Typeform developer docs: logic jumps](https://developers.typeform.com/create/logic-jumps/)
- [2 Logic] Variables:
  - Variables (score, price and custom) change based on answers, and logic can route respondents to different Endings.
  - Recall inserts a variable into text, e.g. `{{var:score}}` / `{{var:price}}`.
  - Recall cannot be placed inside the text of multiple-choice or picture-choice options.
  — [Typeform help: scores](https://help.typeform.com/hc/en-us/articles/4411100563348-Show-scores-as-fractions-and-percentages); [Typeform dev docs: recall](https://www.typeform.com/developers/create/recall-information/); [score & price](https://typeform.com/developers/create/score-and-price)
- [2 Logic] The "Logic Map" is a visual aid in the Logic tab that shows every logic path. — [Typeform glossary](https://typeform.com/help/a/a-typeform-glossary-360061281111)
- [2 Logic] A staff reply from 2021 said logic jumps were forward-only and that backward jumps cause questions to go missing. This may be outdated. — summarized in search results from [Typeform Community](https://community.typeform.com/typeform-guides-19/logic-sos-help-my-typeform-skips-straight-to-the-end-1878)
- [3 Design] Branding and domains:
  - Plus removes Typeform branding and adds a custom subdomain.
  - "Custom domains and branding" is listed under Enterprise.
  — [Typeform pricing](https://www.typeform.com/pricing)
- [5 Collect] Upload, partial-submit, video and other limits by plan:
  - File upload: 1 GB on Basic, 2 GB on Plus, 4 GB on Business, Growth and Talent. The page does not say whether this is per file or in total.
  - "Partial submit points": 1 on Basic and Plus, 3 on Business, Growth and Talent.
  - reCAPTCHA and multi-language forms are listed on Talent. Multi-language is also listed on Growth Flow.
  - Video quotas: Talent includes 4,500 video question views and 1,500 video answers. Growth includes 50,000 views and 20,000 answers.
  — [Typeform pricing](https://www.typeform.com/pricing)
- [6 Manage] Email Builder shipped in Summer 2025, and Contacts & Automations in Winter 2026. — [Typeform What's New](https://www.typeform.com/whats-new)
- [6 Manage] Email and SMS follow-ups are part of Growth Flow. — [Typeform pricing](https://www.typeform.com/pricing)
- [6 Manage] Results Summary got sorting in March 2026. — [Typeform Community](https://community.typeform.com/typeform-updates-24/march-community-wrap-up-17901)
- [7 Analyze] Drop-off rates and conversion tracking start at Business. Smart Insights is on Growth Flow. — [Typeform pricing](https://www.typeform.com/pricing)
- [7 Analyze] Sentiment Analysis on open-ended answers shipped in Winter 2025. — [Typeform What's New](https://www.typeform.com/whats-new)
- [7 Analyze] Growth Flow adds contacts analysis and time-series analysis. — [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
- [8 Integrate] Typeform advertises "300+ integrations." — [Typeform health template page](https://www.typeform.com/templates/health-questionnaire-template)
- [8 Integrate] About 45 integrations work on the EU Data Center. — [Typeform help: EU integrations](https://help.typeform.com/hc/en-us/articles/52254048333588-Integrations-available-on-the-EU-Data-Center)
- [8 Integrate] Automation features:
  - Workflow Builder shipped in Spring 2025.
  - Growth Flow runs multi-step automations inside Typeform with no Zaps, e.g. Slack and Klaviyo.
  - AI maps form fields to CRM properties.
  - Enrichment match rates: 92% for B2B and 71% for B2C (vendor-reported).
  — [Typeform What's New](https://www.typeform.com/whats-new); [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
- [8 Integrate] Integrations added in 2025–26:
  - Shopify (Spring 2025) and Eureka Surveys (Winter 2025).
  - Attio and HighLevel (March 2026).
  - Salesforce is listed on Growth Flow.
  — [What's New](https://www.typeform.com/whats-new); [Community](https://community.typeform.com/typeform-updates-24/march-community-wrap-up-17901); [pricing](https://www.typeform.com/pricing)
- [9 Admin] Seats: Basic 1, Plus 3, Business 5, Talent 3, Growth 5, Enterprise 6+. SSO is Enterprise-only. — [Typeform pricing](https://www.typeform.com/pricing)
- [10 Trust] Typeform's own template page says it supports HIPAA, but a BAA must be set up through the Enterprise sales process. — [Typeform health template](https://www.typeform.com/templates/health-questionnaire-template); contradicted by [RaftLabs](https://www.raftlabs.com/blog/build-app-like-typeform), which claims Typeform signs no BAA.
- [10 Trust] EU data hosting is available on Enterprise or "Growth Custom" plans. — [Typeform help](https://help.typeform.com/hc/en-us/articles/52254048333588-Integrations-available-on-the-EU-Data-Center)
- [10 Trust] An older community FAQ says the main servers are in Virginia with no choice of location. This is likely superseded. — [Typeform Community](https://community.typeform.com/typeform-guides-19/compliance-security-101-gdpr-data-protection-and-hipaa-4147)

#### Tally
- [1 Build] The editor is document-style: you type questions and insert blocks, "similar to Notion." — [tally.so](https://tally.so/)
- [1 Build] Named blocks: phone, file upload, payments, e-signature, reCAPTCHA, hidden fields, calculated fields, ranking, ratings, scales, and date and time. — [Tally help](https://tally.so/help); [tally.so](https://tally.so/)
- [1 Build] Editor additions, 2025–26:
  - "Turn into" converts a block to another type (Feb 2025).
  - Foldable pages (Apr 2026).
  - Table of contents for long forms (Apr 2026).
  — [Tally changelog](https://tally.so/changelog)
- [1 Build] AI and import:
  - The Tally AI assistant builds, edits and troubleshoots forms from prompts. It became free on all plans on 8 Jul 2026.
  - One-click Typeform import (Jul 2026).
  - Import from PDF, image, JSON, CSV and Markdown (Aug 2026).
  — [Tally changelog](https://tally.so/changelog); [Tally AI info](https://tally.so/ai-info)
- [1 Build] Version history lets you restore the last 7 days (Jun 2025). The pricing page lists 30 days on Pro and 90 days on Business. — [changelog](https://tally.so/changelog); [pricing](https://tally.so/pricing)
- [2 Logic] Core logic: show/hide, branching, calculated values ("variables compute values, scores, and prices"), answer piping, pre-fill, and hidden fields from URL parameters (e.g. UTM). — [tally.so](https://tally.so/)
- [2 Logic] Logic updates, 2025–26:
  - "Is not any of" condition (Jun 2025).
  - Show or hide whole pages in one click (Mar 2026).
  - Auto-skip of empty logic pages (Feb 2026).
  - Redesigned conditional logic (Jul 2026).
  - Formula editor with field @mentions, text concatenation and live validation (Jun 2026).
  — [Tally changelog](https://tally.so/changelog)
- [2 Logic] The Free plan includes logic, calculations, duplicate-submission prevention, password protection, closing on a response limit or date, and piping. Business adds email verification for respondents. — [Tally pricing](https://tally.so/pricing)
- [3 Design] Design options:
  - Themes, custom CSS (Pro), column layouts, multi-page forms, and YouTube, Maps and Calendly embeds.
  - Advanced layout, input and button customization (Pro, Feb 2025).
  - Search across 900+ Google Fonts (Jun 2026).
  - Keyboard and screen-reader accessibility fixes in respond mode (Jul 2026).
  — [tally.so](https://tally.so/); [changelog](https://tally.so/changelog)
- [4 Distribute] Embeds, popups, links and custom domains (Pro). Custom link preview with OG image, favicon, title and description (Pro). Framer plugin (Oct 2025). — [tally.so](https://tally.so/); [pricing](https://tally.so/pricing); [changelog](https://tally.so/changelog)
- [5 Collect] Payments, signatures and file uploads are free. Files are capped at 10 MB each on Free and unlimited on Pro. Partial submissions are Pro. Forms support 45+ languages, including right-to-left. — [Tally pricing](https://tally.so/pricing)
- [6 Manage] Notifications and PDFs:
  - Self email notifications are free.
  - Tailored emails to respondents and custom sending domains are Pro.
  - One-click submission PDF (Apr 2026), PDF attached to notifications (May 2026), and PDF links passed to Zapier, Make, n8n, webhooks, Notion and Airtable (Jun 2026).
  - Business adds automatic deletion of submissions after a set period.
  — [pricing](https://tally.so/pricing); [changelog](https://tally.so/changelog)
- [7 Analyze] Analytics:
  - Form Insights for views, submissions and drop-off (Jun 2025).
  - Extended visit and drop-off analytics are Pro.
  - Answer Insights (May 2026) adds charts, averages, medians and automatic NPS and CSAT scores.
  - GA and Meta Pixel are Pro.
  — [changelog](https://tally.so/changelog); [pricing](https://tally.so/pricing)
- [8 Integrate] Native integrations: Google Sheets, Notion, Airtable, Slack, Coda, Discord, Linear, n8n, Attio, Zapier, Make, Pipedream and webhooks. — [tally.so](https://tally.so/); [Tally help](https://tally.so/help)
- [8 Integrate] Developer and AI connections:
  - API opened in public beta (Jun 2025).
  - MCP server in beta (Jul 2025).
  - Official ChatGPT plugin, verified Claude connector and Superhuman Go (27 Aug 2026).
  — [Tally changelog](https://tally.so/changelog)
- [9 Admin] Pro includes unlimited members, workspaces and folders. Nested folders go up to 10 levels (Pro, Jun 2026). — [pricing](https://tally.so/pricing); [changelog](https://tally.so/changelog)
- [9 Admin] Tally's own page lists "no mobile application and no live team collaboration" as limitations. — [Tally AI info](https://tally.so/ai-info)
- [10 Trust] Tally is GDPR-compliant and "hosted in Europe." The company is based in Belgium, encrypts data in transit and at rest, and uses no cookie tracking. — [tally.so](https://tally.so/); [Tally GDPR](https://tally.so/help/gdpr)
- [10 Trust] I found no HIPAA or SOC 2 statement from Tally. — [Tally AI info](https://tally.so/ai-info)

#### Fillout
- [1 Build] Drag-and-drop editor. — [fillout.com](https://www.fillout.com/)
- [1 Build] The help index cites "over 50" field types. Notable ones include:
  - Address, Currency, Date range, eSignature, File upload, HTML/CSS, Location coordinates.
  - Choice matrix, Ranking, Rating, Section collapse, Social links.
  - Submission picker, Subform, Table, Video, Voice recording, CAPTCHA.
  - Page types: Cover, Review, Payment, Login, Scheduling and Ending.
  — [Fillout help index](https://fillout.com/help/llms.txt)
- [1 Build] Importers exist for Typeform, Jotform, SurveyMonkey and Google Forms. — [Fillout help index](https://fillout.com/help/llms.txt)
- [1 Build] AI building:
  - "Fillout Agent" (Jul 2026) builds questions, logic, branching and follow-ups from a description, for new or existing forms.
  - An uploaded PDF can be turned into an online form (Jun 2026).
  — [Zite What's New](https://www.zite.com/help/whats-new)
- [1 Build] A third-party review says AI rebuilt a 20-question PDF intake form in about 90 s, with correct field types for 17 of the 20 questions. Unverified. — [jo.works via search](https://jo.works/journal/fillout-ai-features)
- [1 Build] Restore form versions (Apr 2025) and edit history (Feb 2025). Enterprise gets unlimited revision history. — [Zite What's New](https://www.zite.com/help/whats-new); [Fillout pricing](https://www.fillout.com/pricing)
- [2 Logic] Fillout has the deepest data-bound logic in the set:
  - Calculations and variables, answer piping, URL parameters, and passing data between forms.
  - "Pre-fetch dynamic data / records", record pickers and linked-record pickers.
  - "Update existing records" in Airtable, Notion, Salesforce, SmartSuite, Monday and Zite.
  - SSO-based and webhook-based prefill.
  - Condition groups, page branching and conditional integration logic.
  - Regex validation, dynamic dropdowns fed by a webhook, randomized options, and Apollo lead enrichment.
  — [Fillout help index](https://fillout.com/help/llms.txt)
- [2 Logic] Pre-fetch data and duplicate prevention are Business-only. Calculations and scoring, prefill and hidden fields, and piping are on all plans. — [Fillout pricing](https://www.fillout.com/pricing)
- [3 Design] By plan:
  - Starter: custom themes, logo, multiple endings.
  - Pro: custom fonts, custom CSS, favicon, all branding removed.
  - Business: custom code and HTML block.
  - Branding is a badge on Free, "light" on Starter, and none from Pro.
  — [Fillout pricing](https://www.fillout.com/pricing)
- [4 Distribute] Custom domain is Business-only. Sharing also works via QR or email. Embeds come as popup, slider, side tab or full-screen. White-label emails and custom share preview are Pro. — [Fillout pricing](https://www.fillout.com/pricing); [fillout.com](https://www.fillout.com/)
- [5 Collect] Payments and scheduling:
  - Stripe one-time, subscription and user-defined amounts.
  - Native scheduling with round robin, collective and group meetings, and reminders, plus Calendly and Cal.com.
  — [Fillout help index](https://fillout.com/help/llms.txt)
- [5 Collect] Access, limits and verification:
  - Save and resume on all plans.
  - Login forms (Starter+) with email verification, password, domain or list restrictions, a one-submission limit, and respondent self-editing.
  - Max submission count, open date and access expiration.
  - Email or SMS OTP via Twilio.
  — [Fillout help index](https://fillout.com/help/llms.txt); [pricing](https://www.fillout.com/pricing)
- [5 Collect] File upload is capped at 20 MB on Free through Pro and 1 GB+ on Business. — [Fillout pricing](https://www.fillout.com/pricing)
- [5 Collect] Automatic multi-language translations shipped in Jul 2025. — [Zite What's New](https://www.zite.com/help/whats-new)
- [6 Manage] Response handling:
  - Fillout Approvals and approval portals, with bulk approvals via workflows (Jul 2025).
  - PDF generation on all plans, with conditional PDF fields and dynamic file names (Feb 2025).
  - Comments, editing submissions, and respondent emails (Starter+).
  - Sending from your own Gmail, Outlook or SMTP (Apr 2026).
  — [help index](https://fillout.com/help/llms.txt); [Zite What's New](https://www.zite.com/help/whats-new); [pricing](https://www.fillout.com/pricing)
- [7 Analyze] Analytics and tracking:
  - Summary analytics (charts) on all plans.
  - Drop-off, conversion tracking, Meta Pixel and viewing partial submissions are Business-only.
  - GTM and Google Ads conversions are supported. Google Analytics was added in Jun 2026.
  - I found no A/B testing.
  — [pricing](https://www.fillout.com/pricing); [help index](https://fillout.com/help/llms.txt); [Zite What's New](https://www.zite.com/help/whats-new)
- [7 Analyze] The "Conversion Kit" is a paid add-on that is not included in any tier. It covers abandonment recovery, drop-off notifications, Clearbit enrichment, dynamic form shortening, autofill, Google Maps address autocomplete and email validation. — [Fillout pricing](https://www.fillout.com/pricing). The address help page instead says autocomplete is "currently available on the Enterprise plan" — [Fillout address docs](https://www.fillout.com/help/address). The two pages conflict.
- [8 Integrate] Integrations and APIs:
  - "50+ native integrations."
  - REST API on all plans and a TypeScript SDK (Mar 2025).
  - Zapier, Make and n8n (n8n native from Sep 2025).
  — [fillout.com](https://www.fillout.com/); [pricing](https://www.fillout.com/pricing); [Zite What's New](https://www.zite.com/help/whats-new)
- [8 Integrate] Workflows run on every plan:
  - Workflows 2.0 (Jan 2026) adds loops, branching, run logs, test runs and AI debugging.
  - Scheduled runs (Business+) and webhook triggers arrived in May 2026.
  - AI workflow actions can summarize, classify and extract.
  — [Zite What's New](https://www.zite.com/help/whats-new); [help index](https://fillout.com/help/llms.txt)
- [8 Integrate] Zite Database went GA in Jan 2026 and syncs forms to tables. From Aug 2026 each workspace has one shared database for apps and forms. — [Zite What's New](https://www.zite.com/help/whats-new)
- [9 Admin] Admin and access control:
  - Unlimited seats on every plan.
  - Workspaces, user groups and granular permissions.
  - SAML SSO and audit logs on Enterprise, plus enforced 2FA.
  - Team plan at $300/mo with unlimited seats, Salesforce and an optional EU region (Nov 2025).
  - An organization-wide switch to disable AI.
  — [pricing](https://www.fillout.com/pricing); [Zite What's New](https://www.zite.com/help/whats-new); [help index](https://fillout.com/help/llms.txt)
- [10 Trust] SOC 2 Type 2 and AES-256 encryption. — [fillout.com](https://www.fillout.com/)
- [10 Trust] Help topics cover GDPR, FERPA, deployment region including EU, and disabling internal storage. There is no HIPAA topic. — [help index](https://fillout.com/help/llms.txt)
- [10 Trust] Paubox (a competitor, 24 Sep 2026) says Fillout "does not sign a BAA." — [Paubox](https://www.paubox.com/blog/is-fillout-hipaa-compliant)

#### Paperform
- [1 Build] The editor "works like a document": you type questions and add images and video. Layouts include Guided Mode (one question at a time), full-page and multi-page. — [Paperform product](https://paperform.com/product)
- [1 Build] Field types include file upload, signature, rating, matrix, address, scheduling and payment. No total count is published. — [Paperform product](https://paperform.com/product)
- [1 Build] Templates passed 30,000 in Mar 2026. — [Paperform retro](https://paperform.com/blog/product-retro-2025-2026/)
- [1 Build] AI form creation from prompts is on all plans. AI creation from an uploaded PDF or image came in early 2026. Deleted forms and submissions can be restored (May 2026). — [Paperform pricing](https://paperform.com/pricing/); [retro](https://paperform.com/blog/product-retro-2025-2026/)
- [2 Logic] Logic depth:
  - Conditional logic applies to questions, pages, emails, success pages and integrations.
  - "Excel-style formulas" cover pricing, quotes, scores, dates, totals and tax.
  - AI writes formulas, which you check in a live preview.
  — [Paperform product](https://paperform.com/product)
- [2 Logic] The calculations field, scoring, hidden fields and the AI calculations assistant are Pro+. Conditional logic is free. — [Paperform pricing](https://paperform.com/pricing/)
- [3 Design] Fonts and colors. Custom HTML and CSS plus advanced themes are Pro+. — [pricing](https://paperform.com/pricing/); [product](https://paperform.com/product)
- [4 Distribute] A custom domain is a +$20/mo add-on on Pro. Business includes one. — [pricing](https://paperform.com/pricing/)
- [5 Collect] Payments:
  - Processors: Stripe, PayPal, Square "and more."
  - One-off payments, deposits, subscriptions, coupons, discounts and tax.
  - "No transaction fees," and unlimited payment submissions on every plan.
  - Products, subscriptions, coupons and pricing rules are Pro+.
  — [product](https://paperform.com/product); [pricing](https://paperform.com/pricing/)
- [5 Collect] Scheduling field with two-way Google Calendar sync and unlimited bookings on all plans. — [Paperform product](https://paperform.com/product)
- [5 Collect] Papersign signed documents per month: 3 on Free, 25 on Pro, 100 on Business, unlimited on Enterprise. — [Paperform pricing](https://paperform.com/pricing/)
- [5 Collect] Storage and partial submissions:
  - Upload storage: 100 MB on Free, 10 GB on Pro, 100 GB on Business.
  - Private file storage became the default in Jul–Aug 2025.
  - Partial submissions are Pro+.
  — [pricing](https://paperform.com/pricing/); [retro](https://paperform.com/blog/product-retro-2025-2026/)
- [6 Manage] Custom PDFs are Pro+. Exports come as CSV, PDF or .DOC. Custom email domains are Business+. — [pricing](https://paperform.com/pricing/); [product](https://paperform.com/product)
- [7 Analyze] Completion and drop-off reporting, GA and Facebook Pixel are Pro+. AI Insights (report summaries, themes and follow-up questions) is Pro+. — [product](https://paperform.com/product); [pricing](https://paperform.com/pricing/)
- [8 Integrate] Integration counts: "over 2,000 apps" per the product page, and "4,000+" counting Stepper, native, Zapier and Make. Webhooks and the standard API are Pro. The Business API is Business+. — [product](https://paperform.com/product); [pricing](https://paperform.com/pricing/)
- [8 Integrate] Stepper launched in Oct 2025 as a separate AI-native automation product (free plan; Pro $19/mo):
  - "Skill Sets" exposed as MCP tools, and an `stpr` CLI.
  - Import of existing workflows from Zapier, Make or n8n.
  - 400+ app integrations.
  — [Paperform retro](https://paperform.com/blog/product-retro-2025-2026/)
- [9 Admin] Admin:
  - Unlimited seats on every plan.
  - Workspaces: 1 on Free and Pro, 10 on Business, unlimited on Enterprise. They are shared across Paperform, Papersign and Stepper.
  - SAML SSO and required 2FA on Business+. Audit trails on Enterprise.
  - Agency+ (Sep 2025, from $190/mo) adds a multi-client dashboard and white-labelling.
  — [pricing](https://paperform.com/pricing/); [retro](https://paperform.com/blog/product-retro-2025-2026/)
- [10 Trust] SOC 2 Type II was renewed in Mar 2026, and GDPR compliance is held. Data is stored in the US by default, with EU or Australia hosting on Enterprise. Custom S3 storage is Business+. — [retro](https://paperform.com/blog/product-retro-2025-2026/); [pricing](https://paperform.com/pricing/)
- [10 Trust] Paperform states it is "not HIPAA compliant" and is targeting HIPAA for H1 2027. — [Paperform pricing](https://paperform.com/pricing/)

#### Heyflow
heyflow.com returned HTTP 403 to direct fetches. Official-page facts below come from search-result snippets of heyflow.com and are marked as such.

- [1 Build] No-code, drag-and-drop, mobile-first funnel and landing-page builder with "40+ pre-built blocks." — [ColdIQ review](http://coldiq.com/tools/heyflow); [Phi Consulting, Apr 2026](https://phi.consulting/tools/heyflow)
- [1 Build] AI credits by plan: 500 on Starter and 2,000 on Growth, with higher tiers "from 25,000 credits/month." Starter includes "MCP access." — [heyflow.com/pricing, search snippet](https://heyflow.com/pricing/)
- [1 Build] The MCP connection lets Claude, ChatGPT or Cursor build and edit funnels directly. — [heyflow.com/features/mcp, search snippet](https://heyflow.com/features/mcp/)
- [2 Logic] "Advanced qualification logic" with branching is on Starter. Custom JS and HTML are on Scale. — [Phi Consulting](https://phi.consulting/tools/heyflow); [ColdIQ](http://coldiq.com/tools/heyflow)
- [3 Design] Custom CSS is sold as a "Design bundle" at €40–60/mo. — [Launch10, Apr 2026](https://launch10.com/blog/heyflow-pricing)
- [3 Design] Branding removal is listed from Growth up. — [Phi Consulting](https://phi.consulting/tools/heyflow). Launch10 lists white-label only on Scale, which conflicts.
- [5 Collect] Payments and phone validation are Growth+. — [Phi Consulting](https://phi.consulting/tools/heyflow)
- [6 Manage] A native CRM is included on Starter. Qualified leads flow automatically into connected CRMs and email tools. — [Phi Consulting](https://phi.consulting/tools/heyflow)
- [7 Analyze] Built-in A/B testing is listed as a Scale feature. — [Phi Consulting](https://phi.consulting/tools/heyflow). Launch10 says A/B testing comes via a "Conversion bundle" (€40–60/mo) on any tier — [Launch10](https://launch10.com/blog/heyflow-pricing).
- [7 Analyze] Server-side Meta CAPI comes in the "Integrations bundle" at €40–90/mo. — [Launch10](https://launch10.com/blog/heyflow-pricing)
- [8 Integrate] "50+ native integrations" plus webhooks. — [ColdIQ](http://coldiq.com/tools/heyflow); [Phi Consulting](https://phi.consulting/tools/heyflow)
- [9 Admin] Starter has 1 seat (search snippet of [heyflow.com/pricing](https://heyflow.com/pricing/)). SSO and SAML are on Enterprise or the Security bundle. — [Launch10](https://launch10.com/blog/heyflow-pricing)
- [10 Trust] Heyflow's MCP page lists SOC 2, ISO 27001, HIPAA and EU hosting as standard. This is a vendor claim from a search snippet, not independently verified. — [heyflow.com/features/mcp](https://heyflow.com/features/mcp/)

#### Youform (challenger)
- [11] Plans:
  - Free: unlimited responses ("fair use"), 1 user, 10 MB files, logic, scores and calculations, signatures, and integrations (Sheets, Slack, Zapier, webhooks, Calendly, Cal.com, SavvyCal).
  - Pro ($29/mo, or $20/mo yearly): branding removal, custom domains and fonts, multi-language, Stripe payments, partial submissions and "refill links", drop-off analytics, Meta Pixel and GTM, 3 users.
  - Business ($89/mo, or $60/mo yearly): email OTP, SMS verification via your own Twilio, activity log, 5 seats (+$10 per seat).
  - No AI features are listed.
  — [Youform pricing](https://youform.com/pricing)

#### Feathery (challenger, now off-category)
- Feathery now positions itself as an "AI operating and decisioning platform for financial services" (insurance carriers, brokers, wealth management). Its "Robin" AI assistant builds forms, logic, integrations and document flows from plain language. — [feathery.io](https://www.feathery.io/)
- It claims SOC 2 Type II, HIPAA compliance, and 150+ industry integrations (Salesforce, Guidewire, Fidelity, Box, HubSpot). — [feathery.io](https://www.feathery.io/)
- Free: 500 submissions/mo, 5 live forms, 10 MB files, unlimited seats. Growth and Business are "Custom pricing." — [Feathery pricing](https://www.feathery.io/pricing)

### Inferences
- **Logic-depth ladder, shallow to deep:**
  1. Heyflow: qualification branching.
  2. Tally: show/hide, branching, page logic, and a formula editor with text concatenation.
  3. Typeform: jump logic with hidden-field triggers, multiple variables, Logic Map and recall.
  4. Paperform: Excel-style formulas with AI-written formulas, and logic on emails and integrations.
  5. Fillout: everything above plus external-record pre-fetch and update, subforms, submission pickers, approvals, and a workflow engine with loops and branching.
- **What makes Fillout's lead structural:** Its data model, not its form UI, is the advantage. The form edits records in Airtable, Notion, Salesforce and its own DB. That lead is hard to copy without a database layer, and Geiger's suite (shared Supabase and projects) could offer the same natively.
- **"Doc-style" is the shared editor paradigm of the challengers.** Tally and Paperform use it, while Typeform's identity remains one-question-at-a-time. Paperform offers both (Guided Mode).
- **Accessibility is under-documented across the set.** Only Tally shipped and documented a respond-mode screen-reader and keyboard pass (Jul 2026). This may be a cheap credibility differentiator if Geiger publishes WCAG conformance.

### Gaps
- **Field type counts:** Neither Typeform nor Paperform publishes an official count. Tally's full "All input blocks" list was not retrieved, so matrix and scale support in Tally is unconfirmed from the fetched pages.
- **Typeform details not confirmed this session:**
  - Embed modes. My prior knowledge is standard, full-page, popup, slider, popover and side tab, but this is unverified.
  - Custom CSS.
  - Version history.
  - Calculation operators beyond score and price variables.
  - Whether backward logic jumps are now supported.
  - Whether the 1/2/4 GB upload figure is per file or total.
- **Heyflow:** All primary pages blocked direct fetch. Its feature gating and compliance claims (SOC 2, ISO 27001, HIPAA) rest on snippets and third-party reviews.
- **Fillout:** The Conversion Kit price was not found, and the pricing page and help docs conflict on whether address autocomplete is an add-on or Enterprise-only.
- **WCAG conformance:** I found no explicit WCAG statement for any of the five.
- **QR codes, email embeds and social previews:** Confirmed only for Fillout (QR, email) and Tally and Fillout (social preview).

## Q2. What is each product's standout differentiator, and what do users praise or criticize most?

### Takeaway
Typeform sells experience and now AI-powered growth and research. Tally sells a near-complete free tier with a Notion-like editor. Fillout sells data-connected forms, workflows and approvals at a low price. Paperform sells forms with commerce, e-signature and automation in one product. Heyflow sells conversion funnels for paid traffic. Across reviews, the main complaints are price and free-tier limits (Typeform, Fillout, Heyflow) and missing advanced or collaboration features (Tally).

### Cited Findings
- **Typeform, differentiator:** It is repositioning "from forms to flows." Growth Flow adds enrichment, AI CRM mapping and built-in automations. Research Flow (launched 9 Jun 2026) is an AI research agent that recruits from verified panels or your own lists and runs AI-moderated text, voice and video interviews at scale. It also handles transcription, themes, sentiment, highlight reels, screening, quotas and incentives. — [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow); [CustomerThink press release](https://customerthink.com/?p=1081125); [Typeform Research Flow](https://www.typeform.com/research-flow)
- **Typeform, vendor research claim:** Typeform's internal study found Research Flow participants wrote 4.5x more words per question, were 3x more likely to share context or emotion, and reported 80%+ "completely engaged" versus 48% for a survey. — [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
- **Typeform, sentiment:**
  - G2 shows about 960 reviews at roughly 4.5/5. Reviewers praise the drag-and-drop UX and branded, attractive forms. Some find the feature set overwhelming. — [G2 Tally vs Typeform](https://www.g2.com/compare/tally-forms-tally-vs-typeform)
  - A July 2026 independent blog says design is still praised, but "reporting quality and work-loss complaints raise red flags." This is a low-authority source. — [mean.ceo blog](https://blog.mean.ceo/?p=9114)
  - Comparison blogs consistently call the free tier Typeform's weakest point. — [Zigpoll comparison](https://www.zigpoll.com/content/fillout-vs-typeform-vs-tally-2026) (affiliate-style)
- **Tally, differentiator:** Unlimited forms and submissions free, with payments, signatures, logic and calculations included. The editor is doc-style. Tally AI is free for everyone, and it connects to ChatGPT, Claude and MCP. — [Tally pricing](https://tally.so/pricing); [changelog](https://tally.so/changelog)
- **Tally, sentiment:**
  - G2 shows 4.8–4.9/5, with praise for ease of use, setup and support.
  - Complaints include no visual logic-flow view, document-upload limits, no built-in CRM or email automation, and a learning curve.
  — [G2 Fillout vs Tally](https://www.g2.com/compare/fillout-vs-tally-forms-tally); [G2 Tally vs Typeform](https://www.g2.com/compare/tally-forms-tally-vs-typeform)
- **Tally, self-reported scale:** Tally claims "more than 2 million teams," a 4.9/5 G2 rating from 142 reviews, and states its own gaps as "no mobile application and no live team collaboration." — [Tally AI info](https://tally.so/ai-info). The homepage says "500,000+ teams" instead — [tally.so](https://tally.so/). The two pages conflict.
- **Fillout, differentiator:**
  - Two-way data binding with Airtable, Notion, Salesforce and others: pre-fetch, update records and record pickers.
  - Approvals, native scheduling, PDF generation and workflows on cheap tiers.
  - Unlimited seats on every plan.
  — [Fillout help index](https://fillout.com/help/llms.txt); [pricing](https://www.fillout.com/pricing)
- **Fillout, sentiment:**
  - A G2 snapshot shows about 30 reviews at 4.6/5, with praise for flexibility, customization and Airtable/Notion integrations. The main complaint is cost, plus some missing features. — [G2 Fillout vs Tally](https://www.g2.com/compare/fillout-vs-tally-forms-tally)
  - Fillout's own site claims an average of 4.8/5 across G2 and Product Hunt and 100,000+ organizations. — [fillout.com](https://www.fillout.com/)
- **Paperform, differentiator:**
  - A single product for forms, payments with no transaction fees (Stripe, PayPal, Square), scheduling, Papersign e-signature, and Stepper automation.
  - Unlimited seats on every plan.
  - Excel-style formulas with AI formula writing.
  — [Paperform product](https://paperform.com/product); [pricing](https://paperform.com/pricing/)
- **Paperform, sentiment:** It claims "500K+ businesses" and won a 2026 G2 Best Software Award. — [product](https://paperform.com/product); [retro](https://paperform.com/blog/product-retro-2025-2026/)
- **Heyflow, differentiator:**
  - Lead-generation funnels for paid traffic, with mobile-first output, A/B testing, phone validation, server-side Meta CAPI and a native CRM.
  - A vendor-reported "24% conversion lift."
  — [Phi Consulting](https://phi.consulting/tools/heyflow); [Launch10](https://launch10.com/blog/heyflow-pricing)
- **Heyflow, sentiment:** Ratings are 4.4/5 on G2 and OMR and 4.7/5 on Capterra. The cons cited are pricing tied to responses, costly add-on bundles, and that it is "not built for complex enterprise marketing automation." — [ColdIQ](http://coldiq.com/tools/heyflow)
- **Feathery, differentiator:** It has left the general form-builder market for financial-services AI workflows, built around the Robin assistant. — [feathery.io](https://www.feathery.io/)
- **Youform, differentiator:** It is a Typeform-style builder with unlimited free responses, positioned as the cheap alternative (lowest paid tier $20/mo yearly). — [Youform pricing](https://youform.com/pricing)

### Inferences
- **The market splits along two axes:** experience (Typeform, Heyflow, Youform) versus data and ops (Fillout, Paperform), and free/PLG (Tally, Youform, Fillout's 1,000-response tier) versus paid-only (Heyflow) or nearly so (Typeform at 10 responses, Paperform at 30).
- **Typeform is moving up-market into AI products** (Research Flow, enrichment, Growth Flow at $379/mo). That leaves room at the low end for design-quality conversational forms, which Tally, Youform and Fillout are taking. Tally even ships one-click Typeform import, and Fillout and Zite added a Typeform integration in Oct 2026.
- **A suite-integrated product like Geiger can answer Tally's self-admitted gaps** (live team collaboration, no CRM or email automation) and Fillout's main draw (data binding) by using shared suite entities.

### Gaps
- I did not retrieve per-product G2 or Capterra review pages for Paperform or Youform, so their praise and criticism themes are not captured.
- G2 numbers are snapshots from comparison pages and AI summaries, and they differ between pages.
- I found no independent review of Research Flow's real-world quality.

## Q3. Which features are table stakes across the five, and which still differentiate?

### Takeaway
Conditional logic, calculations or scoring, hidden fields and URL parameters, answer piping, Stripe payments, file upload, e-signature, Google Sheets/Zapier/Make/webhook integrations, embeds, and some AI form generation are now table stakes. So are paid custom domains, branding removal, partial submissions and pixel tracking. Differentiators in late 2026 are record lookup and update against external data, built-in workflow engines and approvals, native scheduling, AI analysis and research agents, enrichment, A/B testing, MCP and LLM-connector access, and compliance (HIPAA, EU residency).

### Cited Findings
- **Logic, calculations and piping are on every product:**
  - Tally: free. — [Tally pricing](https://tally.so/pricing)
  - Fillout: all plans. — [Fillout pricing](https://www.fillout.com/pricing)
  - Typeform: variables and recall. — [Typeform help](https://help.typeform.com/hc/en-us/articles/4411100563348-Show-scores-as-fractions-and-percentages)
  - Paperform: logic free, calculations Pro+. — [Paperform pricing](https://paperform.com/pricing/)
  - Heyflow: logic on Starter. — [Phi Consulting](https://phi.consulting/tools/heyflow)
  - Youform: free. — [Youform pricing](https://youform.com/pricing)
- **E-signature is near-universal:**
  - Tally: free. — [Tally pricing](https://tally.so/pricing)
  - Fillout: Starter+. — [Fillout pricing](https://www.fillout.com/pricing)
  - Paperform: Papersign. — [Paperform pricing](https://paperform.com/pricing/)
  - Typeform: Signature question added in 2026. — [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
  - Youform: free. — [Youform pricing](https://youform.com/pricing)
- **Payments are near-universal:**
  - Tally: free. — [Tally pricing](https://tally.so/pricing)
  - Fillout: all plans; Stripe subscriptions. — [Fillout help index](https://fillout.com/help/llms.txt)
  - Paperform: all plans; subscriptions Pro+. — [Paperform pricing](https://paperform.com/pricing/)
  - Typeform: Stripe or PayPal. — [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
  - Heyflow: Growth+. — [Phi Consulting](https://phi.consulting/tools/heyflow)
  - Youform: Pro. — [Youform pricing](https://youform.com/pricing)
- **Partial submissions are always paid:**
  - Tally: Pro. — [Tally pricing](https://tally.so/pricing)
  - Fillout: viewing partials is Business-only, although "resume in-progress forms" is on all plans. — [Fillout pricing](https://www.fillout.com/pricing)
  - Paperform: Pro. — [Paperform pricing](https://paperform.com/pricing/)
  - Typeform: 1–3 "partial submit points" by plan. — [Typeform pricing](https://www.typeform.com/pricing)
  - Youform: Pro. — [Youform pricing](https://youform.com/pricing)
- **Drop-off analytics are always paid:** Tally Pro; Fillout Business; Typeform Business; Paperform Pro; Youform Pro. — [Tally](https://tally.so/pricing); [Fillout](https://www.fillout.com/pricing); [Typeform](https://www.typeform.com/pricing); [Paperform](https://paperform.com/pricing/); [Youform](https://youform.com/pricing)
- **AI form generation is everywhere:**
  - Typeform: Basic+. — [Typeform pricing](https://www.typeform.com/pricing)
  - Tally: free for all. — [Tally changelog](https://tally.so/changelog)
  - Fillout: Agent. — [Zite What's New](https://www.zite.com/help/whats-new)
  - Paperform: free. — [Paperform pricing](https://paperform.com/pricing/)
  - Heyflow: AI credits. — [heyflow.com/pricing snippet](https://heyflow.com/pricing/)
- **AI import from PDF or image:** Paperform (early 2026), Tally (Aug 2026), Fillout (Jun 2026). — [Paperform retro](https://paperform.com/blog/product-retro-2025-2026/); [Tally changelog](https://tally.so/changelog); [Zite What's New](https://www.zite.com/help/whats-new)
- **MCP or LLM-connector access is spreading:**
  - Tally: MCP (Jul 2025), ChatGPT and Claude connectors (Aug 2026). — [Tally changelog](https://tally.so/changelog)
  - Heyflow: MCP. — [heyflow.com/features/mcp snippet](https://heyflow.com/features/mcp/)
  - Paperform: Stepper exposes Skill Sets as MCP tools. — [Paperform retro](https://paperform.com/blog/product-retro-2025-2026/)
  - Zite/Fillout: ChatGPT queries and updates to Zite databases (Jun 2026), and Zite apps in ChatGPT (Oct 2026). — [Zite What's New](https://www.zite.com/help/whats-new)
- **Still differentiating, record lookup and update:** Fillout only, with pre-fetch, record pickers and updating existing records in Airtable, Notion, Salesforce, SmartSuite, Monday and Zite. — [Fillout help index](https://fillout.com/help/llms.txt)
- **Still differentiating, approvals:** Fillout only (Approvals, form portal approval workflows). — [Fillout help index](https://fillout.com/help/llms.txt)
- **Still differentiating, native scheduling:**
  - Fillout: round robin and collective meetings. — [Fillout help index](https://fillout.com/help/llms.txt)
  - Paperform: two-way Google Calendar sync. — [Paperform product](https://paperform.com/product)
  - Typeform: Scheduler synced with Google Calendar and Calendly. — [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
  - Tally relies on Calendly embeds and date/time fields. — [tally.so](https://tally.so/)
- **Still differentiating, built-in workflow engine:**
  - Fillout: Workflows 2.0 with loops and branching. — [Zite What's New](https://www.zite.com/help/whats-new)
  - Paperform: Stepper. — [Paperform retro](https://paperform.com/blog/product-retro-2025-2026/)
  - Typeform: Workflow Builder and Growth Flow automations. — [Typeform What's New](https://www.typeform.com/whats-new); [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
  - Tally has none. G2 summaries cite "no built-in CRM or email automation." — [G2 Fillout vs Tally](https://www.g2.com/compare/fillout-vs-tally-forms-tally)
- **Still differentiating, A/B testing:** Only Heyflow, via Scale or the Conversion bundle. None was found for Tally, Fillout or Paperform. Typeform's pricing page does not mention it. — [Phi Consulting](https://phi.consulting/tools/heyflow); [Launch10](https://launch10.com/blog/heyflow-pricing); [Fillout help index](https://fillout.com/help/llms.txt); [Typeform pricing](https://www.typeform.com/pricing)
- **Still differentiating, enrichment:**
  - Typeform: AI Data Enrichment, 1,500/mo on Growth Flow. — [Typeform pricing](https://www.typeform.com/pricing)
  - Fillout: Clearbit and Apollo via the Conversion Kit. — [Fillout pricing](https://www.fillout.com/pricing); [help index](https://fillout.com/help/llms.txt)
- **Still differentiating, AI response analysis:**
  - Typeform: Sentiment Analysis, Smart Insights, Research Flow. — [Typeform What's New](https://www.typeform.com/whats-new); [Typeform pricing](https://www.typeform.com/pricing)
  - Paperform: AI Insights (Pro+). — [Paperform pricing](https://paperform.com/pricing/)
  - Tally: Answer Insights plus analysis through MCP. — [Tally changelog](https://tally.so/changelog)
  - Fillout: AI workflow actions to summarize, classify and extract. — [Fillout help index](https://fillout.com/help/llms.txt)
- **Still differentiating, HIPAA:**
  - Typeform: Enterprise with a BAA (disputed). — [Typeform health template](https://www.typeform.com/templates/health-questionnaire-template)
  - Heyflow: claimed. — [heyflow.com/features/mcp snippet](https://heyflow.com/features/mcp/)
  - Feathery: claimed. — [feathery.io](https://www.feathery.io/)
  - Fillout: not offered. — [Paubox](https://www.paubox.com/blog/is-fillout-hipaa-compliant)
  - Paperform: not offered; planned for H1 2027. — [Paperform pricing](https://paperform.com/pricing/)
  - Tally: no statement found. — [Tally AI info](https://tally.so/ai-info)
- **Still differentiating, SOC 2:**
  - Fillout: SOC 2 Type 2. — [fillout.com](https://www.fillout.com/)
  - Paperform: SOC 2 Type II. — [Paperform retro](https://paperform.com/blog/product-retro-2025-2026/)
  - Heyflow: claimed. — [heyflow.com/features/mcp snippet](https://heyflow.com/features/mcp/)
  - Tally: no SOC 2 statement. — [Tally AI info](https://tally.so/ai-info)
- **Still differentiating, EU data residency:**
  - Tally: all plans, as Europe-hosted by default. — [tally.so](https://tally.so/)
  - Fillout: optional region, EU on the Team plan. — [Zite What's New](https://www.zite.com/help/whats-new)
  - Typeform: Enterprise or Growth Custom. — [Typeform help](https://help.typeform.com/hc/en-us/articles/52254048333588-Integrations-available-on-the-EU-Data-Center)
  - Paperform: Enterprise. — [Paperform pricing](https://paperform.com/pricing/)
- **Still differentiating, multi-language forms:**
  - Fillout: automatic translations. — [Zite What's New](https://www.zite.com/help/whats-new)
  - Typeform: Growth and Talent only. — [Typeform pricing](https://www.typeform.com/pricing)
  - Youform: Pro. — [Youform pricing](https://youform.com/pricing)
  - Tally's "45+ languages" refers to interface and respondent-UI language. — [Tally pricing](https://tally.so/pricing)

### Inferences
Synthesized from the cited findings above. ✓ = included, $ = paid tier or add-on, – = not found, ? = unclear.

| Capability | Typeform | Tally | Fillout | Paperform | Heyflow |
|---|---|---|---|---|---|
| Logic + calculations | ✓ | ✓ free | ✓ free | logic free / calc $ | ✓ |
| Hidden fields / URL params | ✓ | ✓ free | ✓ free | $ Pro | ? |
| Payments | ✓ | ✓ free | ✓ free | ✓ free (subs $) | $ Growth |
| E-signature | ✓ (2026) | ✓ free | $ Starter | ✓ quota | ? |
| Native scheduling | ✓ (2026) | – (Calendly embed) | ✓ (round robin) | ✓ | – |
| Partial submissions | $ | $ | $ Business (view) | $ | ? |
| External record lookup/update | – | – | ✓ (Business for pre-fetch) | – | – |
| Approvals | – | – | ✓ | – | – |
| Built-in workflows | ✓ (Growth Flow) | – | ✓ | ✓ (Stepper) | CRM routing |
| A/B testing | – | – | – | – | $ |
| AI build | ✓ | ✓ free | ✓ Agent | ✓ free | ✓ credits |
| AI analysis | ✓ (Smart Insights, sentiment, Research Flow) | Insights + MCP | AI workflow actions | $ AI Insights | ? |
| MCP / LLM connectors | – found | ✓ | ✓ (Zite/ChatGPT) | ✓ (Stepper) | ✓ |
| HIPAA | Enterprise (disputed) | – | – | – (2027) | claimed |
| SOC 2 | ? | – | ✓ | ✓ | claimed |
| EU residency | Enterprise | default | ✓ region | Enterprise | claimed |

- **Minimum table stakes for Geiger Forms:** logic, calculations, hidden fields, piping, Stripe payments, signatures, file upload, embeds, custom domain, branding removal, partial submissions, drop-off analytics, GA/Meta Pixel, Sheets/Zapier/webhooks, and AI generation including import from PDF or image. A product launching in late 2026 without these will read as incomplete.
- **Gaps Geiger could exploit:** No competitor offers both A/B testing and deep data binding. Approvals and record update exist only in Fillout. Live multi-user collaboration is a gap Tally admits.

### Gaps
- Typeform's SOC 2 status was not confirmed on a primary page.
- Heyflow's HIPAA, SOC 2 and ISO 27001 status is vendor-claimed via a snippet only.
- Whether Typeform offers A/B testing natively is unknown. It is absent from the pricing page but was not ruled out.
- Heyflow's support for hidden fields, signatures and partial submissions could not be confirmed.

## Q4. What did each product ship in 2025–2026, especially AI agents, AI analysis, new field types and workflows?

### Takeaway
2025–26 releases followed the same three themes everywhere: (1) AI building, now agentic, including import from documents; (2) exposure to external AI through MCP, ChatGPT apps and Claude connectors; and (3) moving past forms into workflows, databases, research or e-signature. Typeform made the biggest strategic move (Research Flow, Growth Flow). Fillout made the biggest platform move (Zite DB, Workflows 2.0, Agent). Tally made the biggest pricing move (AI free, Typeform import).

### Cited Findings
- **Typeform 2025:**
  - Sentiment Analysis and the Eureka Surveys integration (Winter).
  - Workflow Builder, Knowledge Quiz, Shopify integration, and Video Question and Multi-Question Page updates (Spring).
  - Email Builder, Match Quizzes and FAQ with AI (Summer).
  - Growth automation features (Fall).
  — [Typeform What's New](https://www.typeform.com/whats-new)
- **Typeform 2026:**
  - Typeform AI form builder, AI Data Enrichment, and Contacts & Automations (Winter). — [Typeform What's New](https://www.typeform.com/whats-new)
  - Extended Thinking, URL-in-prompt, AI sample responses, Results sorting, and Attio and HighLevel integrations (Mar). — [Typeform Community](https://community.typeform.com/typeform-updates-24/march-community-wrap-up-17901)
  - Signature, Scheduler, Video, Payment and Form-pages questions (by Jun). — [Typeform blog](https://www.typeform.com/blog/typeform-can-do-what-meet-growth-flow-and-research-flow)
  - Research Flow (9 Jun). — [CustomerThink](https://customerthink.com/?p=1081125)
  - Talent plan with "Clarify with AI", and Growth Flow with Smart Insights. Both appear on the current pricing page; launch dates were not found. — [Typeform pricing](https://www.typeform.com/pricing)
  - Typeforum Spring 2026 sessions covered SMS Automations and "FAQ with AI," which answers respondents' questions from your knowledge base. Search snippet only. — [Typeforum Spring 2026](https://webflow-prod.typeform.com/events-webinars/typeforum-spring-2026)
- **Tally 2025:**
  - Custom link previews (Jan).
  - Advanced customization (Feb).
  - "Turn into" (Feb).
  - Custom-domain email notifications (Feb).
  - Custom domains from the Share tab (Apr).
  - Public API beta (Jun).
  - Version history (Jun).
  - Form Insights and drop-off (Jun).
  - MCP server beta (Jul).
  - Framer plugin (Oct).
  - Discord (Oct).
  - Linear and n8n (Nov).
  - Sheets writing to an existing sheet (Dec).
  — [Tally changelog](https://tally.so/changelog)
- **Tally 2026:**
  - Mobile dropdowns and auto-skip of empty logic pages (Feb).
  - Page-level logic (Mar).
  - MCP submission analysis and table of contents (Apr).
  - Submission PDF export (Apr).
  - Answer Insights with NPS and CSAT (May).
  - PDF attached to notifications (May).
  - Formula editor (Jun).
  - 900+ fonts (Jun).
  - Nested folders and Attio (Jun).
  - Tally AI free for all and Typeform import (8 Jul).
  - Logic redesign and accessibility fixes (14 Jul).
  - Import from PDF, image, JSON, CSV and Markdown, plus failed-integration alerts (Aug).
  - ChatGPT plugin, Claude connector and Superhuman Go (27 Aug).
  - Search and dashboard redesign (Sep).
  — [Tally changelog](https://tally.so/changelog)
- **Fillout / Zite 2025:**
  - Table field, conditional PDF fields, edit history, magic-link sharing (Feb).
  - TypeScript SDK, ClickUp, submission region (Mar).
  - Outlook scheduling, multi-calendar sync, form-version restore, Zite introduced (Apr).
  - Auto-translations, bulk approvals, SurveyMonkey importer (Jul).
  - Native n8n (Sep).
  - Team plan at $300/mo, Zite Database, EU region option (Nov).
  — [Zite What's New](https://www.zite.com/help/whats-new)
- **Fillout / Zite 2026:**
  - Database GA and Workflows 2.0 with loops, branching and AI debugging (Jan).
  - Email via Gmail, Outlook or SMTP, plus Twilio, HubSpot, Anthropic and Gemini integrations (Apr).
  - Workflow schedules and webhook triggers (May).
  - PDF-to-form, Stripe subscriptions, Google Analytics, and Zite in ChatGPT (Jun).
  - Fillout Agent (Jul).
  - Workspaces 2.0 with a shared DB per workspace (Aug).
  - Airtable migration and rollups (Sep).
  - Typeform integration and workflow history extended to 90 days (Oct).
  — [Zite What's New](https://www.zite.com/help/whats-new)
- **Paperform 2025–26:**
  - Private file storage (Jul–Aug 2025).
  - Agency+ (Sep 2025).
  - Stepper, with MCP Skill Sets, CLI and workflow import from Zapier, Make or n8n (Oct 2025).
  - Penetration test (Dec 2025).
  - AI form creation from PDF or image (early 2026).
  - Template directory redesign (Feb 2026).
  - Papersign.com and SOC 2 Type II renewal (Mar 2026).
  - Cmd+K global search (Apr 2026).
  - Restore deleted items (May 2026).
  - Announced but not shipped: Private Apps for Teams, an improved AI copilot, a unified Paperform/Papersign/Stepper subscription, and EU/US healthcare compliance.
  — [Paperform retro](https://paperform.com/blog/product-retro-2025-2026/)
- **Heyflow 2026:** MCP access, so Claude, ChatGPT or Cursor can build and edit funnels, and AI credits on all plans. Launch date not found. — [heyflow.com/features/mcp snippet](https://heyflow.com/features/mcp/); [heyflow.com/pricing snippet](https://heyflow.com/pricing/)
- **Feathery:** "Robin," an AI workflow assistant marketed as its "biggest product launch yet." Date not given. — [feathery.io](https://www.feathery.io/)

### Inferences
- **Agentic building is now baseline:** "Describe it and the AI builds logic and branching" (Fillout Agent, Typeform AI, Tally AI). The next frontier is **agentic operation**: AI that analyzes responses (Tally MCP analysis, Typeform Smart Insights, Paperform AI Insights) and acts on them (Typeform Growth Flow follow-ups, Fillout AI workflow actions).
- **Distribution through AI assistants is becoming a channel.** Tally, Heyflow, Paperform/Stepper and Zite all let ChatGPT or Claude operate the product, so Geiger Forms will likely be compared on MCP and connector support.
- **New field types cluster around closing a transaction inside the form:** signature, scheduler, payment, voice and video recording, table and subform. Plain input types are no longer where vendors compete.

### Gaps
- I found no dated changelog for Heyflow, Youform or Feathery for 2025–26.
- Typeform's Fall 2025 release is described only generically.
- Typeform's launch dates for Talent, Clarify with AI and SMS automations were not confirmed on primary pages.
- Tally changelog entries before Jan 2025 and a tail portion of the page were not read. They are not needed for the 2025–26 window.

## Q5. How generous are free tiers, what do paid tiers cost and gate, and how does this shape expectations?

### Takeaway
Tally's unlimited free tier, with payments, signatures, logic and calculations, sets the expectation. Youform matches it, and Fillout (1,000 responses/mo with nearly all features) comes close. Typeform (about 10 responses/mo), Paperform (30/mo) and Heyflow (no free plan) are far behind. Paid tiers consistently gate branding removal, custom domain, partial submissions, drop-off analytics, pixels and custom CSS, while SSO, audit logs, HIPAA and data residency are enterprise-only.

### Cited Findings
- **Tally (observed 2026-10-21):**
  - Free: unlimited forms and submissions under a fair-use policy.
  - Pro: $24/mo. Business: $74/mo. Yearly billing gives "two months free."
  - The page may display annual-equivalent prices; third-party blogs list Pro at $29/mo, so the monthly vs annual figure needs confirming.
  — [Tally pricing](https://tally.so/pricing); [Zigpoll](https://www.zigpoll.com/content/fillout-vs-typeform-vs-tally-2026)
- **Tally gating:**
  - Pro gates branding removal, custom domain, partial submissions, custom CSS, respondent emails, unlimited file size (10 MB on Free), drop-off analytics, GA and Meta Pixel, and 30-day version history.
  - Business adds data retention controls, respondent email verification and 90-day history.
  — [Tally pricing](https://tally.so/pricing)
- **Typeform (observed 2026-10-21):**
  - Plan cards: Basic $39/mo or $28/mo annual (100 responses, 1 seat). Plus $79 or $56 (1,000 responses, 3 seats). Business $129 or $91 (10,000 responses, 5 seats). Talent $169 or $119 (3,000 responses). Growth Flow $379 or $266 (10,000 responses). Enterprise custom.
  - The same page's compare table shows Basic $29/$25, Plus $59/$50, Business $99/$83, with max monthly responses of 750, 2,500 and 50,000. The page is internally inconsistent, possibly mid price change or an A/B test.
  — [Typeform pricing](https://www.typeform.com/pricing)
- **Typeform free plan:** The pricing page says only that it has "a limited number of responses per month." Third-party 2026 sources say 10 responses/mo, pooled across the account. At the cap, forms go private, and deleting responses does not restore the allowance. — [Typeform pricing](https://www.typeform.com/pricing); [JetAdmin, via search](https://www.jetadmin.io/blog/typeform-pricing/amp/); [Perspective, via search](https://www.perspective.co/article/typeform-free-vs-pro)
- **Typeform gating:**
  - Plus: branding removal and custom subdomain.
  - Business: drop-off and conversion tracking.
  - Growth Flow: enrichment, Smart Insights, multi-language, Salesforce, email and SMS follow-ups.
  - Talent: video Q&A, reCAPTCHA, multi-language, Clarify with AI.
  - Enterprise: SSO, HIPAA, US or EU data center, custom domains.
  — [Typeform pricing](https://www.typeform.com/pricing)
- **Fillout (observed 2026-10-21):**
  - Free: $0, 1,000 responses/mo, unlimited seats, 20 MB uploads, Fillout badge.
  - Starter: $15/mo, 2,000 responses.
  - Pro: $40/mo, 5,000 responses.
  - Business: $75/mo, unlimited responses, 1 GB+ uploads.
  - Enterprise: custom, "1,000,000+ records."
  - Displayed prices appear to be annual-equivalent. Starter also shows "$228," which possibly implies $19/mo billed monthly.
  — [Fillout pricing](https://www.fillout.com/pricing)
- **Fillout gating:**
  - Free includes logic, calculations, payments, scheduling, PDF generation, workflows, save and resume, API, prefill and hidden fields.
  - Starter adds CAPTCHA, login forms, respondent emails, signatures, custom themes and Calendly.
  - Pro adds full branding removal, custom CSS, fonts and white-label emails.
  - Business adds custom domain, drop-off and conversion tracking, Meta Pixel, partial-submission viewing, pre-fetch data and duplicate prevention.
  - Enterprise adds SSO, audit logs and unlimited workflow runs.
  — [Fillout pricing](https://www.fillout.com/pricing)
- **Paperform (observed 2026-10-21):**
  - Free: $0, 30 submissions/mo, 100 MB storage, 3 Papersign docs, 200 workflow steps, badge.
  - Pro: $59/mo or $49/mo annual.
  - Business: $149/mo or $124/mo annual.
  - Enterprise: custom.
  - Add-ons: custom domain +$20/mo; Google Address Search +$10/mo on Pro.
  - Agency+: from $190/mo.
  — [Paperform pricing](https://paperform.com/pricing/); [retro](https://paperform.com/blog/product-retro-2025-2026/)
- **Heyflow (no free plan; 14-day trial without a card):** Sources conflict:
  - Search snippet of the official page: Starter €19/mo (50 responses, 5 funnels, 1 seat, 500 AI credits) and Growth €89/mo (250 responses, 10 funnels). — [heyflow.com/pricing snippet](https://heyflow.com/pricing/)
  - Launch10 (Apr 2026): Starter €49, Growth €89, Scale €239–289 (1,000 responses, 20 funnels). Add-on bundles: Conversion, Design, Integrations, Security. Overages are about €0.15 per response and €8 per extra flow. — [Launch10](https://launch10.com/blog/heyflow-pricing)
  - ColdIQ and Phi: $22, $79, $229 and $1,100 Enterprise. — [ColdIQ](http://coldiq.com/tools/heyflow); [Phi Consulting](https://phi.consulting/tools/heyflow)
  - Capterra: €49, €89, €239. — [Capterra snippet](https://www.capterra.com/p/212782/heyflow/pricing/)
- **Youform:** Free with unlimited responses (fair use). Pro $29/mo ($20/mo yearly). Business $89/mo ($60/mo yearly). — [Youform pricing](https://youform.com/pricing)
- **Feathery:** Free with 500 submissions and 5 live forms. Paid tiers are custom. — [Feathery pricing](https://www.feathery.io/pricing)
- **Tally's free tier as the benchmark:** Comparison blogs call it "the main draw," and G2 reviewers call Tally affordable for complex logic. — [Zigpoll](https://www.zigpoll.com/content/fillout-vs-typeform-vs-tally-2026); [G2 Fillout vs Tally](https://www.g2.com/compare/fillout-vs-tally-forms-tally)

### Inferences
- **What "free" means by late 2026:** unlimited forms; unlimited or high-volume responses (Tally and Youform unlimited, Fillout 1,000); logic and calculations; payments; signatures; integrations; and now free AI building (Tally, Paperform).
- **Typeform's ~10-response free tier is an outlier.** It works as a trial, which is consistent with Typeform moving up-market.
- **Seat pricing differs:** Tally Pro, Fillout and Paperform include unlimited seats. Typeform (1–5 seats) and Youform (seat add-ons) charge per seat. For a suite-integrated Geiger Forms, per-seat charging would compare badly against Fillout, Tally and Paperform.
- **The paywall line is consistent across vendors:**
  - Monetized: brand removal, custom domain, partial submissions, drop-off analytics, tracking pixels and custom CSS. These are the features growth teams pay for.
  - Enterprise-only: SSO, audit logs, HIPAA and data residency.
  - Geiger could align with that line or undercut it, for example by including drop-off analytics free to differentiate.
- **Usage-metered AI:** Heyflow AI credits and Paperform automation credits signal that AI and automation runs are becoming the new usage meter, replacing response caps.

### Gaps
- Exact monthly vs annual figures for Tally and Fillout are ambiguous on their pricing pages.
- Typeform's pricing page contradicts itself.
- Heyflow's official pricing could not be fetched directly, and sources conflict on prices and currency (EUR vs USD).
- Typeform's free-tier figure (10 responses/mo) comes from third parties and is not stated on typeform.com.
- Fillout's Conversion Kit price and Fillout Enterprise price were not found.
