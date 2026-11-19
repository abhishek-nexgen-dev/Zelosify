# Design.md — Zelosify Product UI

> **Design contract for coding agents.** Follow this file for every new or edited UI screen. Zelosify uses one consistent, accessible, responsive **black-first dark theme** across the public website and all authenticated role workflows.

## 1. Non-negotiable rules

1. **Black dark theme is the only product theme.** Use near-black page backgrounds, charcoal surfaces, clear light text, and restrained high-contrast accents. Do not introduce light page themes or theme toggles.
2. **Reuse the existing project's components, styling approach, layout, fonts, and dependencies** whenever possible. Inspect the repository before coding. Do not install a new UI library or icon package merely for appearance.
3. **Keep the same design system on every page:** same spacing, typography, buttons, forms, tables, cards, badges, dialogs, and feedback states.
4. **When a user requests site-wide visual consistency, apply these rules to every existing route** while preserving each page's behavior, API integration, permissions, and content requirements.
5. Do not add a light-theme toggle. New and updated pages should use the dark tokens directly and remain visually consistent with existing dark screens.
6. **Functionality, RBAC, accessibility, and speed take priority over visual effects.** No heavy animation, glassmorphism, gradients everywhere, or decorative dashboards.
7. Never show vendor users AI recommendation scores, explanations, or other vendors' uploads. UI hiding is not a substitute for backend authorization.

## 2. Product direction

**Style:** modern B2B recruitment SaaS; calm, professional, compact but not crowded. Think clean data tables, simple forms, obvious primary actions, and helpful status indicators.

**Visual principles:** clear hierarchy, predictable navigation, consistent density, few colors, readable data, obvious feedback. Avoid emoji as functional icons.

## 3. Design tokens

Use existing design tokens if available. Otherwise create **one central token file** (CSS variables) and reuse it. The values below are defaults, not a reason to overwrite an established project theme.

```css
:root,
.dark {
  color-scheme: dark;
  --background: #050505;
  --surface: #0b0b0b;
  --surface-muted: #111111;
  --surface-raised: #171717;
  --text: #f5f5f5;
  --text-muted: #a3a3a3;
  --border: #262626;
  --primary: #f5f5f5;
  --primary-hover: #d4d4d4;
  --primary-soft: #1a1a1a;
  --accent: #a3e635;
  --success: #4ade80;
  --success-soft: #102016;
  --warning: #fbbf24;
  --warning-soft: #241c0b;
  --danger: #fb7185;
  --danger-soft: #271116;
  --focus: #d9f99d;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-card: 0 8px 28px rgb(0 0 0 / 0.28);
}
```

**Color usage:** use lime (`--accent`) for primary actions, keyboard focus, and active navigation. Use neutral white/gray for secondary actions and links. Use green for success/recommended, amber for borderline, and rose for rejected/errors. Keep text contrast high. Do not rely on color alone: always include a text label.

**Typography:** use the project's current sans-serif font. Body 14–16px, page title 26–30px, section heading 18–20px, labels 13–14px. Use `font-weight: 600` for headings, 400–500 for content. Line height around 1.5.

**Spacing:** use a consistent 4px-based scale: 4, 8, 12, 16, 24, 32, 48px. Cards typically have 20–24px padding. Inputs/buttons minimum 40–44px height. Content max width about 1200–1280px, with 16px mobile and 24–32px desktop side padding.

**Borders and shadows:** 1px charcoal borders, mild rounded corners, restrained shadows. No oversized pill-shaped tables/cards. Avoid large bright panels that read as a different theme.

## 4. Shared application shell

- Reuse the existing authentication shell and navigation where possible.
- Header: product/section name, signed-in user role, account/logout actions already provided by the app.
- Navigation: show only the appropriate persona's routes; never mix vendor and manager actions.
- Page pattern: **breadcrumb (optional) → page title and short description → primary action (if any) → filters/content → feedback**.
- Use one consistent content container and alignment across routes.
- Keep the public homepage and job search distinct; do not duplicate job search on the homepage.

## 5. Reusable UI components

Prefer existing components. If absent, create small shared components for:

| Component      | Design rule                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `PageHeader`   | Title, one-line description, optional action aligned right on desktop                               |
| `Button`       | Primary lime with black text, secondary outlined/neutral, destructive rose; disabled/loading states |
| `Card`         | Charcoal surface, subtle border, consistent padding and radius                                      |
| `DataTable`    | Clear column labels, subtle row dividers, horizontal scroll on narrow screens                       |
| `StatusBadge`  | Label + soft semantic background; not color alone                                                   |
| `FormField`    | Visible label, helper/error text, consistent focus ring                                             |
| `FileDropzone` | Dashed border, keyboard-operable upload, supported formats, progress and errors                     |
| `Dialog`       | Confirm destructive actions; focus management and accessible close                                  |
| `Skeleton`     | Match final component dimensions to avoid layout jumps                                              |
| `EmptyState`   | Explain why there is no data and offer an appropriate next action                                   |
| `ErrorState`   | Plain-language error and retry where applicable                                                     |

Do not create an oversized design-system framework for a single feature or route group.

## 6. Page patterns

### Public website

- Keep the home, job search, and job detail pages in the same near-black visual system.
- Marketing sections may use imagery and accent color, while preserving readable contrast and restrained decoration.
- Job discovery should focus on search, useful filters, and clear opening cards; do not duplicate job-search UI on the home page.

### Authentication

- Login, signup, account security, and authenticator setup use the shared dark auth shell and consistent form controls.
- Preserve existing validation, QR setup, TOTP, and redirect flows.

### Candidate experience

- Candidate dashboard, applications, profile, and score pages use the shared dark cards, status labels, and accessible data hierarchy.
- Keep application actions, AI scores, and explanations connected to real API data.

### Internal role workflows

- Admin, IT Vendor, Hiring Manager, and Recruiter pages share the same dark shell, page headers, tables, forms, and feedback states.
- Role permissions determine visible actions; preserve server authorization and existing navigation behavior.
- Use consistent table search, filtering, pagination, row actions, and empty/loading/error states.

### A. `/vendor/openings` — Vendor openings list

- Page title: **Contract Openings**.
- Paginated table with **Title, Location, Contract Type, Posted Date, Hiring Manager**.
- Each row opens its details page.
- Clear loading, empty, and error states.
- Never display AI recommendation details.

### B. `/vendor/openings/:id` — Vendor opening details

- Back link to openings, title, location, contract type, experience range, manager, description and relevant dates.
- **Upload Candidates** section with drag-and-drop and browse control; accept only **PDF, DOC, and DOCX** resumes.
- Show file name, type, size, upload status, progress and helpful validation errors.
- Uploaded files list with **Preview** and **Delete** (soft delete) for authorized own uploads.
- Use confirmation before delete. Never expose raw S3 credentials or public unrestricted file URLs.
- Show upload/submission success or failure without freezing the page.

### C. `/hiring-manager/openings` — Manager openings list

- Page title: **My Openings**.
- Show only openings assigned to the authenticated manager.
- Use the same table style, spacing and row navigation as the vendor list.
- No resume upload controls.

### D. `/hiring-manager/openings/:id` — Candidate review

- Opening summary at top; below, candidate profile list/cards.
- Each candidate must show **file name, upload date, recommendation label, score %, confidence %, explanation, processing time, Shortlist, Reject**.
- Use consistent semantic badges: **Recommended**, **Borderline**, **Not Recommended**. Show **Processing** or **Failed** when a recommendation is not yet available.
- Shortlist = clear positive action; Reject = destructive action with confirmation.
- Make actions disabled while saving and show success/error feedback.
- For >50 records, support the assignment's virtualization requirement; preserve keyboard access.

## 7. Responsive behavior

- **Desktop (>=1024px):** full-width content within max container; tables; actions aligned right.
- **Tablet (768–1023px):** reduced padding; tables can scroll horizontally; header/actions wrap.
- **Mobile (<768px):** 16px gutters; single-column cards/sections; buttons and inputs large enough to tap; avoid clipped content. Prefer compact cards for complex candidate information, while preserving every required field and action.
- Never hide required content on mobile just to make the layout look cleaner.

## 8. Interaction states and accessibility

For **every** data-driven component, implement: initial loading, success, empty, error, retry where appropriate, and disabled/submitting state.

- Visible keyboard focus; semantic buttons/links; proper labels and headings.
- Ensure sufficient text contrast (aim for WCAG AA), meaningful screen-reader status messages, and keyboard access to uploads, dialogs and tables.
- Never use a spinner as the only explanation for a long-running AI operation; show **Analyzing resume…** and allow the rest of the UI to remain usable.
- Do not invent recommendation data while processing.
- Dates, percentages and durations must be formatted consistently.
- Respect reduced-motion preferences; animations should be subtle and optional.
- Keep the document as the single page scroll surface behind the shared Locomotive provider. Honor `prefers-reduced-motion`; add `data-lenis-prevent` only to intentional nested scrollers such as the sidebar, tables, and dialogs.

## 9. AI result presentation

- Display the **backend-computed deterministic score**. Never recalculate or fabricate the result in the UI.
- Labels: `score >= 0.75` Recommended; `0.50 <= score < 0.75` Borderline; `< 0.50` Not Recommended.
- Show confidence separately from match score. Never label confidence as accuracy.
- Show a short readable explanation and processing time in milliseconds.
- For missing or failed recommendations, show an honest status instead of `0%` or an invented reason.
- AI is decision support; the manager still chooses Shortlist or Reject.

## 10. Implementation guidance for the coding agent

Before building any page:

1. Read `AGENTS.md`, `README.md` (if present), the assignment PDF, and setup guide.
2. Inspect existing frontend structure, styling, routes, components, and auth guards.
3. Identify existing reusable components; avoid duplicate styles.
4. Implement or reuse central dark tokens and a small set of shared components.
5. Apply the same shell and components to the affected existing routes.
6. Connect real APIs; no hardcoded candidate scores or fake success states.
7. Check permissions and tenant-specific visibility.
8. Test desktop, tablet, mobile, keyboard navigation, loading, empty and error states.
9. Run the project's available lint/build/test commands.
10. Document what is complete, untested, blocked or missing. Do not claim completion without verification.

## 11. Design review checklist

- [ ] Black dark theme is used consistently across public, auth, candidate, and internal pages.
- [ ] All affected routes share the same typography, colors, spacing and components.
- [ ] Existing application layout and dependencies are reused.
- [ ] All specified fields and actions are present.
- [ ] Vendor cannot see AI results or other vendors' uploads.
- [ ] Manager can only access their assigned openings.
- [ ] Upload accepts only PDF, DOC, and DOCX resumes and shows progress/errors.
- [ ] AI badges, score, confidence, explanation and latency are readable.
- [ ] Loading, empty, error, pending and disabled states are handled.
- [ ] Mobile/tablet/desktop layouts work without lost actions.
- [ ] Keyboard and screen-reader interactions work.
- [ ] No stray light-theme page, surface, or toggle remains in the affected routes.
- [ ] No unrelated features, unnecessary packages or ornamental UI were added.

---

**Priority order:** correct functionality → authorization/security → consistent black-theme UI → responsive/accessibility → polish. When requirements conflict, follow the assignment documents and flag the conflict rather than silently omitting a requirement.
