# Formatting Review -- v1

## Scores

| Dimension | Weight | Score | Weighted |
|---|---|---|---|
| Heading hierarchy | 1x | 9 | 9 |
| Code formatting | 1x | 4 | 4 |
| CTA placement | 2x | 4 | 8 |
| SEO readiness | 1x | 7 | 7 |
| Link strategy | 1x | 3 | 3 |
| Editorial compliance | 2x | 6 | 12 |
| Brand standards | 1x | 7 | 7 |
| Word count | 1x | 9 | 9 |
| **Total** | | | **59 / 100** |

**Normalized score: 5.9 / 10**

## Line-level feedback

### Heading hierarchy (9/10)
- All sections use H2, subsections use H3 -- clean cascade with no H1 in body.
- Sentence case used correctly throughout.
- Minor: "Running PoC tests" (line 102) -- "PoC" is fine as an established abbreviation in the heading.

### Code formatting (4/10)
- Code blocks are properly fenced with language specifiers (dockerfile, nginx, bash, mermaid) and contain real, runnable code.
- **Major issue:** Inline backticks appear extensively throughout the prose. The rubric requires no backticks. Violations on lines:
  - Line 15: `nginx:alpine`
  - Line 18: random UIDs
  - Line 19: `index.html`
  - Line 50: `CrashLoopBackOff`, `ubi9/nginx-124`
  - Line 52: `ubi9/ubi-minimal`, `microdnf install -y nginx`
  - Line 77: `try_files`, `/tmp/`
  - Line 91: `/health`
  - Line 104: `urllib.request`
  - Line 117: `ubi9/nginx-124`, `ubi9/ubi-minimal`, `oc new-app`
  - Line 119: `/tmp/`, `chmod g=u`
- **Fix:** Replace all inline backticks with monospace formatting or italics, or rewrite to avoid quoting code inline.

### CTA placement (4/10)
- CTA appears only at the end ("Try it yourself", line 123). No CTA near the top or mid-article.
- **Fix:** Add a brief CTA after the introduction (line 3) linking to Red Hat OpenShift, e.g., "Get started with Red Hat OpenShift to host your own AI-powered frontends." Add a mid-article CTA after the deployment section (around line 100) linking to OpenShift developer resources.
- End-of-post CTA links to GitHub and Quay, not to redhat.com -- should include at least one redhat.com link.

### SEO readiness (7/10)
- Title is 57 characters ("Deploying an AI-powered React SPA on OpenShift with UBI images") -- within the 50-60 char target.
- Primary keywords "OpenShift" and "UBI" appear in both title and first paragraph.
- "React SPA" keyword present in title.
- Could strengthen by including "Red Hat" in the title or first sentence for brand SEO.

### Link strategy (3/10)
- **Major issue:** Zero links to redhat.com. All external links point to github.com (lines 127, 129) and quay.io (line 128).
- **Fix:** Add links to:
  - Red Hat OpenShift product page
  - UBI documentation on redhat.com
  - Red Hat Developer portal
  - OpenShift BuildConfig documentation
- No competitor links (good), but the absence of any internal redhat.com links is a significant gap.

### Editorial compliance (6/10)
- **Oxford commas:** Consistently used -- "worldbuilding, character profiles, plot outlines, and full chapter text" (line 7); "Google Gemini, Anthropic Claude, OpenAI, and any..." (line 7). Good.
- **Contractions:** Used aggressively -- "can't" (lines 15, 18), "There's" (line 9), "doesn't" (line 50), "you'd" (line 121), "didn't" (line 50). Good.
- **Product names:** "Red Hat Universal Base Images" fully expanded on first use (line 15). "OpenShift" used consistently. Good.
- **Acronym expansion failures:**
  - "SPA" never expanded. First use in body is "React SPA" (title and line 3). Must expand as "single-page application (SPA)" on first use.
  - "LLM" not expanded on first use (line 3: "LLM APIs"). Must expand as "large language model (LLM)".
  - "UID" not expanded (line 18: "random UIDs"). Must expand as "user ID (UID)".
  - "API" not expanded (appears throughout). Must expand as "application programming interface (API)" on first use.
  - "S2I" correctly expanded on first use (line 50). Good.
  - "UBI" correctly expanded on first use (line 15). Good.
- **Em dashes:** None found. Good.
- **Numerals:** "three things" on line 13 should be "3 things" per the rubric.

### Brand standards (7/10)
- Mermaid diagram uses Red Hat brand colors (#EE0000 primary, #A30000 border) -- good attention to detail.
- No explicit font references, but this is acceptable for markdown source.
- No non-brand visual elements.
- The post doesn't reference any competitor platforms negatively.

### Word count (9/10)
- 990 words -- squarely within the 800-1300 word target for tutorials.
- Well-paced; no sections feel padded or rushed.

## Editorial compliance checklist

| Rule | Status |
|---|---|
| Sentence case headings | Pass |
| Oxford commas always | Pass |
| No backticks | **FAIL** -- 15+ inline backtick instances |
| Full product name first mention | Pass (UBI, OpenShift) |
| Lowercase component descriptors | Pass |
| No H1 in body | Pass |
| Expand acronyms on first use | **FAIL** -- SPA, LLM, UID, API not expanded |
| Use contractions aggressively | Pass |
| Numerals in running text | **FAIL** -- "three things" on line 13 |
| No em dashes | Pass |

## Summary

The draft has strong structural formatting -- clean heading hierarchy, appropriate word count, and proper section flow matching the abstract. The two most impactful issues to fix are:

1. **Remove all inline backticks** (affects Code formatting score). Rewrite technical terms as monospace or integrate them naturally into prose. This is a strict editorial requirement.
2. **Add CTA placements and redhat.com links** (affects CTA placement and Link strategy scores, weighted heavily). The post needs at least 2 additional CTAs linked to redhat.com properties and internal links to UBI/OpenShift documentation.

Secondary fixes: expand all acronyms on first use (SPA, LLM, UID, API) and change "three things" to "3 things."
