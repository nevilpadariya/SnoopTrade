# Tailwind CSS Patterns & Best Practices

## 🎨 Production-Ready Styling Guide

This document shows all the Tailwind utility patterns used throughout the SnoopTrade frontend refactoring.

---

## 1. Layout Patterns

### Container & Spacing
```tsx
// Standard container with responsive padding
<div className="container mx-auto px-4 lg:px-8 pt-20 pb-16">
  {/* Content */}
</div>

// Full-width section with padding
<section className="py-16 px-4 md:px-8">
  {/* Content */}
</section>

// Centered content with max width
<div className="max-w-7xl mx-auto">
  {/* Content */}
</div>
```

### Responsive Grids
```tsx
// Single column mobile, 2 on tablet, 3 on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
  {/* Items */}
</div>

// Responsive flex layout
<div className="flex flex-col md:flex-row items-center gap-12">
  {/* Items */}
</div>

// Auto-fit grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {/* Cards */}
</div>
```

### Flexbox Patterns
```tsx
// Centered content
<div className="flex items-center justify-center min-h-screen">
  {/* Centered content */}
</div>

// Space between
<div className="flex items-center justify-between">
  <div>Left</div>
  <div>Right</div>
</div>

// Vertical stack with spacing
<div className="flex flex-col gap-4">
  {/* Items with consistent gaps */}
</div>
```

---

## 2. Card Patterns

### Standard Card
```tsx
<Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 
                 border-accent/20 backdrop-blur-sm">
  <CardHeader className="space-y-1 pb-4">
    <CardTitle className="text-2xl font-bold text-white font-display">
      Title
    </CardTitle>
    <p className="text-sm text-white/60">
      Description
    </p>
  </CardHeader>
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>
```

### Hover Effect Card
```tsx
<Card className="bg-gradient-to-br from-accent/10 via-transparent to-black/20 
                 border-accent/20 
                 hover:-translate-y-2 
                 transition-transform duration-300 
                 shadow-lg hover:shadow-2xl">
  {/* Content */}
</Card>
```

### Feature Card
```tsx
<Card className="p-6 h-full 
                 bg-gradient-to-br from-accent/10 via-transparent to-black/20 
                 border-accent/20 
                 hover:-translate-y-2 
                 transition-transform duration-300">
  <CardContent className="p-0">
    <div className="inline-flex p-3 rounded-xl bg-accent/10 text-accent mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-white mb-3 font-display">
      {title}
    </h3>
    <p className="text-white/70 leading-relaxed">
      {description}
    </p>
  </CardContent>
</Card>
```

---

## 3. Typography Patterns

### Headings
```tsx
// Page title
<h1 className="text-5xl md:text-6xl font-extrabold text-center mb-16 font-display">
  Title
</h1>

// Section title
<h2 className="text-4xl md:text-5xl font-bold text-center mb-12 font-display">
  Section Title
</h2>

// Card title
<h3 className="text-2xl font-bold text-white mb-4 font-display">
  Card Title
</h3>

// Small heading
<h4 className="text-lg font-semibold text-white mb-2">
  Small Heading
</h4>
```

### Text Gradients
```tsx
// Gradient text
<span className="bg-gradient-to-r from-accent via-accent to-green-300 
                 bg-clip-text text-transparent">
  Gradient Text
</span>

// Logo gradient
<span className="text-xl font-bold font-display 
                 bg-gradient-to-r from-white via-white to-accent 
                 bg-clip-text text-transparent">
  SnoopTrade
</span>
```

### Body Text
```tsx
// Primary text
<p className="text-white leading-relaxed">
  Primary content
</p>

// Secondary text
<p className="text-white/70 text-sm">
  Secondary content
</p>

// Muted text
<p className="text-white/60 text-xs">
  Muted content
</p>
```

---

## 4. Button Patterns

### Primary Button
```tsx
<Button 
  className="bg-accent hover:bg-accent/90 text-white 
             px-8 py-3 text-lg font-semibold 
             transition-all hover:shadow-lg hover:shadow-accent/40">
  Click Me
</Button>
```

### Outline Button
```tsx
<Button 
  variant="outline"
  className="text-white border-white/50 
             hover:border-accent hover:text-accent hover:bg-accent/10">
  Learn More
</Button>
```

### Icon Button
```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8 text-white hover:text-accent hover:bg-accent/10">
  <ChevronRight className="h-4 w-4" />
</Button>
```

### Button Group
```tsx
<div className="inline-flex rounded-lg border border-accent/30 bg-black/30 p-1 space-x-1">
  <Button
    variant={selected ? "default" : "ghost"}
    className={selected 
      ? 'bg-accent text-white' 
      : 'text-white hover:bg-accent/20'}>
    Option
  </Button>
</div>
```

---

## 5. Form Patterns

### Input Field
```tsx
<div className="space-y-2">
  <Label htmlFor="email" className="text-white">
    Email
  </Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
    className="h-11 bg-white/10 border-accent/30 text-white 
               placeholder:text-gray-400 
               focus-visible:ring-accent"
  />
</div>
```

### Password Input with Toggle
```tsx
<div className="relative">
  <Input
    type={showPassword ? 'text' : 'password'}
    className="h-11 pr-10 bg-white/10 border-accent/30 text-white"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 
               text-gray-400 hover:text-white transition-colors">
    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
  </button>
</div>
```

### Select Dropdown
```tsx
<select className="bg-gray-800 text-white 
                   border border-accent/30 rounded 
                   px-2 py-1 
                   focus:outline-none focus:ring-2 focus:ring-accent">
  <option value="10">10</option>
  <option value="25">25</option>
  <option value="50">50</option>
</select>
```

### Error State
```tsx
<Input
  className={`h-11 ${
    error ? 'border-destructive focus-visible:ring-destructive' : ''
  }`}
/>
{error && (
  <p className="text-sm text-destructive">{error}</p>
)}
```

---

## 6. Background Patterns

### Gradient Backgrounds
```tsx
// Page background
<div className="min-h-screen bg-gradient-to-b from-black/80 to-black/90">

// Card gradient
<div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90">

// Feature gradient
<div className="bg-gradient-to-br from-accent/10 via-transparent to-black/20">
```

### Radial Gradient Overlay
```tsx
<div className="relative">
  {/* Background effect */}
  <div className="absolute inset-0 
                  bg-gradient-radial from-accent/10 via-transparent to-transparent 
                  pointer-events-none" />
  
  {/* Content */}
  <div className="relative z-10">
    {/* Your content */}
  </div>
</div>
```

### Glassmorphism
```tsx
<div className="bg-white/10 backdrop-blur-md border border-accent/20">
  {/* Content */}
</div>
```

---

## 7. Table Patterns

### Responsive Table
```tsx
<div className="overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow className="border-b border-accent/20 hover:bg-transparent">
        <TableHead className="text-white font-semibold">
          Header
        </TableHead>
        {/* More headers */}
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="border-b border-accent/10 
                           hover:bg-accent/5 transition-colors">
        <TableCell className="font-medium text-white/90">
          Data
        </TableCell>
        {/* Hide on mobile */}
        <TableCell className="hidden sm:table-cell">
          Mobile Hidden
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

---

## 8. Icon Patterns

### Icon with Text
```tsx
<div className="flex items-center gap-2">
  <Mail className="w-4 h-4 text-accent" />
  <span className="text-white/70">email@example.com</span>
</div>
```

### Icon Badge
```tsx
<div className="inline-flex p-3 rounded-xl bg-accent/10 text-accent">
  <TrendingUp className="w-6 h-6" />
</div>
```

### Icon Button
```tsx
<button className="p-1.5 rounded-full bg-accent/10 
                   hover:bg-accent/20 transition-colors">
  <CheckCircle2 className="w-5 h-5 text-accent" />
</button>
```

---

## 9. Navigation Patterns

### Fixed Navbar
```tsx
<nav className={cn(
  "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
  isScrolled 
    ? "bg-black/85 backdrop-blur-md shadow-lg"
    : "bg-transparent"
)}>
  <div className="container mx-auto px-4 lg:px-8">
    <div className="flex items-center justify-between py-4">
      {/* Nav content */}
    </div>
  </div>
</nav>
```

### Nav Links
```tsx
<Button
  asChild
  variant="ghost"
  className="text-white hover:text-accent hover:bg-transparent">
  <Link to="/about">About</Link>
</Button>
```

---

## 10. Loading & Empty States

### Loading Spinner
```tsx
<div className="flex items-center gap-2">
  <div className="w-5 h-5 border-2 border-white/30 border-t-white 
                  rounded-full animate-spin" />
  <span>Loading...</span>
</div>
```

### Empty State
```tsx
<div className="text-center text-white/60 py-12">
  <p className="text-lg mb-2">No data available</p>
  <p className="text-sm">Try selecting a different option</p>
</div>
```

---

## 11. Badge & Tag Patterns

### Skill Badge
```tsx
<span className="px-3 py-1 
                 bg-accent/20 text-accent 
                 text-xs font-medium rounded-full 
                 border border-accent/30 
                 hover:bg-accent/30 transition-colors">
  React
</span>
```

### Status Badge
```tsx
<div className="flex items-center gap-2 
                px-3 py-1.5 
                bg-accent/10 rounded-full">
  <Activity className="h-4 w-4 text-accent" />
  <span className="text-xs font-medium text-accent">Active</span>
</div>
```

---

## 12. Animation & Transition Patterns

### Hover Effects
```tsx
// Lift effect
className="hover:-translate-y-2 transition-transform duration-300"

// Scale effect
className="hover:scale-105 transition-transform duration-300"

// Glow effect
className="hover:shadow-lg hover:shadow-accent/40 transition-all"

// Color transition
className="transition-colors hover:text-accent"
```

### Fade In
```tsx
<div className="animate-in fade-in duration-1000">
  {/* Content */}
</div>
```

### Slide In
```tsx
<div className="animate-in slide-in-from-bottom-5">
  {/* Content */}
</div>
```

---

## 13. Responsive Typography

```tsx
// Responsive heading
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl">
  Responsive Title
</h1>

// Responsive paragraph
<p className="text-sm sm:text-base md:text-lg">
  Responsive text
</p>

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">
  {/* Content */}
</div>
```

---

## 14. Color Patterns

### Using CSS Variables
```tsx
// Background colors
bg-background    // Main background
bg-card          // Card backgrounds
bg-muted         // Muted sections
bg-accent        // Accent color (#73C2A0)

// Text colors
text-foreground       // Main text
text-muted-foreground // Muted text
text-accent          // Accent color text

// Border colors
border-border     // Default border
border-accent/20  // Accent with opacity
```

### Opacity Variations
```tsx
// Background opacity
bg-white/10    // 10% opacity
bg-white/20    // 20% opacity
bg-black/80    // 80% opacity

// Text opacity
text-white/90  // 90% opacity
text-white/70  // 70% opacity
text-white/60  // 60% opacity
```

---

## 15. Best Practices

### ✅ DO:
- Use semantic HTML elements
- Apply utility classes directly
- Use responsive prefixes (sm:, md:, lg:)
- Leverage CSS variables for theming
- Group related utilities
- Use component composition
- Add transitions for interactions
- Maintain consistent spacing scale

### ❌ DON'T:
- Use inline styles
- Create custom CSS classes unnecessarily
- Forget mobile-first approach
- Ignore accessibility
- Mix Tailwind with other CSS frameworks
- Use arbitrary values excessively
- Forget hover/focus states

---

## Summary

All components use:
- ✅ Tailwind utility classes for ALL styling
- ✅ Responsive breakpoints (mobile → tablet → desktop)
- ✅ CSS variables (--accent, --background, etc.)
- ✅ lucide-react icons
- ✅ shadcn/ui base components
- ✅ Consistent spacing scale
- ✅ Professional hover effects
- ✅ Proper transitions
- ✅ Accessible markup

**Result: Production-ready, fully-styled UI** 🎉

