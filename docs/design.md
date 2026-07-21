---
name: Neev FLN
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#41474e'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#72787f'
  outline-variant: '#c1c7cf'
  surface-tint: '#30628a'
  primary: '#30628a'
  on-primary: '#ffffff'
  primary-container: '#a2d2ff'
  on-primary-container: '#275b82'
  inverse-primary: '#9bcbf8'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#5d5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#cdcdcd'
  on-tertiary-container: '#555757'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cde5ff'
  primary-fixed-dim: '#9bcbf8'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#104a70'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Noto Sans
    fontSize: 57px
    fontWeight: '400'
    lineHeight: 64px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: Noto Sans
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  headline-md:
    fontFamily: Noto Sans
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 36px
  title-lg:
    fontFamily: Noto Sans
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.15px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.5px
  body-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.25px
  label-lg:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.5px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is built on the principles of Material Design 3, tailored specifically for the educational assessment environment. The brand personality is supportive, stable, and focused, aiming to reduce the "test anxiety" often associated with school assessments. 

The aesthetic follows a **Corporate / Modern** approach with a softer, friendlier edge. By utilizing heavy whitespace and a calm color palette, the UI ensures that the cognitive load remains on the educational content rather than the interface itself. The goal is to evoke a sense of professional reliability for teachers while providing a gentle, inviting workspace for foundational learners.

## Colors

The palette is intentionally restrained to maintain focus and clarity. 

- **Primary:** Pastel Blue (#A2D2FF) is used for key actions, progress indicators, and active states. It provides a calming yet distinct accent.
- **Secondary/Text:** Deep Charcoal (#212121) ensures high legibility and an authoritative feel for instructional text and data.
- **Background:** Soft Off-White (#FAFAFA) serves as the base layer, reducing eye strain compared to pure white.
- **Surface/Borders:** Muted Gray (#E0E0E0) is used for structural boundaries, dividers, and inactive states, providing subtle definition without visual clutter.

## Typography

The design system utilizes **Noto Sans** (a highly legible alternative to Roboto that shares its clean, humanist qualities) to ensure maximum readability across varying literacy levels. 

Headlines are kept large and rhythmic to clearly signal the start of new assessment sections. Body text uses generous line heights (1.5x) to prevent crowding of text strings, which is essential for early readers. For mobile screens, headlines scale down to prevent awkward line breaks while maintaining a clear hierarchy. All labels use medium weights to distinguish them from standard body copy.

## Layout & Spacing

The layout follows a **Fluid Grid** model centered on an 8px rhythmic scale. 

- **Mobile:** 4-column grid with 16px side margins and 16px gutters.
- **Tablet/Desktop:** 12-column grid with 24px gutters and expanded margins (up to 64px) to keep content containers focused in the center of the screen.

Spacing is used aggressively to create "islands of information." Every assessment module or student profile should be separated by at least 32px (xl) to ensure the interface feels airy and approachable.

## Elevation & Depth

This design system utilizes **Tonal Layers** rather than heavy shadows to indicate depth, adhering to the MD3 "Flat" evolution. 

- **Level 0 (Base):** Off-white background (#FAFAFA).
- **Level 1 (Cards):** Surface color at 100% opacity with a subtle 1px border in Muted Gray (#E0E0E0).
- **Level 2 (Interactive):** When a card or button is hovered or active, it gains a soft, highly diffused ambient shadow (Color: #212121, Opacity: 4%, Blur: 12px) to suggest tactility.

Avoid using dark or heavy shadows; the goal is a "paper-on-paper" look where elements are distinguished by borders and slight tonal shifts.

## Shapes

The shape language is defined by high-radius corners to reinforce the "friendly" brand personality. 

- **Cards:** Use a mandatory 24px (`rounded-xl` / 1.5rem) corner radius.
- **Buttons:** Use fully rounded (pill-shaped) corners to signify high interactivity.
- **Inputs:** Use 8px (`rounded-md`) corners to maintain a professional, structured feel for data entry fields.

## Components

### Cards
Cards are the primary container for assessment tasks. They must have a 24px corner radius, a 1px Muted Gray border, and no shadow in their default state. Padding inside cards is generous (minimum 24px).

### Buttons
- **Primary:** Filled with Pastel Blue (#A2D2FF), text in Deep Charcoal (#212121). Pill-shaped.
- **Secondary:** Outlined with a 1px Muted Gray border. Pill-shaped.

### Input Fields
Outlined style only. The border remains Muted Gray when inactive and turns Pastel Blue when focused. Labels should always be visible (not just placeholders) to assist teachers during rapid data entry.

### Icons
Use simple, thin-stroke line art (2px stroke weight). Icons should be monochromatic (Deep Charcoal) to ensure they are seen as functional tools rather than distracting illustrations.

### Progress Indicators
Linear progress bars use a Muted Gray track with a Pastel Blue fill. They should have rounded end-caps to match the overall shape language.

### Chips
Used for student tags or assessment categories. These should have a 1px border and 8px rounded corners, with a light Pastel Blue background when selected.