# Survey & Experience-Management (XM) Platforms: SurveyMonkey, Qualtrics, Alchemer, SurveySparrow, plus Typeform and Hotjar/Contentsquare feedback widgets

Research date: 2026-10-21. Every vendor page was fetched on that date unless noted. Third-party pricing aggregators often disagree with each other; those figures are marked **(third-party / unverified)**. Anything dated before 2026 is marked **(older)**. One caveat on SurveyMonkey: its pricing pages were geo-served in INR to this researcher, so USD figures for it come from third parties.

## 1. Question and survey design depth (question bank, advanced question types, randomization, quotas, piping, flow, multi-language, accessibility, AI generation, bias checks)

### Takeaway
At the top of the market, "design depth" means three things beyond typical form builders. The first is research-grade instruments: conjoint and MaxDiff with simulators (Qualtrics). The second is survey-science controls: block randomization, quotas, piping, custom variables, A/B tests and 57+ languages (SurveyMonkey's team tiers). The third is automated methodology review, such as Qualtrics ExpertReview, which scores data quality, accessibility and sensitive-data requests as you build. AI generation from a prompt is now universal and no longer differentiates.

### Cited Findings
- **SurveyMonkey design toolkit (Team Advantage tier, per its full feature-comparison page):**
  - unlimited questions (free is capped at 10 per survey)
  - skip logic and branching
  - randomization of answer choices, questions/pages and blocks
  - piping and custom variables
  - response quotas and A/B testing
  - multilingual surveys in 57 languages
  - "Build with AI"
  - Section 508 and WCAG2 accessibility listed
  - [SurveyMonkey feature comparison](https://www.surveymonkey.com/pricing/details/?t=0)
- On SurveyMonkey's main pricing page, "Block randomization", "Advanced logic" and "Multilingual surveys" appear at Team Premier and above, and Team Advantage gets "More logic features." This conflicts with the details page, whose excerpt lists block randomization and multilingual under the Team Advantage section, so gating is ambiguous. — [SurveyMonkey pricing](https://www.surveymonkey.com/pricing/); [SurveyMonkey feature comparison](https://www.surveymonkey.com/pricing/details/?t=0)
- SurveyMonkey shipped "Dynamic redirects" on Mar 23, 2026: branching logic sends respondents to tailored end-of-survey URLs (Individual Premier, Team Premier, Enterprise). It shipped "Logic visibility" on Jun 25, 2026: preview shows logic and flow in a side panel, and preview links become permanent (all plans). — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
- **SurveyMonkey AI building:**
  - "Simplified survey creation" generates drafts from an idea, a template or existing content (Mar 24, 2026, all plans).
  - Conversational AI survey editing (Jul 6, 2026; US data center, English) lets users adjust tone, reword, restyle and generate a link through chat.
  - Sources: [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
  - The Sep 1, 2026 "Today's SurveyMonkey" relaunch describes a conversational builder in which "SurveyMonkey AI then adjusts questions, applies logic, and refines the survey in real time." — [SurveyMonkey newsroom](https://www.surveymonkey.com/newsroom/surveymonkey-introduces-todays-surveymonkey/)
- **Qualtrics conjoint/MaxDiff:**
  - Project types: Conjoint, Conjoint Dynamic Images and MaxDiff, each in PX and EX versions. They output importance and preference scores, reports and a **simulator**.
  - They need a separate PX/EX solution purchase, or a CX license with Journey Optimizer, and are capped at "5 conjoint projects at a time."
  - An AI "Research Agent" can create conjoint/MaxDiff surveys (permission "Create Conjoint / Maxdiff Survey with AI").
  - Source: [Qualtrics Support: Conjoint & MaxDiff projects](https://www.qualtrics.com/support/conjoint-project/creating-managing-conjoint-projects-px/)
- **Qualtrics ExpertReview (automated methodology and bias check):**
  - It measures the data quality of survey elements, recommends improvements, and predicts the quality of the data the survey will collect. It runs automatically while you build. — [Qualtrics Support: ExpertReview / Quality iQ](https://qualtrics.com/support/survey-platform/survey-module/survey-checker/quality-iq-functionality/)
  - Its recommendations cover survey methodology, survey errors, accessibility compliance and sensitive-data requests. — [Qualtrics Community (2023, older)](https://community.qualtrics.com/getting-started-mondays-79/expert-review-getting-started-mondays-may-15th-2023-23148)
  - A companion Response Quality feature flags poor completion rates, bots, duplicates and sensitive-data requests. — [Memorial University IT (older, undated)](https://mun.ca/surveysolution/news-articles/now-available--qualtrics-expertreview-features.php)
- **Qualtrics adaptive and conversational surveys:**
  - "Conversational Feedback" (AI follow-up probes) raised survey completion from 75% to 83% on average, and "adaptive surveys yield three times more actionable insights." These are vendor claims, Oct 2025. — [Qualtrics news, Oct 7 2025](https://www.qualtrics.com/news/qualtrics-accelerates-ai-leadership-and-value-with-experience-agents/)
  - In EX surveys, AI follow-up questions give "up to 40% more valuable insights." Vendor claim, X4 2026 (March 2026). — [Qualtrics EX X4 2026](https://www.qualtrics.com/news/new-ex-capabilities-x4-2026/)
- **SurveySparrow design:**
  - conversational (chat-style) surveys and forms
  - skip and display logic, piping
  - video backgrounds
  - quizzes with auto-scoring
  - Stripe payments
  - multilingual surveys
  - NPS, offline and 360 survey types
  - Source: [SurveySparrow features](https://surveysparrow.com/features/)
  - The Enterprise tier adds auto-translation into 130+ languages and CSS customization. — [SurveySparrow pricing](https://surveysparrow.com/pricing/)
- **Alchemer Iris** (announced Sep 2, 2026) includes an "AI Survey Builder" that turns a description of research goals into a survey, plus purpose-built AI for "probing." — [MRWeb DRNO, Sep 2 2026](https://www.mrweb.com/drno/news40267.htm)
- A Tally help article says that in 2026 AI first-draft generation is "table stakes," and all seven tools it compared offer it. — [Tally help](https://tally.so/help/best-ai-form-builders)

### Inferences
- AI generation and conversational editing are now commodity features. The defensible design-science features are quotas, block randomization, piping/custom variables, A/B test splits, multi-language with translation management, and an automated "survey quality / bias / accessibility checker" in the ExpertReview style. The last one is a natural AI feature for a form builder.
- Conjoint and MaxDiff remain enterprise add-ons, even inside Qualtrics, which caps projects and needs a separate license. They are probably out of scope for a general form builder. A simple MaxDiff (best/worst) question type is the only realistic downmarket slice.
- AI follow-up probing inside a survey ("conversational feedback") is the new frontier for question design. Both Qualtrics and Alchemer now market it.

### Gaps
- I found no verified source for a "SurveyMonkey Genius"-style automated bias or completion-rate checker in 2026. SurveyMonkey's own bias pages are only guidance articles ([SurveyMonkey bias research](https://uk.surveymonkey.com/mp/bias-research)).
- I found no source on SurveyMonkey's question bank size in 2026.
- Alchemer feature gating (MaxDiff, conjoint, quotas per tier) could not be verified: alchemer.com/pricing/ returned 404 on 2026-10-21, and the BusinessWire/CMSWire Alchemer articles returned 403.
- SurveySparrow's features page does not list quotas, randomization, MaxDiff, conjoint, matrix or CES as distinct features. Whether it supports them is unverified.

## 2. Distribution (email, SMS, web link, website intercept, in-app, recurring/pulse, contacts, reminders, panels, anonymity)

### Takeaway
XM platforms treat distribution as a managed channel layer, not a share link. That layer includes:
- contact lists with embedded data
- scheduled reminders
- SMS, often triggered from CRM events
- website and popup intercepts
- recurring "programs"
- paid respondent panels, now including synthetic AI respondents (Qualtrics Edge Audiences)

### Cited Findings
- **SurveyMonkey collectors** (Team Advantage section of the comparison page):
  - SMS, offline/kiosk (both footnoted)
  - website embed/trigger and popup targeting
  - scheduled email reminders
  - Source: [SurveyMonkey feature comparison](https://www.surveymonkey.com/pricing/details/?t=0)
  - A third party says SMS surveys, offline mode and the Salesforce integration require **add-ons** (no prices given). — [Usercall, Sep 2026 (third-party)](https://usercall.co/post/surveymonkey-pricing)
- SurveyMonkey "Salesforce SMS invites" (Mar 26, 2026) send personalized SMS invites when Salesforce events occur and sync responses back to records (Enterprise + Salesforce add-on). — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
- **SurveyMonkey "Programs"** (continuous listening; Apr 16, 2026; Advantage/Premier/Enterprise) bundle surveys into ongoing feedback initiatives. A Jul 21, 2026 update added faster recurring-survey scheduling, KPI tiles and dashboard visuals. — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
- **SurveyMonkey GetFeedback** (Jul 22, 2026) collects website visitor feedback through buttons, forms and embedded experiences (7-day trial, English only). — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
- **SurveyMonkey HRIS audiences:** the Workday and BambooHR integration "builds audiences from real-time employee data" and adds department, location and tenure attributes to responses (announced Sep 1, 2026; timing unspecified). — [SurveyMonkey newsroom](https://www.surveymonkey.com/newsroom/surveymonkey-introduces-todays-surveymonkey/)
- **SurveyMonkey panels:**
  - "SurveyMonkey Audience responses sold separately" (not included in any plan). — [SurveyMonkey pricing](https://www.surveymonkey.com/pricing/)
  - One review site estimates Audience at "$1 per response" and rising with targeting. **(third-party / unverified; the site rated its own confidence "medium" and appears to rely on forum posts.)** — [Costbench SurveyMonkey hidden costs](https://www.costbench.com/software/survey-software/surveymonkey/hidden-costs/); official reference: [SurveyMonkey Help: Audience Pricing](https://help.surveymonkey.com/articles/en_US/kb/Audience-Pricing)
  - "LaunchPad" (Jun 10, 2026) offers automated market research for testing concepts, pricing, names, messaging and ad creative. It is sold **pay-per-study with no subscription**, to all users. — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
- **Qualtrics Edge Audiences:**
  - A "flexible synthetic research panel offering" that combines traditional and synthetic panels. Vendor claims: up to 50% lower fielding costs, and time to insight cut "from weeks to minutes." Customers named: Dollar Shave Club, Booking.com, Google Labs (Oct 2025). — [Qualtrics news, Oct 7 2025](https://www.qualtrics.com/news/qualtrics-accelerates-ai-leadership-and-value-with-experience-agents/)
  - Analysts at X4 2026 described synthetic panels as simulating consumer responses at roughly half the cost of traditional panels. — [CMSWire](https://www.cmswire.com/customer-experience/insight-is-cheap-qualtrics-is-selling-something-harder/); [CXM World](https://cxm.world/customer-experience/qualtrics-x4-experience-agents-synthetic-panels-and-ai-analytics-land-across-all-three-suites/)
- **Qualtrics omnichannel** (X4 2026, "available now") combines surveys, contact-centre data (Genesys, NICE and Salesforce connectors), digital channels, reviews and social (new Facebook/Instagram listening). — [Qualtrics CX X4 2026](https://www.qualtrics.com/news/new-cx-capabilities-x4-2026/)
- **SurveySparrow distribution:**
  - email, social, web link, embeds, QR codes, Slack
  - offline/kiosk
  - recurring surveys
  - transactional and relational NPS triggers
  - contact imports from Salesforce, HubSpot, Google Contacts, Intercom and CSV, plus audience lists
  - WhatsApp appears only as a menu item
  - Source: [SurveySparrow features](https://surveysparrow.com/features/)
  - The free tier allows 1k contacts and 200 emails; Business allows 200k contacts and 108k emails. — [SurveySparrow pricing](https://surveysparrow.com/pricing/)
- **Contentsquare (formerly Hotjar) surveys:**
  - NPS surveys at key journey points, feedback buttons, exit-intent surveys, and popovers triggered after events (e.g., subscription cancellation).
  - Each response links to the related session replay.
  - Source: [Contentsquare surveys](https://contentsquare.com/platform/capabilities/surveys/)
  - hotjar.com/nps-surveys/ now 301-redirects to Contentsquare (observed 2026-10-21). — [Hotjar NPS (redirect)](https://www.hotjar.com/nps-surveys/)

### Inferences
- The XM distribution layer has three parts: contact lists with attributes, a scheduler with reminders, and channel triggers (email, SMS, CRM event, website intercept). This is the biggest structural gap between a form builder and a survey platform. A minimal Geiger version would be contacts/audiences, scheduled sends with reminders, and recurring (pulse) schedules.
- Panels are moving from "buy N real respondents" to "pay-per-study automated research" (SurveyMonkey LaunchPad) and "synthetic respondents" (Qualtrics Edge). A general form builder is unlikely to build a panel, but could integrate a panel API later.
- Website intercept and in-app widgets (exit intent, event triggers) are a distinct product line: Hotjar/Contentsquare, SurveyMonkey GetFeedback. They overlap with forms only through embeddable popover forms.

### Gaps
- I found no verified 2026 per-response USD pricing for SurveyMonkey Audience or Qualtrics panels.
- Anonymity controls (anonymous responses, IP/geo suppression) were not covered by any page fetched, so specific settings are unverified. SurveySparrow lists "respondent location tracking" on Business ([SurveySparrow pricing](https://surveysparrow.com/pricing/)), which is the opposite control.
- No source on SurveySparrow SMS/WhatsApp pricing or tier gating.

## 3. Analysis (dashboards, crosstabs, filters/compare, significance testing, text analytics/sentiment, AI summaries, benchmarks, shared reports, scheduled emails, exports)

### Takeaway
The analysis stack is the deepest moat. Its parts:
- crosstabs with significance testing
- filter and compare rules
- thematic and sentiment text analysis, now AI-automated
- AI "insights" that surface key findings with explanations
- industry benchmarks
- shareable dashboards and scheduled reports
- SPSS and PPT exports

Qualtrics and SurveyMonkey are both moving from tools you operate to AI that proactively surfaces findings.

### Cited Findings
- **SurveyMonkey analysis features** (Team Advantage section of the comparison page):
  - NPS and benchmarks
  - crosstabs, filters and statistical significance
  - word clouds, response tagging, thematic and sentiment analysis, rule-based tagging
  - "Analyze with AI" (20 prompts per survey)
  - exports to CSV, XLS, **PPT**, PDF and **SPSS**
  - dashboards and shareable data links
  - Source: [SurveyMonkey feature comparison](https://www.surveymonkey.com/pricing/details/?t=0)
  - The main pricing page lists crosstabs at Team Premier and Enterprise, and "Statistical significance", "Thematic Analysis" and "Analyze with AI" at Team Advantage and up. — [SurveyMonkey pricing](https://www.surveymonkey.com/pricing/)
- **SurveyMonkey 2026 analysis releases:**
  - **AI Insights** (Jun 25, 2026; US data center, English) surfaces key findings in Analyze and explains how they were derived.
  - **AI summaries of open-ended responses** in Thematic Analysis, with themes and sentiment (Mar 26, 2026; Individual Advantage+, Teams, Enterprise).
  - **Matrix stacked bars and trend charts**, including NPS over time (Feb 3, 2026).
  - **Chart customization** (Feb 18, 2026).
  - **Multi-Survey Analysis** (Apr 2, 2026; Canadian data centre).
  - Source: [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
- **SurveyMonkey benchmarks:** an overhauled "Benchmarks" experience, comparing results against similar organizations using "more than 27 years of proprietary SurveyMonkey data," is due "before the end of the year" (2026). — [SurveyMonkey newsroom, Sep 1 2026](https://www.surveymonkey.com/newsroom/surveymonkey-introduces-todays-surveymonkey/)
- **Qualtrics automated text analytics** (X4 2026): AI "detect[s] and organize[s] emerging topics across channels," cutting analysis from weeks to hours. Results are "deterministic and auditable," and one customer classified survey data in about an hour versus two weeks manually. — [Qualtrics CX X4 2026](https://www.qualtrics.com/news/new-cx-capabilities-x4-2026/)
- Qualtrics **Insights Explorer** analyzes open-ended responses to surface themes and summaries at "half the effort of traditional analytic tools." EX customers cut manual analysis by more than 95%. Vendor claims, Oct 2025. — [Qualtrics news, Oct 7 2025](https://www.qualtrics.com/news/qualtrics-accelerates-ai-leadership-and-value-with-experience-agents/)
- Qualtrics **Competitive Reviews** (X4 2026, "available now") gives ongoing benchmarking against nearby competitors' reviews. — [Qualtrics CX X4 2026](https://www.qualtrics.com/news/new-cx-capabilities-x4-2026/)
- **SurveySparrow analysis:**
  - executive dashboards shareable as links
  - real-time filtered reports
  - cross-tabulation via "Compare"
  - **scheduled reports**
  - exports to PDF, Excel and **SPSS**
  - bell-curve competency analysis
  - Source: [SurveySparrow features](https://surveysparrow.com/features/)
  - Enterprise adds custom dashboard widgets and Key Driver Analysis (CogniVue). — [SurveySparrow pricing](https://surveysparrow.com/pricing/)
- **Alchemer:** Iris bundles prior AI tools (Pulse 2024, Spark, AI Highlights, Predictive Analytics) and adds AI reporting and recommendations. GA begins Q4 2026. — [MRWeb DRNO, Sep 2 2026](https://www.mrweb.com/drno/news40267.htm)
- **Contentsquare surveys:** AI sentiment analysis, automated trend tagging, and summaries of main takeaways. A "quantification" feature shows how many users raised an issue and its effect on conversions and revenue. — [Contentsquare surveys](https://contentsquare.com/platform/capabilities/surveys/)

### Inferences
- The standard analysis checklist (crosstabs, significance, sentiment/themes, PPT/SPSS export, dashboards) sits at roughly the $30/user/month team tier at SurveyMonkey. It is not enterprise-only, so it is a credible bar for a form builder's "Pro" analytics.
- The 2026 shift is from "AI summary on demand" to "AI proactively surfaces findings with an explanation" (SurveyMonkey Insights) and "AI auto-builds the topic taxonomy" (Qualtrics). Explainability and auditability ("how it was derived," "deterministic and auditable") are now selling points against black-box summaries.
- Benchmarks rely on proprietary cross-customer data (27 years for SurveyMonkey). A new entrant cannot copy them quickly.

### Gaps
- I found no official 2026 page detailing Qualtrics Stats iQ or Text iQ capabilities. Coverage relied on news releases that do not name them.
- Scheduled report emails are verified for SurveySparrow only. SurveyMonkey and Qualtrics scheduled-report gating is not verified in sources fetched.
- Typeform's analytics depth (crosstabs, significance) is not covered by any source found.

## 4. Closing the loop (detractor alerts and tickets, CRM integrations, employee experience, journey tracking)

### Takeaway
Closing the loop has moved from "alert plus ticket" (SurveySparrow tickets, Salesforce sync) to **AI agents that act inside the survey itself**. Qualtrics Experience Agents resolve issues during post-service surveys. Alchemer Iris responds to reviews and triggers follow-ups, with humans approving the actions. EX is a parallel suite in its own right, covering engagement methodology, retention analytics and manager action plans.

### Cited Findings
- **Qualtrics Experience Agents:** AI agents act within post-service surveys to resolve concerns in the moment. The March 2026 release says they are "in initial preview programs." TruGreen addressed 51% of customer concerns and cut escalations by 30%+ in week one; Stanford Health Care is testing them under human supervision. — [Qualtrics CX X4 2026](https://www.qualtrics.com/news/new-cx-capabilities-x4-2026/)
  - **Conflict:** an Oct 7 2025 Qualtrics release says Experience Agents were announced at X4 **2025** and are "now in production with customers," resolving issues "within surveys and tickets" with human hand-off. — [Qualtrics news, Oct 7 2025](https://www.qualtrics.com/news/qualtrics-accelerates-ai-leadership-and-value-with-experience-agents/). The 2026 "preview" status may refer to a newer in-survey CX iteration. Treat GA scope as unverified.
  - CXToday headlines the launch as "AI Agents That Close the Loop in Real Time." — [CXToday](https://www.cxtoday.com/contact-center/qualtrics-customer-feedback-management-ai-cx/)
- **Qualtrics "Experience Transparency"** publishes first-party feedback on owned websites (e.g., Intermountain Health patient feedback). — [Qualtrics CX X4 2026](https://www.qualtrics.com/news/new-cx-capabilities-x4-2026/)
- **Qualtrics EX at X4 2026** (all "available now"):
  - conversational AI follow-ups
  - guided engagement programs deployable in weeks
  - EX25 methodology refresh, adding technology and AI-adoption categories
  - employee retention analytics that combine feedback with HR data (tenure, attrition, performance) to flag at-risk groups
  - AI personalized action recommendations for managers, with up to 70% more managers creating action plans (adidas, Verizon, Community Health Network)
  - Source: [Qualtrics EX X4 2026](https://www.qualtrics.com/news/new-ex-capabilities-x4-2026/)
- **Alchemer Iris:** it "can respond to reviews, trigger follow-ups, surface insights, and move work into the systems teams already use," with humans guiding and approving actions. It also includes "Automated Survey Follow-Up" and "AI Auto-Responder." — [MRWeb DRNO, Sep 2 2026](https://www.mrweb.com/drno/news40267.htm)
- **SurveySparrow** offers ticket management that turns responses into assignable tickets, plus visual workflows. — [SurveySparrow features](https://surveysparrow.com/features/). It also promoted a new **agentic AI module** (no-code agents trained on business context that turn surveys into conversations and trigger faster resolution) in a Jan 22, 2026 webinar. Vendor marketing; GA scope unverified. — [SurveySparrow webinar](https://surveysparrow.com/partners/webinars/partner-powerup-5-elevating-surveys-with-agentic-ai). Its pricing table lists "Echo Agents" quotas (2 on Free, 25 on paid tiers). — [SurveySparrow pricing](https://surveysparrow.com/pricing/)
- **SurveyMonkey CRM:** Salesforce SMS invites with response sync back to records (Enterprise + Salesforce add-on, Mar 2026). — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/). Salesforce and Power BI are listed at Enterprise. — [Usercall (third-party)](https://usercall.co/post/surveymonkey-pricing)
- **Contentsquare surveys** forward feedback to Jira, Asana, Linear and Trello. — [Contentsquare surveys](https://contentsquare.com/platform/capabilities/surveys/)
- **Qualtrics journey tooling:** Journey Optimizer is part of certain CX licences, as referenced in conjoint licensing. — [Qualtrics Support](https://www.qualtrics.com/support/conjoint-project/creating-managing-conjoint-projects-px/)

### Inferences
- For a form builder, the achievable close-the-loop slice has three parts:
  1. **Conditional alerts and routing** (e.g., NPS ≤ 6 → notify, create a task in Geiger Flow or another tool).
  2. **CRM write-back.**
  3. Eventually, an **AI follow-up question** step.

  The "agent resolves the issue in-survey" model needs deep knowledge-base and back-office integration, which is far out of scope.
- Geiger Forms sits in a suite with Geiger Flow (issues/tasks). That makes "response → ticket/issue in Flow" an unusually cheap close-the-loop feature, comparable to SurveySparrow tickets or Contentsquare's Jira/Linear forwarding.
- EX (engagement methodology, HRIS-driven audiences, manager action plans) is a separate product category. Only lightweight pulse surveys and anonymous employee feedback are plausibly in scope.

### Gaps
- Exact Qualtrics Experience Agents GA status as of Oct 2026 is unresolved, given the conflicting sources above.
- I found no detail on SurveyMonkey detractor alerting or ticketing in 2026 sources.
- Alchemer Salesforce integration specifics were not verified, since the Alchemer pages were blocked.

## 5. Quiz and assessment features (scoring, outcomes, certificates)

### Takeaway
Survey platforms offer scoring quizzes as a secondary feature: points, partial credit, per-answer feedback, results pages and emailed results. Assessment-grade features such as competency curves and 360s appear in SurveySparrow. None of the sources found mention certificates.

### Cited Findings
- **SurveyMonkey quizzes:**
  - Enable "Score this question" on Multiple Choice, Checkbox, Image Choice or Dropdown questions, then set correct answers and points.
  - Custom scoring allows partial credit.
  - Feedback can differ for correct, incorrect and partially correct answers on a Quiz Results page.
  - Logic is incompatible with Display Quiz Results.
  - Source: [SurveyMonkey Help: Quizzes](https://help.surveymonkey.com/en/surveymonkey/create/quizzes/)
  - **Quizzes Pro** adds feedback based on total score, auto-emailed results, and PDF/XLS/CSV export. — [SurveyMonkey feature comparison](https://www.surveymonkey.com/pricing/details/?t=0)
- **SurveySparrow** offers quizzes with auto-scoring, 360 feedback surveys and assessments, and "bell curve competency analysis." — [SurveySparrow features](https://surveysparrow.com/features/)

### Inferences
- Quiz depth in survey platforms is roughly at parity with general form builders. This is not where survey vendors differentiate. Outcome-based quizzes (personality or result mapping) and certificates are more of a form-builder and quiz-tool niche. Geiger could match them with scoring, results pages, emailed results and score-based redirects.

### Gaps
- I found no source on certificates or outcome/personality-quiz mapping in SurveyMonkey, Qualtrics, Alchemer or SurveySparrow.
- Qualtrics scoring features were not researched for lack of time.

## 6. Pricing and tier gating (USD, date observed; free tiers)

### Takeaway
Self-serve survey platforms gate the "research" features (crosstabs, significance, text analysis, AI analysis, SPSS/PPT export, multi-language, white-label) at roughly $30 to $92 per user per month, with 3-seat minimums on team plans. Qualtrics self-serve is reported at about $420/month, and its core XM is quote-only and five figures per year. Free tiers are deliberately tiny (around 10 questions and 25 to 100 responses).

### Cited Findings
- **SurveyMonkey official** (observed 2026-10-21, served in INR):
  - Team Advantage ₹1,550/user/month and Team Premier ₹3,800/user/month, both billed annually with a 3-user minimum.
  - Response limits: 50,000/yr (Team Advantage) and 100,000/yr (Team Premier).
  - Overage ₹5/response. Enterprise is custom (5+ users).
  - Seat roles: Full Access and Analyst.
  - Source: [SurveyMonkey pricing](https://www.surveymonkey.com/pricing/)
- **SurveyMonkey USD** (third-party, Sep 9 2026 post citing May 2026 prices):
  - Free $0, with 10 questions and 25 responses per survey, branding, and no export.
  - Standard $99/month, billed monthly.
  - Advantage $39/month annual (15,000 responses/yr).
  - Premier $139/month annual (40,000/yr).
  - Team Advantage $30/user/month and Team Premier $92/user/month (3-user minimum).
  - Overage $0.15/response.
  - Source: [Usercall (third-party / unverified)](https://usercall.co/post/surveymonkey-pricing)
  - Other aggregators put Advantage at $39 to $46/month, Team Premier at $75 to $92, and the free cap at 25 or 40 responses. — [Featurebase](https://www.featurebase.app/blog/surveymonkey-pricing); [Survicate](https://survicate.com/blog/surveymonkey-pricing/) (third-party / conflicting)
- **Qualtrics** (third-party / unverified):
  - Strategy & Research self-serve is about **$420/month** ($5,040/yr), with 1,000 responses shared across users.
  - Free account limits **conflict**: "3 active surveys, 30 questions, 500 responses" versus "100 responses and three active surveys."
  - CoreXM is quote-only, reportedly about $25k to $50k/yr for small enterprise teams, with a reported median contract of about $30k/yr.
  - Sources: [CleverX Qualtrics pricing 2026](https://cleverx.com/blog/qualtrics-pricing-guide-2026); [Featurebase Qualtrics pricing](https://www.featurebase.app/blog/qualtrics-pricing)
  - Plans were reportedly restructured and renamed on Feb 4, 2026 (Strategy & Research became "XM for Strategy & Research"). — [Costbench changelog (third-party)](https://costbench.com/changelog/qualtrics-plans-renamed-2026-02/)
  - One CX licensing detail from official docs: conjoint and MaxDiff need a separate PX/EX purchase. — [Qualtrics Support](https://www.qualtrics.com/support/conjoint-project/creating-managing-conjoint-projects-px/)
- **Alchemer** (third-party / unverified; official pricing URL returned 404 on 2026-10-21):
  - Collaborator $55/user/month (75,000 responses/yr, per Zonka's May 2026 check).
  - Professional $165/user/month (around 100,000 responses; advanced logic, offline).
  - Full Access $275/user/month (125,000 responses/yr).
  - Business/Platform tiers are quote-only, and user caps of about 3 seats apply on self-serve tiers.
  - One outlier source lists Collaborator at $26.25.
  - A G2 reviewer cited a "10X price increase" at renewal.
  - Sources: [Formbricks (competitor)](https://formbricks.com/blog/alchemer-pricing); [Zonka](https://www.zonkafeedback.com/blog/alchemer-alternatives-and-competitors); [Capterra](https://www.capterra.com/p/72549/Alchemer/pricing); [PricingSaaS](https://pricingsaas.com/companies/alchemer)
- **SurveySparrow** (official, observed 2026-10-21):
  - Plan prices did not render ("Loading plans...") and yearly billing saves "up to 40%." Extra users cost **$49/user/month**.

  | Plan | Users | Responses | Notes |
  |---|---|---|---|
  | Free | 1 | 75 per quarter | 3 active classic surveys, 10 questions/survey, 2 Echo Agents, no API |
  | Basic | 1 | 2,500 | display/skip logic |
  | Starter | 1 | 15,000 | survey translation, HubSpot |
  | Business | 3 | 36,000 | custom branding, advanced question types, workflows/webhooks, Zendesk |
  | Enterprise | custom | custom | CSS, 130+ language auto-translation, custom widgets, Key Driver Analysis, HIPAA, Power BI, CSM |

  - **Internal conflict:** the FAQ says the free tier allows "up to 50 responses per month."
  - Source: [SurveySparrow pricing](https://surveysparrow.com/pricing/)
- **SurveyMonkey pay-per-use research:** LaunchPad is pay-per-study with no subscription. — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
- **Typeform:** a paid tier "starting around $39/month" (third-party, 2026). — [Dupple (third-party)](https://dupple.com/learn/best-customer-feedback-tools)

### Inferences
- The price umbrella above a form builder is wide. Team-tier survey analytics cost $90 to $276/month at the 3-seat minimum (SurveyMonkey), and Alchemer runs $165 to $275 per user. A form builder that bundles crosstabs, significance, AI themes and PPT export at a lower tier would undercut on value.
- Response-capped pricing with per-response overage is the norm, and reviewers complain about renewal hikes (Alchemer). Transparent, uncapped pricing is a competitive angle that challengers already use (e.g., Formbricks, FormNX marketing).

### Gaps
- No official USD price was obtainable for SurveyMonkey (geo-served INR), Qualtrics (quote-based, no official page fetched), Alchemer (404) or SurveySparrow (JS-loaded).
- The free-tier caps for Qualtrics and SurveySparrow conflict across sources and could not be resolved.

## 7. 2025–2026 launches, especially AI

### Takeaway
The 2026 AI wave at survey vendors has five threads:
1. **Conversational survey building and editing** (SurveyMonkey).
2. **Proactive AI insights with explanations** (SurveyMonkey Insights, Qualtrics automated text analytics).
3. **AI follow-up probes inside surveys** (Qualtrics conversational feedback, Alchemer Iris).
4. **Agents that act**, resolving issues or triggering follow-ups (Qualtrics Experience Agents, Alchemer Iris, SurveySparrow agentic module).
5. **Distribution into LLM chat surfaces**: SurveyMonkey connectors for Claude, ChatGPT and, upcoming, Gemini. **Synthetic respondents** (Qualtrics Edge Audiences) are a sixth, separate thread.

### Cited Findings
- **SurveyMonkey 2026 timeline:**

  | Date | Release | Availability |
  |---|---|---|
  | Mar 24 | AI draft generation | all plans |
  | Mar 26 | AI open-ended summaries with sentiment | Advantage+ |
  | Apr 16 | Programs | Advantage+ |
  | Apr 27 | Claude integration | via the Claude Connector Directory |
  | Jun 10 | LaunchPad | pay-per-study |
  | Jun 25 | AI Insights | US/English |
  | Jul 6 | Conversational AI editing | US/English |
  | Jul 22 | GetFeedback website feedback | 7-day trial, English |
  | Aug 5 | ChatGPT connector | all users |

  - Source: [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/)
  - **Date conflict:** news coverage dates the ChatGPT plugin to Sep 15, 2026 and the Claude connector to May 2026. — [Demand Gen Report (search snippet; not fetched)](https://www.demandgenreport.com/industry-news/news-brief/surveymonkey-launches-chatgpt-plugin/54362)
- **"Today's SurveyMonkey" relaunch (Sep 1, 2026):**
  - personalized home
  - conversational builder
  - automatic AI analysis with plain-language explanations
  - Gemini Enterprise connector "coming soon"
  - Workday and BambooHR HRIS integration
  - overhauled Benchmarks (by year-end)
  - redesigned UI
  - Rollout "across various SurveyMonkey plans," with tiers not specified.
  - Source: [SurveyMonkey newsroom](https://www.surveymonkey.com/newsroom/surveymonkey-introduces-todays-surveymonkey/)
- **SurveyMonkey free AI tool:** a free, no-sign-in AI survey generator and research hub, reported Feb–Mar 2026. — [Demand Gen Report (search snippet; not fetched)](https://www.demandgenreport.com/industry-news/news-brief/surveymonkey-unveils-new-ai-tools-hub/51944)
- **SurveyMonkey leadership** (unverified): its newsroom lists John Ouren as CEO from Oct 7, 2026, while a September article quotes Eric Johnson as CEO. — [SurveyMonkey newsroom (search snippet)](https://www.surveymonkey.com/newsroom/)
- **Qualtrics X4 2026 (Mar 18, 2026), CX:**
  - omnichannel XM
  - social listening
  - AI automated text analytics
  - Competitive Reviews
  - Experience Transparency
  - Experience Agents (preview)
  - Source: [Qualtrics CX X4 2026](https://www.qualtrics.com/news/new-cx-capabilities-x4-2026/)
- **Qualtrics X4 2026, EX:** conversational feedback, guided programs, EX25 refresh, retention analytics, AI manager action plans. — [Qualtrics EX X4 2026](https://www.qualtrics.com/news/new-ex-capabilities-x4-2026/)
- **Qualtrics X4 2026, synthetic panels:** covered by analysts; CMSWire frames the event as "insight is cheap, execution is everything." — [CMSWire](https://www.cmswire.com/customer-experience/insight-is-cheap-qualtrics-is-selling-something-harder/)
- **Qualtrics AI adoption (Oct 2025, older):** over one-third of customers had upgraded to AI capabilities; monthly active customers of AI solutions rose 346% year on year; over 90% of the top 50 enterprise accounts had adopted at least one AI innovation. — [Qualtrics news, Oct 7 2025](https://www.qualtrics.com/news/qualtrics-accelerates-ai-leadership-and-value-with-experience-agents/)
- **Alchemer Iris** (Sep 2, 2026; GA from Q4 2026): an AI-native CX feedback and intelligence platform unifying surveys, reviews and reputation. It includes:
  - AI Survey Builder
  - conversational navigation
  - AI Removal Assistant for policy-violating Google reviews
  - workflow automation
  - Source: [MRWeb DRNO](https://www.mrweb.com/drno/news40267.htm)
  - An earlier Dec 10, 2025 Alchemer release was titled "Expanded AI Capabilities that Transform Customer Feedback into Actionable Intelligence." The content was not retrievable (403). — [BusinessWire (title only)](https://www.businesswire.com/news/home/20251210632047/en/Alchemer-Unveils-Expanded-AI-Capabilities-that-Transform-Customer-Feedback-into-Actionable-Intelligence)
- **SurveySparrow:** agentic AI module promoted Jan 2026. — [SurveySparrow webinar](https://surveysparrow.com/partners/webinars/partner-powerup-5-elevating-surveys-with-agentic-ai). Earlier: the "Wings" AI assistant and "CogniVue" AI analyst launched in early 2024 (older). — [IT Brief UK (2024)](https://itbrief.co.uk/story/surveysparrow-launches-ai-features-wings-cognivue)
- **Typeform:**
  - The Winter Product Release 2026 covers AI form creation from prompts, voice input and file uploads, Stripe/PayPal payments, and Contacts (customer profiles). — [Typeform Winter Release 2026](https://www.typeform.com/events-webinars/winter-product-release-2026)
  - The AI Suite with an "Insights" component launched Feb 2025 (older). — [Typeform blog](https://www.typeform.com/blog/typeform-launches-ai-suite)
  - A "Research Flow" product for AI-moderated studies was reported in search results; it is unverified because no official page was fetched.

### Inferences
- The market is converging on "survey + AI analyst + AI actor." For Geiger Forms, the realistic 2026–27 table stakes are:
  - AI form generation (already table stakes)
  - AI summaries and themes for open text
  - an AI "insights" panel that explains its findings
  - an AI follow-up question block
- "Connectors" that let users build and analyze surveys from Claude, ChatGPT or Gemini are a new distribution channel. An MCP-style connector may matter as much as an in-app AI UI. (Per project memory, in-app AI should come via the planned @geiger/ai package.)

### Gaps
- No primary-source detail was found on Qualtrics Edge Audiences pricing or the GA scope of the synthetic panel in 2026.
- SurveySparrow's 2026 agentic module has no dated GA press release.
- Typeform Research Flow is unverified.

## 8. What is migrating downmarket into general form builders?

### Takeaway
Four survey features have clearly migrated into mainstream form tools by 2025–2026:
- **AI generation of forms**, now universal
- **AI summaries of open-text responses** (Google Forms with Gemini since June 2025)
- **automatic NPS/CSAT scoring** (Tally, April 2026)
- **behaviour-triggered feedback widgets** (Hotjar and Contentsquare)

Crosstabs with significance, quotas, conjoint/MaxDiff, panels and agentic close-the-loop remain survey-platform territory.

### Cited Findings
- **Google Forms:** "Summarize responses" with Gemini generates AI summaries of short-answer and paragraph responses, identifying key themes. It appears only when a text question has more than 3 responses and is English-only. Editions: Workspace Business Standard/Plus, Enterprise Standard/Plus, Gemini Education add-ons, and Google AI Pro/Ultra. Rollout started June 10, 2025 (older). — [Google Workspace Updates](https://workspaceupdates.googleblog.com/2025/06/summarize-responses-with-gemini-google-forms.html); [Google Forms Help](https://support.google.com/docs/answer/16231981)
- **Tally:** an April 2026 update added automatic NPS and CSAT scoring to its Insights tab. Any 0–10 linear scale computes NPS using the promoter/passive/detractor method. — [CreateWith (third-party summary of Tally update)](https://www.createwith.com/tool/tally-forms/updates/tally-forms-launches-answer-insights-with-automatic-nps-and-csat-scoring)
- **Tally on AI drafting:** Tally's own help content says AI first-draft generation is "table stakes in 2026." — [Tally help](https://tally.so/help/best-ai-form-builders)
- **Typeform:** AI creation, payments and contact profiles were bundled into its 2026 release, a CRM-lite direction. — [Typeform Winter Release 2026](https://www.typeform.com/events-webinars/winter-product-release-2026)
- **Contentsquare (formerly Hotjar):** the micro-survey layer bundles AI generation, sentiment, tagging, summaries and replay-linked responses, and Hotjar's survey page now redirects to Contentsquare. — [Contentsquare surveys](https://contentsquare.com/platform/capabilities/surveys/)
- **SurveyMonkey moving down:** it is pushing in the other direction too. AI draft generation is on "all plans and regions," and a free no-login AI survey generator was reported. — [SurveyMonkey What's New](https://www.surveymonkey.com/product/features/whats-new/); [Demand Gen Report (snippet)](https://www.demandgenreport.com/industry-news/news-brief/surveymonkey-unveils-new-ai-tools-hub/51944)
- **Jotform:** described as having the "most complete AI toolkit" among form builders but the "smallest free plan." No source confirmed Jotform AI response summaries or a native NPS question. **(third-party / unverified.)** — [Dupple best survey tools 2026](https://dupple.com/learn/best-survey-tools)

### Inferences
These are proposed priorities for Geiger Forms, reasoned from the evidence above.

**Must-have**, because general form builders already ship these:
- AI form generation
- AI summary and themes of open-text answers
- native NPS/CSAT/CES question types with auto-scoring and trend charts
- scoring quizzes

**Differentiators** reachable for a form builder, which sit at about the $30+/seat tier at SurveyMonkey:
- piping and custom variables
- answer, question and block randomization
- response quotas
- multi-language with AI translation
- filter/compare and crosstabs with significance
- sentiment
- shareable dashboards and scheduled report emails
- SPSS and PPT export
- an AI "survey quality / bias / accessibility checker" in the ExpertReview style
- AI follow-up probe questions

**Suite-leveraged close-the-loop:**
- conditional alerts
- response → Geiger Flow issue
- recurring pulse schedules with contact lists and reminders

**Likely out of scope:**
- conjoint/MaxDiff simulators
- respondent and synthetic panels
- industry benchmarks, which need proprietary historical data
- autonomous resolution agents
- full EX suites (360s, retention analytics)

### Gaps
- I found no verified source on whether Jotform, Fillout or Typeform offer crosstabs or significance testing as of Oct 2026, so the "not yet migrated" claim for analysis depth is inferred from absence of evidence, not confirmed.
- Typeform's AI response-analysis feature set in 2026 (beyond the Feb 2025 "Insights" component) is unverified.
