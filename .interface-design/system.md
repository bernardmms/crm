# Design System — Stemis CRM

## Direction

**Personality:** Precision & Density
**Foundation:** Cool (slate) — cold intelligence aesthetic, B2B sales operator tool
**Feel:** Apollo.io meets Linear. Dense, precise, action-oriented. Every pixel earns its place.
**Depth:** Borders-only. No shadows anywhere.

## Intent

**User:** B2B growth / sales operator running AI prospecting missions.
Between calls, reviewing results, deciding which leads to pursue.
Familiar with Apollo.io, Clay, Lemlist, HubSpot.

**Task verb:** Launch mission → monitor execution → qualify leads → act.

---

## Tokens

### Spacing
Base: 4px
Scale: 4, 8, 12, 16, 24, 32
Gap classes: gap-1 (4px), gap-2 (8px), gap-3 (12px), gap-4 (16px), gap-6 (24px)

### Colors
Accent: blue-500 (active process, primary CTA)
Score high (8-10): emerald-500 — bg-emerald-50/text-emerald-700 (dark: bg-emerald-950/60)
Score mid (6-7): amber-500 — bg-amber-50/text-amber-700 (dark: bg-amber-950/60)
Score low (0-5): red-500 — bg-red-50/text-red-700 (dark: bg-red-950/60)
Email verified: bg-emerald-500 dot
Email guessed: bg-amber-400 dot
Email scraped: bg-violet-400 dot
Red flags: border-red-200/bg-red-50/text-red-700

### Radius
Scale: rounded (4px), rounded-md (6px)
Small elements (badges, tags, pills): rounded (4px)
Cards, buttons: rounded-md (6px)

### Typography
Body: text-[13px], leading-normal
Labels/meta: text-[12px], text-[11px]
Section headers: text-[11px] font-medium uppercase tracking-wide text-muted-foreground
IDs: font-mono text-[11px]
Data numbers: tabular-nums
H1: text-[15px] font-semibold tracking-tight

---

## Patterns

### Button
Height: h-7 (compact) or h-8 (standard)
Padding: px-3
Font: text-[12px] or text-[13px]
Primary: solid background, no shadow
Ghost: transparent, hover:bg-muted/30

### Table
Header: text-[11px] font-medium uppercase tracking-wide text-muted-foreground, border-b
Cell padding: px-3 py-2
Row: border-b, hover:bg-muted/20, transition-colors
Action icons: opacity-0 group-hover:opacity-100 (reveal on hover)
Font: text-[13px]

### Score pill
Height: h-5, min-w-[24px]
Radius: rounded (4px)
Font: text-[11px] font-semibold tabular-nums
Colors: emerald/amber/red based on threshold (8+/6-7/0-5)

### Email confidence
Colored dot (h-2 w-2 rounded-full) before email address
emerald = verified, amber = guessed, violet = scraped

### Run status
Colored dot (h-1.5 w-1.5) + muted label text
No badge padding — inline text pattern

### Pipeline tracker
Vertical node list with step indicator (4x4 rounded-sm bordered box)
Icons: Check (done), Loader2 animate-spin (active), step number (pending)
Result data inline as muted text next to node label

### Section header
text-[11px] font-medium uppercase tracking-wide text-muted-foreground
mb-2 or mb-3

### Filter bar
px-4 py-2 border-b
h-7 inputs with text-[13px]

### Pagination
border-t px-3 py-2, Ghost buttons h-7, tabular-nums count

### Tab bar
Underline style: border-b-2 border-transparent → border-foreground (active)
No background highlight on active tab
text-[13px] font-medium

### Card / section surface
Rounded border (no shadow)
Padding: p-4 or p-5
Same background as page canvas — borders define structure

---

## Column Decisions (Tables)

### Companies table — show only:
Name, City+State, Industry, Technologies (max 2 tags), Source badge
Actions (website + linkedin icons, reveal on hover)
Hidden: phone, full_address, zip_code, instagram, facebook, domain_age_days, timestamps, run_id

### Leads table — show only:
Name + Title (stacked), Company, Email + confidence dot, Score pill, Status (inline select), Actions
Hidden in row (expandable): score_reason, bant, red_flags, suggested_angle, email templates, follow_ups, phone, instagram, hubspot_contact_id, timestamps

### Expandable lead panel shows:
score_reason, suggested_angle, BANT grid, red_flags, email_subject + email_body

---

## Decisions Log

| Decision | Rationale |
|---|---|
| Borders-only depth | Dense tool — information > visual lift |
| 4px base spacing | Power user density, no wasted space |
| text-[13px] body | Readable at density, matches professional tools |
| Colored dot for email confidence | Less space than badge, tooltip on hover |
| Run status as dot+text | No badge padding in constrained sidebar |
| Expandable lead rows | Rich intelligence without cluttering the table |
| Tab underline style | Cleaner than background-highlight at this density |
| Action icons reveal on hover | Reduces visual noise, expert UX pattern |
| Score pill 4px radius | Technical/precise, not friendly/rounded |
