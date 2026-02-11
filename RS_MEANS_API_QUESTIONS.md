# RS Means/Gordian API Integration Questions

**Meeting Date**: [To be filled]
**Attendees**: [To be filled]
**Purpose**: Evaluate RS Means data API for AI-powered construction cost estimation features

---

## 🎯 Executive Summary Questions

### 1. API Availability & Access
**Q**: Does RS Means/Gordian offer an API for programmatic access to your cost database?
*(Do you have a way for our software to automatically get your cost data, or do we have to manually look things up?)*

- If yes, what type of API? (REST, GraphQL, SOAP, etc.)
  *(What technology format does it use - REST is most common and easy to use)*
- What authentication method? (API keys, OAuth, etc.)
  *(How do we prove we're allowed to access it - like a password for software)*
- Is there API documentation available?
  *(Do you have instructions showing us how to use it?)*
- Can we get sandbox/test API access before purchasing?
  *(Can we try it out for free first before we pay money?)*

### 2. Licensing & Pricing Model
**Q**: What are the licensing options for API access?
*(How much does this cost and how do you charge us?)*

- Per-call pricing vs. subscription pricing?
  *(Do we pay every time we ask for data, or pay one monthly fee for unlimited use?)*
- Volume discounts for high API usage?
  *(If we use it A LOT, do we get a discount?)*
- Different tiers based on data access level?
  *(Are there cheap/medium/expensive plans with different features?)*
- Cost per user vs. cost per company/application?
  *(Do we pay based on how many people use it, or just one flat fee?)*
- Any setup fees or minimum commitments?
  *(Do we have to pay money upfront or commit to a long contract?)*

---

## 📊 Data Access & Coverage

### 3. Cost Database Scope
**Q**: What construction cost data is available through the API?
*(What kinds of construction prices do you actually have?)*

- Material costs (updated how frequently?)
  *(Prices for lumber, concrete, etc. - and how often do you update them?)*
- Labor rates by trade and location
  *(How much electricians, plumbers, etc. charge per hour in different cities)*
- Equipment costs
  *(How much it costs to rent excavators, lifts, etc.)*
- Subcontractor costs
  *(What subcontractors typically charge for complete jobs)*
- Overhead and profit percentages
  *(How much extra contractors usually add on top of direct costs)*
- Location factors/cost indices by city/zip code
  *(How prices differ between expensive cities like SF vs. cheap cities like rural Texas)*
- Historical cost trends
  *(Past prices so we can see if things are going up or down)*

**Q**: Does the data cover all trades relevant to our projects?
*(Do you have prices for ALL the different types of construction work we do?)*

- Concrete, framing, electrical, plumbing, HVAC
- Roofing, siding, flooring, finishes
- Sitework, excavation, grading
- Specialty trades (low voltage, fire protection, etc.)

### 4. Geographic Coverage
**Q**: What geographic regions does your cost data cover?
*(What parts of the country do you have accurate prices for?)*

- US coverage: All 50 states?
  *(Do you cover everywhere in America or just some states?)*
- Canada coverage?
  *(Do you have Canadian prices too?)*
- Granularity: National, state, city, or zip code level?
  *(How specific can you get - whole country average, or down to individual neighborhoods?)*
- How are location adjustments/cost indices calculated?
  *(How do you figure out that Dallas is 10% cheaper than NYC?)*
- How often are location factors updated?
  *(Do these location differences change over time and how often do you update them?)*

### 5. Data Freshness & Updates
**Q**: How frequently is the cost data updated?
*(How often do you refresh the prices to keep them accurate?)*

- Real-time updates?
  *(Do prices update immediately when market changes?)*
- Daily, weekly, monthly, quarterly?
  *(If not real-time, how often exactly?)*
- How do you handle material price volatility (lumber, steel, etc.)?
  *(When lumber prices go crazy like in 2021, how fast do you update?)*
- Historical data available for trend analysis?
  *(Can we see what prices were 6 months ago, 1 year ago, etc.?)*
- Do you provide price forecasting data?
  *(Do you predict what prices will be in the future?)*

---

## 🤖 AI/ML Use Cases

### 6. Budget Estimation AI
**Our Use Case**: Auto-generate project budgets from project description (e.g., "3,000 sq ft commercial office buildout")
*(We want our AI to automatically create a full budget just from a simple description)*

**Q**: Can your API support this workflow?
*(Can we ask your system "how much for a 3,000 sq ft office?" and get a complete answer?)*

- Can we send project parameters (size, type, location) and receive estimated costs?
  *(Can we tell you the building size, type, and city, and you give us a total price?)*
- Do you have assembly-level costs (not just unit costs)?
  *(Do you have prices for complete systems like "full bathroom" instead of just individual parts?)*
- Example: "Office interior finish per sq ft" vs. individual line items
  *(Can we get one number like "$50/sq ft" instead of pricing 100 individual items?)*
- Can we get cost breakdowns by CSI division?
  *(Can you organize costs by category - concrete, electrical, plumbing, etc.?)*
- Can we get parametric estimating data (cost per sq ft by building type)?
  *(Do you have simple formulas like "offices cost $150/sq ft, warehouses cost $80/sq ft"?)*

### 7. Change Order Impact Analysis
**Our Use Case**: AI predicts cost impact of scope changes (e.g., "Add 2 bathrooms to floor plan")
*(Customer changes their mind mid-project - we need to instantly tell them how much more it costs)*

**Q**: Can we query incremental costs for specific scope items?
*(Can we ask "how much to add just this one thing" and get a quick answer?)*

- Example API call: "Cost to add 1 bathroom in Dallas, TX"
  *(Literally can we type that and get a number back?)*
- Do you provide assemblies/systems for common additions?
  *(Do you have pre-packaged prices for things people commonly add like bathrooms, bedrooms, etc.?)*
- Can we get material + labor breakdown for change orders?
  *(Can you show us how much is materials vs. labor so we can explain it to customers?)*

### 8. Material Substitution Recommendations
**Our Use Case**: AI suggests cheaper alternatives when materials are over budget
*(When the project is too expensive, we want to suggest "use this instead of that" to save money)*

**Q**: Does your data include alternative materials with cost differentials?
*(Do you have lists of similar products with different prices?)*

- Example: Laminate flooring vs. hardwood vs. tile
  *(Can we compare 3 different flooring options and their costs?)*
- Equivalent products from different manufacturers
  *(Like comparing Home Depot brand vs. premium brand?)*
- Quality/grade variations (e.g., standard vs. premium fixtures)
  *(Basic toilet vs. fancy toilet - do you have both?)*
- Can we query "Show me alternatives for [product] within ±20% cost"?
  *(Can we ask for cheaper/similar options and you show us a list?)*

### 9. Bid Reasonableness Check
**Our Use Case**: AI flags subcontractor bids that are too high/low vs. market rates
*(Electrician says job costs $10K - is that fair or is he ripping us off?)*

**Q**: Can we use your data to benchmark bid prices?
*(Can we compare what someone quoted us vs. what's normal?)*

- Access to subcontractor cost ranges by trade and location?
  *(Do you know what electricians, plumbers, etc. typically charge in each city?)*
- Labor hour estimates for common tasks?
  *(Do you know how long jobs should take - like "wiring a house = 40 hours"?)*
- Can we query "Average cost for electrical rough-in per sq ft in [city]"?
  *(Can we ask for typical prices and you tell us what's normal?)*

### 10. Cash Flow Forecasting
**Our Use Case**: AI predicts when costs will be incurred based on construction schedule
*(We want to predict when money goes out the door during a 6-month project)*

**Q**: Do you provide data on typical cost loading curves?
*(Do you have data on WHEN during a project money gets spent?)*

- Example: What % of costs occur in each project phase?
  *(Like: 30% in month 1, 40% in month 2, 30% in month 3?)*
- Cost timing by trade (e.g., concrete early, finishes late)?
  *(Do you know that concrete happens first, painting happens last, etc.?)*
- Can we model cash flow based on project type and duration?
  *(Can we predict payment schedules for different types of buildings?)*

---

## 🔧 Technical Integration

### 11. API Performance & Limits
**Q**: What are the technical specifications of your API?
*(How fast is it and are there any restrictions on how much we can use it?)*

- Rate limits (requests per minute/hour/day)?
  *(How many times can we ask for data before you block us?)*
- Response time SLA?
  *(How fast do you promise to respond - milliseconds? seconds?)*
- Data payload size limits?
  *(Is there a limit on how much data we can request at once?)*
- Concurrent request limits?
  *(Can we ask for 100 things at the same time or do we have to wait between requests?)*
- Any throttling or usage caps?
  *(Will you slow us down or cut us off if we use it too much?)*

### 12. Data Format & Structure
**Q**: How is data returned from the API?
*(What format does the data come back in?)*

- JSON, XML, CSV, or other formats?
  *(JSON is easiest for us - do you use that?)*
- Sample API response structure?
  *(Can you show us an example of what the data looks like?)*
- Is there a standardized taxonomy/classification system?
  *(Do you organize things in a consistent, predictable way?)*
- MasterFormat (CSI) divisions used?
  *(Do you use the standard construction industry categories?)*
- Unique identifiers for each cost item?
  *(Does each item have a unique ID number so we can track it?)*

### 13. Search & Query Capabilities
**Q**: How can we search/filter your cost database?
*(How do we find specific things in your database?)*

- Keyword search (e.g., "vinyl plank flooring")?
  *(Can we just type what we're looking for like Google?)*
- Filter by CSI division, location, cost range?
  *(Can we narrow down results by category, city, price range, etc.?)*
- Fuzzy matching for typos?
  *(If we type "vynil" instead of "vinyl" will you still find it?)*
- Can we search by product specifications (e.g., "2x4 lumber, grade A")?
  *(Can we search by technical details and quality levels?)*

### 14. Bulk Data Export
**Q**: Can we download bulk data for local caching/training ML models?
*(Can we download a big chunk of data all at once to store on our computers?)*

- Export entire regional database?
  *(Can we download ALL the data for Texas in one file?)*
- Download costs for specific trades or categories?
  *(Can we download just electrical data or just plumbing data?)*
- How large are typical datasets (file size)?
  *(How big are these files - megabytes? gigabytes?)*
- Update frequency for bulk exports?
  *(How often can we re-download fresh data?)*

---

## 🎓 AI Model Training

### 15. Training Data for Machine Learning
**Q**: Can we use RS Means data to train our AI models?
*(Can we feed your data into our AI system to teach it how to estimate costs?)*

- Licensing terms: Are we allowed to train ML models on your data?
  *(Does your contract let us use the data for teaching AI, or is that forbidden?)*
- Can we store/cache data locally for model training?
  *(Can we keep a copy on our servers to train the AI, or must we ask you every time?)*
- Any restrictions on derivative works?
  *(If our AI learns from your data and makes predictions, do we own those predictions or do you?)*
- Do you offer historical data for time-series analysis?
  *(Can we get old price data from past years to teach the AI about trends over time?)*

### 16. Embeddings & Structured Data
**Q**: Does your API provide structured metadata for AI consumption?
*(Is your data organized in a way that AI systems can easily understand and use?)*

- Product categories, tags, attributes?
  *(Do you label items with categories like "flooring > vinyl > luxury" so AI can understand relationships?)*
- Relationships between items (e.g., "commonly used together")?
  *(Do you track which materials are typically used together, like "drywall + joint compound + screws"?)*
- Do you have embeddings or vector representations of cost items?
  *(Do you provide AI-ready mathematical representations of your data - special format for machine learning?)*

---

## 📖 Documentation & Support

### 17. Developer Resources
**Q**: What resources are available for integration?
*(What helpful materials do you provide to help our programmers connect to your system?)*

- API documentation (Swagger/OpenAPI spec)?
  *(Do you have detailed instructions/reference guides - preferably in standard format like Swagger?)*
- Code samples/SDKs (Python, JavaScript, etc.)?
  *(Do you provide example code or pre-built libraries in common programming languages?)*
- Sandbox environment for testing?
  *(Do you have a fake/practice version we can experiment with without breaking anything?)*
- Developer community or forum?
  *(Is there a place where developers can ask questions and help each other?)*

### 18. Technical Support
**Q**: What support is included with API access?
*(If we have problems or questions, what kind of help do we get?)*

- Dedicated technical support contact?
  *(Do we get a specific person or team to contact, or just generic support?)*
- Response time SLA for support tickets?
  *(How fast do you promise to respond - same day? 24 hours? 1 week?)*
- Onboarding/implementation assistance?
  *(Will someone help us get set up initially, or are we on our own?)*
- Regular API updates and changelogs?
  *(Do you tell us when you make changes so our code doesn't break unexpectedly?)*

---

## 🔒 Compliance & Security

### 19. Data Security & Privacy
**Q**: What security measures are in place for API access?
*(How do you keep the data secure when we're accessing it over the internet?)*

- HTTPS/TLS encryption required?
  *(Is the connection encrypted like online banking, so hackers can't intercept the data?)*
- API key rotation policies?
  *(Do we have to change our password/access key regularly for security?)*
- SOC 2 or ISO 27001 certification?
  *(Have you been audited by third parties to prove your security is good - industry standard certifications?)*
- Data residency (where are servers located)?
  *(Where physically are the servers - US? Europe? Matters for data privacy laws)*

### 20. Terms of Service & Usage Rights
**Q**: What are the terms for using RS Means data in our SaaS application?
*(What are we legally allowed to do with your data in our product?)*

- Can we display cost data to end users?
  *(Can we show your prices directly to our customers, or must we keep them hidden?)*
- Can we aggregate/transform data for AI predictions?
  *(Can we combine/modify your data to make AI estimates, or must we use it exactly as-is?)*
- Attribution requirements?
  *(Do we have to say "Powered by RS Means" somewhere, or can we use it silently?)*
- Restrictions on redistribution?
  *(Can our customers download/export the data, or is that not allowed?)*
- Can we white-label the cost data in our product?
  *(Can we present it as our own data without mentioning you?)*

---

## 🚀 Scalability & Future Roadmap

### 21. API Scalability
**Q**: How does pricing/access scale as our user base grows?
*(What happens to the cost when we go from 10 users to 10,000 users?)*

- Volume-based pricing tiers?
  *(Do we get cheaper per-unit pricing when we use more, like bulk discounts?)*
- Enterprise licensing options?
  *(Is there a special unlimited plan for big companies instead of paying per use?)*
- Any caps on total API calls per month?
  *(Is there a maximum limit where you'll cut us off, even if we want to pay more?)*
- Can we upgrade/downgrade plans easily?
  *(If we need more or less, can we change plans mid-contract or are we locked in?)*

### 22. Roadmap & New Features
**Q**: What's on the product roadmap for your API?
*(What new features are you planning to add in the future?)*

- Planned new data types or features?
  *(What new kinds of data or capabilities are coming soon?)*
- AI/ML-specific API endpoints in development?
  *(Are you building features specifically designed for AI use cases like ours?)*
- Integration with project management tools (Procore, etc.)?
  *(Will you connect directly with other construction software we might use?)*

---

## 🧪 Proof of Concept

### 23. Trial/Pilot Program
**Q**: Can we run a proof-of-concept before committing?
*(Can we test this out for real before spending a lot of money?)*

- Free trial period for API access?
  *(Can we use it free for 30 days or something to make sure it works for us?)*
- Limited dataset for testing (e.g., 1 state, 1 trade)?
  *(Can we get a small subset of data just for testing - like only Texas electrical costs?)*
- What's the process to upgrade from trial to production?
  *(If we like it, how easy is it to go from trial to paying customer?)*

### 24. Sample Use Case Test
**Q**: Can we test a specific workflow during our meeting?
*(Can you show us a live demo right now using a real example?)*

- Example: "Give me cost estimate for 2,000 sq ft office in Dallas, TX"
  *(Can you actually run this query and show us what the response looks like?)*
- Example: "What's the cost difference between vinyl and hardwood flooring?"
  *(Can you compare two materials and show us the price difference?)*
- Show API request/response format
  *(Can we see the actual technical request we'd send and the data we'd get back?)*
- Demonstrate query capabilities
  *(Show us what kinds of questions we can ask and how flexible the system is)*

---

## 📋 Specific Data Points We Need

### 25. Checklist: Confirm These Data Elements Are Available
*(Here's a list of specific construction costs we need - just go through and confirm you have each one)*

**Material Costs:**
*(Prices for physical building materials)*
- [ ] Lumber (dimensional, engineered, plywood, OSB)
- [ ] Concrete (ready-mix, various PSI ratings)
- [ ] Steel (structural, rebar, mesh)
- [ ] Drywall (various types, thicknesses)
- [ ] Insulation (fiberglass, spray foam, rigid)
- [ ] Roofing (shingles, TPO, EPDM, metal)
- [ ] Flooring (carpet, vinyl, hardwood, tile)
- [ ] Windows & doors (various styles, materials)
- [ ] Electrical fixtures & devices
- [ ] Plumbing fixtures & pipes
- [ ] HVAC equipment

**Labor Costs:**
*(How much different workers charge per hour in different cities)*
- [ ] Carpenter (rough, finish)
- [ ] Electrician (journeyman, apprentice)
- [ ] Plumber (journeyman, apprentice)
- [ ] HVAC technician
- [ ] Concrete finisher
- [ ] Drywall installer & finisher
- [ ] Painter
- [ ] Roofer
- [ ] Laborer (general, skilled)
- [ ] Equipment operator
- [ ] Project manager / superintendent (overhead rates)

**Equipment Costs:**
*(Rental costs for construction equipment and tools)*
- [ ] Excavators (various sizes)
- [ ] Skid steers, backhoes
- [ ] Aerial lifts, scaffolding
- [ ] Concrete pumps, mixers
- [ ] Generators, compressors
- [ ] Small tools & consumables

**Other Data:**
*(Additional cost factors that affect total project price)*
- [ ] Subcontractor markups by trade
  *(How much extra subcontractors typically charge on top of costs)*
- [ ] General contractor overhead %
  *(Percentage contractors add for office costs, insurance, etc.)*
- [ ] Profit margins (typical ranges)
  *(How much profit contractors usually add - like 10-15%)*
- [ ] Sales tax rates by location
  *(Tax rates for different cities/states)*
- [ ] Permit & fee estimates
  *(Typical costs for building permits in different areas)*
- [ ] Insurance & bonding costs
  *(Cost of insurance and bonds required for projects)*
- [ ] Waste factors by material type
  *(How much extra material to buy because some gets wasted - like 10% extra drywall)*

---

## 💼 Business Terms to Negotiate

### 26. Pricing Negotiation Points
**Q**: What flexibility is there in pricing structure?
*(Can we negotiate a better deal than the standard price?)*

- Startup discount programs?
  *(Do you give discounts to small/new companies like ours?)*
- Academic/non-profit pricing?
  *(Any special cheaper rates for schools or non-profits?)*
- Multi-year contract discounts?
  *(If we commit to 2-3 years upfront, do we get a discount?)*
- Revenue-share models instead of fixed fees?
  *(Could we pay you a percentage of what we make instead of a fixed monthly fee?)*
- Can we pay per project instead of per API call?
  *(Could we pay like $X per construction project we estimate, instead of per API request?)*

### 27. Contract Terms
**Q**: What are standard contract terms?
*(What are the basic rules of the contract we'd sign?)*

- Contract length (monthly, annual, multi-year)?
  *(How long do we have to commit - can we cancel monthly or are we locked in for a year?)*
- Cancellation policy and penalties?
  *(If we want to cancel, how much notice do we give and do we pay a penalty?)*
- Price lock guarantees?
  *(Will the price stay the same or can you raise it on us mid-contract?)*
- SLA commitments in writing?
  *(Do you guarantee uptime/performance in the contract with penalties if you don't deliver?)*
- What happens if we exceed usage limits?
  *(If we use more than our plan allows, do we get charged extra or cut off?)*

---

## 📞 Next Steps & Action Items

### During the Meeting:
1. [ ] Take detailed notes on each answer
2. [ ] Request API documentation links
3. [ ] Ask for sample API credentials for testing
4. [ ] Get pricing sheet or quote
5. [ ] Clarify timeline for implementation
6. [ ] Exchange technical contact information
7. [ ] Schedule follow-up demo or technical deep-dive

### After the Meeting:
1. [ ] Review API documentation
2. [ ] Build proof-of-concept integration
3. [ ] Calculate ROI based on pricing
4. [ ] Compare with alternative data sources (if any)
5. [ ] Present findings to team for decision
6. [ ] Negotiate contract terms
7. [ ] Begin production integration

---

## 🎤 Opening Statement for Meeting

**Suggested Introduction:**

> "Hi, thanks for meeting with us. We're building an AI-powered construction management platform for residential and commercial contractors. Our goal is to help them estimate projects faster, catch budget issues early, and make data-driven decisions.
>
> We're very interested in integrating RS Means cost data into our AI models for features like:
> - Automated budget generation from project descriptions
> - Real-time cost impact analysis for change orders
> - Material substitution recommendations
> - Subcontractor bid validation
>
> Today, I'd like to understand exactly what data you can provide through your API, how we can use it in our AI use cases, and what the commercial terms would look like.
>
> We're currently in [beta/production] with [X] companies and [Y] active users, and we expect to scale to [Z] users over the next 12 months.
>
> Let's dive in—can you start by giving me an overview of your API capabilities?"

---

## 📝 Notes Section

**Use this space during the meeting to capture:**
- Key answers to questions above
- Pricing details
- Technical limitations discovered
- Action items and follow-ups
- Contact information
- Timeline commitments

---

**Meeting Prep Checklist:**
- [ ] Print this document
- [ ] Research current RS Means pricing (public info)
- [ ] Prepare use case examples/demos from your app
- [ ] Bring laptop to test API live if possible
- [ ] Have NDA ready if needed
- [ ] Bring business card / contact info
- [ ] Know your budget range for this integration
- [ ] Identify decision-makers on your team

**Good luck with your meeting! 🚀**

