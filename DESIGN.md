---
name: Lumaid
description: Modern school management platform with warm, approachable design
colors:
  primary: "#1a2744"
  primary-light: "#2d4a6f"
  accent: "#e07a5f"
  accent-hover: "#c96a52"
  accent-light: "#f4a889"
  cream: "#f9f7f2"
  cream-dark: "#e8e4db"
  sage: "#7d9a7c"
  sage-light: "#a8c4a7"
  coral: "#ff6b6b"
  gold: "#f4a261"
  text-primary: "#1a1a2e"
  text-secondary: "#4a4a5e"
  text-muted: "#8b8b9e"
  text-inverse: "#ffffff"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Outfit, sans-serif"
    fontWeight: 400
rounded:
  xl: "1rem"
  "2xl": "1.5rem"
  "3xl": "2rem"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.primary}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.text-inverse}"
    rounded: "{rounded.xl}"
---

# Design System: Lumaid

## 1. Overview

**Creative North Star: "The Welcome Classroom"**

Lumaid's design system channels the feeling of a well-organized, supportive classroom—familiar without being institutional, efficient without being cold. The interface balances academic seriousness with genuine warmth, using clarity as its primary tool. Complex information (grades, schedules, attendance) becomes instantly scannable through thoughtful hierarchy, not heavy-handed styling.

This system rejects three common patterns: **Boring Enterprise** software (stiff grids, generic navy blues, no personality), **SaaS Cliché** (purple gradients everywhere, cartoonish 3D illustrations, overdone glassmorphism), and **dated platforms like Canvas/Blackboard** (cluttered dashboards, confusing navigation). Instead, it favors contemporary restraint—soft shadows, generous spacing, and color used deliberately for function, not decoration.

**Key Characteristics:**
- Warm cream backgrounds that feel paper-like, not clinical
- Coral accent that guides attention without shouting
- Soft, diffuse shadows that create gentle depth
- Typography that's confident without being aggressive
- Generous white space that lets content breathe

## 2. Colors

A functional palette rooted in clarity and warmth. Colors serve information hierarchy first, mood second.

### Primary
- **Deep Navy** (#1a2744): Primary text, headers, and interactive elements. Carries authority without feeling institutional. Used for links, icons, and primary actions in neutral contexts.

- **Navy Light** (#2d4a6f): Hover states for navy elements, secondary text hierarchy. Maintains the primary hue while stepping down in weight.

### Accent
- **Warm Coral** (#e07a5f): Primary actions, notifications, emphasis states. The "one voice" of the interface—used sparingly so its rarity carries meaning. Never applied to large surface areas.

- **Coral Hover** (#c96a52): Active and focus states for coral buttons/links.

- **Coral Light** (#f4a889): Backgrounds for coral-adjacent content, subtle highlights.

### Neutral
- **Cream Base** (#f9f7f2): Primary background. The canvas everything sits on—warm enough to feel paper-like, light enough to stay receded.

- **Cream Dark** (#e8e4db): Borders, dividers, subtle backgrounds. Creates structure without harsh lines.

- **Text Primary** (#1a1a2e): Body text, primary labels. Near-black tinted slightly warm for reduced eye strain.

- **Text Secondary** (#4a4a5e): Supporting text, descriptions, secondary labels.

- **Text Muted** (#8b8b9e): Placeholder text, timestamps, metadata.

- **Text Inverse** (#ffffff): Text on dark backgrounds, button labels.

### Supporting
- **Sage** (#7d9a7c): Success states, positive indicators, present attendance. Calming without being sterile green.

- **Sage Light** (#a8c4a7): Backgrounds for sage-related content.

- **Coral Bright** (#ff6b6b): Urgent states, critical notifications, absent attendance.

- **Gold** (#f4a261): Warning states, pending items, late assignments.

### Named Rules
**The One Voice Rule.** Coral accent appears on ≤10% of any given screen. Its rarity is the point—overuse dilutes its guidance function.

**The No-Black Rule.** Pure black (#000) and pure white (#fff) are prohibited. Always tint toward warmth: primaries toward navy, neutrals toward cream.

## 3. Typography

**Display Font:** Syne (sans-serif fallback)
**Body Font:** Outfit (sans-serif fallback)

**Character:** Syne brings confident character to headlines without being academic-stodgy. Outfit handles body text with warmth and excellent readability. The pairing feels contemporary but grounded—friendly without being childish.

### Hierarchy
- **Display** (700, clamp(2rem, 5vw, 3rem), 1): Hero headings, welcome messages, page titles. Appears only once per screen at most.

- **Headline** (700, 1.5rem, 1.2): Section headers, card titles, modal titles. Bold but not shouting.

- **Title** (600, 1.125rem, 1.4): Card subheadings, list item titles, form section labels. Semibold for hierarchy.

- **Body** (400, 1rem, 1.6): Primary content, descriptions, form labels. Capped at 75ch for readability.

- **Label** (500, 0.875rem, 1.4): Small text, metadata, timestamps, button labels.

### Named Rules
**The One Display Rule.** Display weight appears once per screen maximum. If everything is bold, nothing is bold.

## 4. Elevation

This system uses soft, diffuse shadows to create gentle depth—surfaces feel lifted, not floating. Elevation responds to state: hover, focus, drag, and active states receive shadow; rest states stay relatively flat.

### Shadow Vocabulary
- **Soft** (`0 4px 20px rgba(26, 39, 68, 0.08)`): Default card elevation, subtle depth for containers at rest.

- **Medium** (`0 8px 30px rgba(26, 39, 68, 0.12)`): Hover states for cards, dropdowns, tooltips.

- **Strong** (`0 12px 40px rgba(26, 39, 68, 0.16)`): Modals, focused panels, dragged elements.

- **Glow** (`0 0 40px rgba(224, 122, 95, 0.15)`): Coral-accented elements, primary CTAs, notification badges.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus). Nothing sits permanently floating.

**The No-Glassmorphism Rule.** Backdrop blur and glass effects are reserved for specific contexts (sidebar, modal overlays). Never used decoratively on random cards.

## 5. Components

### Buttons
- **Shape:** Generously rounded (1rem / 16px radius) for approachability
- **Primary:** Coral background (#e07a5f), white text, 12px vertical × 24px horizontal padding. Hover shifts to coral-hover (#c96a52) with subtle lift (-0.5px translateY).
- **Secondary:** Cream background (#f9f7f2), navy text, 2px navy border. Hover lifts slightly and border intensifies to 20% opacity.
- **Ghost:** Transparent background, navy text. Hover fills with navy at 5% opacity.
- **Transitions:** 300ms ease-out on all state changes. No bounce, no elastic curves.

### Chips / Badges
- **Style:** Full-pill rounded (9999px), colored background with matching text
- **Success:** Sage background (#7d9a7c at 20% opacity), sage text, sage dot indicator
- **Warning:** Gold background (#f4a261 at 20% opacity), gold text
- **Error:** Coral bright background (#ff6b6b at 20% opacity), coral bright text
- **Info:** Navy light background (#2d4a6f at 20% opacity), navy light text

### Cards / Containers
- **Corner Style:** Extra-rounded (1rem / 16px radius)
- **Background:** White (#ffffff) for primary cards, cream for nested containers
- **Shadow Strategy:** Soft shadow at rest, medium on hover
- **Border:** Subtle cream-dark (#e8e4db) at 1px
- **Internal Padding:** 24px (1.5rem) standard, 16px for dense information displays

### Inputs / Fields
- **Style:** 2px cream-dark border, 50% opacity cream background, extra-rounded corners (1rem)
- **Focus:** Border shifts to coral at 50% opacity, background resolves to white, soft shadow appears
- **Error:** Red-orchid border (#ff6b6b), error text appears below field
- **Disabled:** 30% opacity, no hover states

### Navigation
- **Sidebar:** Glassmorphism is appropriate here (white at 80% opacity with backdrop blur). Fixed 288px width, extra-rounded container (1.5rem), floating 16px from viewport edge.
- **Nav Items:** Default state is navy at 70% opacity, pill-shaped container on hover (navy at 5% background). Active state gets coral accent bar on left edge and coral text color.
- **Mobile:** Sidebar collapses to off-canvas; hamburger button triggers slide-in with backdrop.

### Stat Cards
- **Purpose:** Dashboard metrics (grades, attendance, pending tasks)
- **Style:** White background, soft shadow, gradient-tinted background based on data type (blue, green, coral, sage)
- **Content:** Icon in colored container, label small and muted, value large and display-weight
- **Trend:** Optional percentage change with directional arrow

## 6. Do's and Don't

### Do:
- **Do** use cream (#f9f7f2) as the primary background canvas. It's warm and paper-like, not clinical.
- **Do** reserve coral (#e07a5f) for primary actions and emphasis states. Its rarity is what makes it effective.
- **Do** use soft shadows (0 4px 20px with 8% opacity) for default elevation. Strong shadows feel heavy.
- **Do** cap body text at 75 characters per line. Longer lines hurt readability.
- **Do** use extra-rounded corners (1rem / 16px) on cards and buttons. It feels friendlier than sharp edges.
- **Do** include empty states with helpful illustrations and next-step CTAs. Don't leave users staring at blank space.
- **Do** use sage for success states and present attendance. Calming without being institutional green.

### Don't:
- **Don't** use pure black (#000) or pure white (#fff). Always tint toward warmth.
- **Don't** apply glassmorphism decoratively. Reserve it for specific contexts (sidebar, modals).
- **Don't** use coral on more than 10% of any screen. It loses meaning when everywhere.
- **Don't** use gradient text. It's decorative, not meaningful. Use weight or size for emphasis.
- **Don't** create nested cards. Cards inside cards always look wrong.
- **Don't** use side-stripe borders (border-left greater than 1px as a colored accent). Use full borders, background tints, or leading icons instead.
- **Don't** animate CSS layout properties. Use transforms and opacity for smooth 60fps motion.
- **Don't** use generic SaaS patterns—purple gradients, cartoonish 3D illustrations, or overdone glassmorphism. This is "Not SaaS Cliché" from PRODUCT.md.
- **Don't** feel like "Boring Enterprise" software—stiff grids, generic blues, no personality.
- **Don't** look like Canvas/Blackboard—dated interfaces, cluttered dashboards, confusing navigation.
