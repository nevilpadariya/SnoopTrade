# SnoopTrade Theme System Guide

## Overview
This document describes the complete theming system for SnoopTrade, including light/dark mode implementation, color tokens, and usage guidelines.

## Brand Color
- **Primary Brand Color**: `#cce8b5` (soft green)
- **Usage**: Accents, primary actions, brand elements

## Color System

### Light Theme (`:root`)
```css
--background: 120 20% 98%        /* Page background - light green-tinted */
--foreground: 120 10% 12%        /* Primary text - dark */
--card: 0 0% 100%                /* Card backgrounds - white */
--card-foreground: 120 10% 12%  /* Card text - dark */
--muted: 110 25% 92%             /* Muted backgrounds */
--muted-foreground: 120 6% 45%   /* Muted text */
--border: 110 18% 85%            /* Border color */
--input: 110 18% 85%             /* Input borders */
--primary: 95 45% 82%            /* #cce8b5 brand color */
--primary-foreground: 120 20% 15% /* Text on primary */
--accent: 95 35% 70%             /* Accent color */
--accent-foreground: 120 20% 15% /* Text on accent */
--ring: 95 45% 82%               /* Focus ring */
```

### Dark Theme (`.dark`)
```css
--background: 120 10% 10%        /* Page background - very dark */
--foreground: 120 10% 95%        /* Primary text - light */
--card: 120 10% 14%              /* Card backgrounds - dark */
--card-foreground: 120 10% 95%  /* Card text - light */
--muted: 120 8% 20%              /* Muted backgrounds */
--muted-foreground: 120 5% 65%   /* Muted text */
--border: 120 8% 25%             /* Border color */
--input: 120 8% 25%              /* Input borders */
--primary: 95 35% 70%            /* Adjusted brand color for dark */
--primary-foreground: 120 20% 10% /* Text on primary */
--accent: 95 30% 60%             /* Accent color */
--accent-foreground: 120 20% 10% /* Text on accent */
--ring: 95 35% 70%               /* Focus ring */
```

## Usage Guidelines

### Page Layouts
```tsx
// Always use bg-background for page wrappers
<div className="min-h-screen bg-background">
  {/* Content */}
</div>
```

### Cards and Containers
```tsx
// Use card colors with proper borders
<Card className="p-6 bg-card border-border">
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Text Colors
```tsx
// Primary text
<h1 className="text-foreground">Heading</h1>

// Muted/secondary text
<p className="text-muted-foreground">Description</p>

// On cards
<h2 className="text-card-foreground">Card Title</h2>
```

### Buttons (Primary Actions)
```tsx
// Primary button (uses brand color)
<Button variant="default">
  Action
</Button>

// Ghost/secondary button
<Button variant="ghost">
  Secondary
</Button>

// Outline button
<Button variant="outline">
  Outline
</Button>
```

### Icons and Accents
```tsx
// Brand color for icons
<TrendingUp className="text-primary" />

// Accent icons
<Shield className="text-accent" />

// Icon backgrounds
<div className="bg-primary/20 text-primary p-3 rounded-xl">
  <Icon />
</div>
```

### Form Inputs
```tsx
// Inputs automatically use border and background tokens
<Input 
  className="bg-card border-border focus:ring-primary"
  placeholder="Search..."
/>
```

### Borders and Dividers
```tsx
// Use border token for consistency
<div className="border border-border rounded-lg">
  {/* Content */}
</div>
```

## Theme Toggle Implementation

The Navbar component includes a theme toggle that:
1. Checks localStorage for saved preference
2. Falls back to system preference (`prefers-color-scheme`)
3. Toggles the `.dark` class on `document.documentElement`
4. Persists choice to localStorage

```tsx
const toggleTheme = () => {
  const newTheme = !isDark;
  setIsDark(newTheme);
  
  if (newTheme) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};
```

## Component Guidelines

### ✅ DO
- Use semantic color tokens (`bg-background`, `text-foreground`)
- Use primary color for brand elements and main actions
- Use muted colors for secondary content
- Test components in both light and dark mode
- Use `transition-colors` for smooth theme changes

### ❌ DON'T
- Hardcode hex colors in components
- Use primary color for large background areas
- Forget to test dark mode
- Use arbitrary color values

## Responsive Design

All components use Tailwind breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

Example:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Responsive grid */}
</div>
```

## Chart Colors

For data visualization, use theme-aware colors:
```tsx
const COLORS = {
  price: 'hsl(var(--primary))',
  volume: 'hsl(var(--accent))',
  forecast: '#ef4444',
  trend: '#f97316',
  seasonal: '#3b82f6',
};
```

## Accessibility

- All color combinations meet WCAG AA contrast standards
- Focus rings use the `ring` token
- Interactive elements have clear hover states
- Dark mode maintains proper contrast ratios

## Testing Checklist

When implementing new components:
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Uses semantic color tokens only
- [ ] Responsive on mobile/tablet/desktop
- [ ] Proper hover/focus states
- [ ] No hardcoded colors
- [ ] Icons use appropriate colors
- [ ] Cards have proper borders and backgrounds

