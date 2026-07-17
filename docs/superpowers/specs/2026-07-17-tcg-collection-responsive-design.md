# TCG Collection Responsive UX Design

## Status

Approved design direction: responsive refinement of the existing page, not a visual redesign.

## Goal

Make `/tcg/collection` substantially easier to use at narrow widths while retaining its current composition, information architecture, PrimeDex palette, typography, pixel shadows, and TCG-oriented visual language.

The first-read hierarchy remains:

1. collection overview and overall progress;
2. progress and missing-card context for active sets;
3. per-set progress and navigation;
4. search, sorting, and in-progress filtering.

## Current surface to preserve

The page keeps the existing sequence and responsibilities:

- `TCGPageTabs` for TCG section navigation;
- the page title and subtitle;
- `TCGCollectionOverview` recap hero;
- `TCGActiveSetInsights` for active sets;
- the existing statistics block;
- the per-set search, sort, and in-progress controls;
- the existing set list and links to set albums.

The implementation should reuse the existing primitives, store selectors, translations, progress calculation, and TCG image helpers. No API, backend, Expo, CSP, or dependency changes are part of this work.

## Responsive layout

### Page shell

- Keep the existing page shell and header offset.
- Use fluid horizontal gutters that remain usable at 320px and do not create a second horizontal scroll region.
- Keep the desktop max-width and section spacing unchanged except where a child needs to shrink or wrap.

### Navigation tabs

- Preserve the current two-column mobile grid and inline desktop layout.
- Keep each tab at least 44px high.
- Allow translated labels to wrap within their grid cell rather than forcing overflow.

### Overview and statistics

- Preserve the current recap hero and statistic cards.
- Keep the primary metrics readable at narrow widths by using a two-column layout on small screens and the existing wider layout at larger breakpoints.
- Avoid duplicated visual emphasis: the recap remains the strongest block, while the existing statistics stay secondary through spacing and surface treatment.
- Make progress numbers and labels wrap safely rather than clipping.

### Active set insights

- Preserve the existing active-set insight cards and their value/top-missing content.
- Use one column below the desktop split breakpoint and two columns when there is enough room.
- Keep the set header, progress bar, value details, and missing-card strip inside the card without min-width assumptions.
- Preserve the horizontal missing-card strip, but add a clear visual affordance and accessible names for each card link.
- Keep loading and error states within the card footprint to reduce layout shift and make delayed data understandable.

### Set controls

- Preserve the current search, sort, and in-progress filter controls.
- On narrow screens, make the controls full-width or distribute them in a predictable stack; do not squeeze them into a single row.
- Keep the search field and select at least 44px high, with visible labels or accessible names.
- Make the in-progress filter a full-width or flexing button on mobile, with a clear pressed state.
- On wider screens, return to the current horizontal toolbar arrangement.

### Set rows

- Preserve the current list-row appearance, logo, progress bar, completion badge, and active-set action.
- Let the row use a two-part layout at comfortable widths and stack its trailing content below the set name/progress at narrow widths.
- Ensure the logo can shrink without forcing the text column wider than the viewport.
- Keep the set name readable and allow wrapping when a translation or long set name cannot fit.
- Replace the current nested interactive structure with a row layout containing a set navigation link and an independent active-set button. Both controls must remain easy to tap.
- Keep the entire visual row discoverable as a set entry without making the action button part of the link target.
- Display the missing count alongside progress using existing collection data; this supports the page goal without fetching every set’s cards.

## Interaction and accessibility

- Use `touch-target`/existing button primitives so visible controls reach 44×44px.
- Keep a visible focus ring and a non-hover active/pressed state.
- Replace `transition-all` in touched components with the individual animated properties.
- Keep `touch-action: manipulation` on controls and respect `prefers-reduced-motion` through existing global behavior.
- Add semantic labels to search, sort, filter, set navigation, and active-set controls.
- Announce meaningful filter-result changes if the set list changes while focus remains in the toolbar.
- Do not rely on color alone to communicate complete/in-progress/missing status; retain text and numeric progress.

## Loading, empty, and error states

- Keep the existing query and data sources.
- Replace the page-level indefinite spinner with a stable skeleton or reserved loading block that matches the current layout.
- Keep the empty filtered-list state actionable with clear copy and a way to reset the current filter/search.
- Keep active-set fetch errors local to the affected insight card and readable at all widths.

## Performance

- Do not introduce new dependencies or a new data request for the overview.
- Preserve lazy loading for below-the-fold images and reserve image dimensions.
- Avoid rendering/layout work that depends on measuring the viewport in JavaScript; use responsive CSS and flex/grid constraints.

## Validation plan

Automated tests should cover:

- responsive tab/control classes and 44px minimum controls;
- the set row’s non-nested interactive controls;
- missing-count rendering and complete/in-progress semantics;
- accessible names and focus states for search, sort, filter, links, and buttons;
- stable loading and empty states.

Manual validation should cover `/tcg/collection` at 320, 375, 414, 768, and desktop widths in both themes. For every width, confirm there is no horizontal document overflow, no clipped control text, no target smaller than 44×44px, and no console errors from React or Base UI.

## Out of scope

- Reordering the page into a new dashboard concept;
- replacing the PrimeDex visual language;
- changing the per-set album route;
- changing TCG APIs, state schema, authentication, backend, CSP, or the Expo application;
- adding new packages.
