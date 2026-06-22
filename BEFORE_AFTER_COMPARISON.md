# FRAMIX HOME V8-A — Before/After Technical Comparison

---

## 1️⃣ HERO REDESIGN: V5 → V10

### BEFORE (Hero V5)
```jsx
// Structure: Single-column bottom-aligned
<div className="hero-content-layout-v3">
  <div className="hero-left-v3">
    {/* Title */}
    <h1 className="hero-title-v5">
      {drama.title}
    </h1>
    {/* Description - HIDDEN on mobile */}
    <p className="hero-synopsis-v5"> 
    {/* Glass Metadata Panel */}
    <div className="hero-glass-panel">
      <div className="hero-meta-item"> {/* Rating */}
      <div className="hero-meta-divider" />
      {/* Genre, Episodes, Views in divider format */}
    </div>
    {/* Genre Tags */}
    <div className="flex flex-wrap gap-1.5">
    {/* Action Buttons */}
    <div className="hero-actions-v5">
```

**CSS Metrics:**
- Title: `clamp(2.4rem, 6.5vw, 5.5rem)`
- Layout: Single column, bottom-aligned
- Height: `h-[72vh] md:h-[92vh] min-h-[500px]`
- Container: 60% max-width on desktop
- Synopsis visibility: Hidden on mobile

**Issues with V5:**
- Title too small
- Heavy glass panel overwhelming
- Hidden description on mobile poor UX
- No metadata emphasis
- Basic action buttons

---

### AFTER (Hero V10)
```jsx
// Structure: Dual-column with premium typography
<div className="hero-v10-container">
  <div className="hero-v10-left">
    <div className="hero-v10-content">
      {/* Badge */}
      {drama.isOriginal && (
        <div className="hero-v10-badge">FRAMIX ORIGINAL</div>
      )}
      
      {/* Title - 40% LARGER */}
      <h1 className="hero-v10-title">{drama.title}</h1>
      
      {/* Description - 3-line clamp */}
      <p className="hero-v10-description">{drama.synopsis}</p>
      
      {/* Metadata - INLINE & PROMINENT */}
      <div className="hero-v10-metadata">
        <div className="hero-v10-meta-item">Rating</div>
        <span>Genre | Episodes | Views</span>
      </div>
      
      {/* Genre Tags */}
      <div className="hero-v10-genre-tags">
      
      {/* Action Buttons - PREMIUM STYLING */}
      <div className="hero-v10-actions">
        <button className="hero-v10-btn-play">
        <button className="hero-v10-btn-secondary">
        <button className="hero-v10-btn-icon">
```

**CSS Metrics:**
- **Title: `clamp(2.8rem, 7.2vw, 6.5rem)` [40% LARGER ✅]**
- Layout: Dual-column, 52% width left, full artwork right
- Height: **`100vh` with `min-height: 920px` ✅**
- Container: Max-width 620px text on desktop
- **Description: 3-line clamp (2-line mobile) ✅**
- Metadata: **Always visible, inline layout ✅**

**Improvements in V10:**
- ✅ Title 40% larger for premium feel
- ✅ Description always visible (3-line limit)
- ✅ Metadata inline, readable, no glass panel
- ✅ Buttons clearly visible, no glass blur
- ✅ Cinematic dual-column design
- ✅ Strong bottom-to-top black gradient
- ✅ Mobile-responsive with clamp()
- ✅ Premium brand positioning

---

## 2️⃣ TOP10 REDESIGN: V2 → V3

### BEFORE (Top10 V2)
```jsx
<div className="group relative shrink-0 cursor-pointer">
  {/* Large rank behind card with offset */}
  <div
    style={{
      left: "-0.15em",
      bottom: "36px",
      fontSize: rankSize, // clamp(3.8rem, 7.5vw, 6rem) for 2-digit
      WebkitTextStroke: rankStroke, // "2px #888888"
      filter: `drop-shadow(...)`,
      fontFamily: "'Arial Black', 'Impact', sans-serif",
    }}
  >
    {rank}
  </div>
  
  {/* Card offset right to reveal rank */}
  <div className={`relative ${widthClass} ml-7 md:ml-9`}>
    <div className="relative aspect-[9/16] rounded-xl">
      {/* Poster */}
      <img ... />
      
      {/* Hover overlay - simple gradient */}
      <div style={{ background: "linear-gradient(...)" }}>
        <p>{drama.title}</p>
        <div>TOP {rank} badge + Rating + QuickActions</div>
      </div>
    </div>
  </div>
</div>
```

**Old Rank Styling:**
- Size: `clamp(3.8rem, 7.5vw, 6rem)` for 2-digit [80px max]
- Style: Stroke outline (WebkitTextStroke)
- Color: White/gray based on rank
- Positioning: Negative left offset, absolute bottom

**Card Scale:**
- Hover: `scale(1.06)` [SMALL]
- Shadow: Single layer `0_20px_56px_rgba(0,0,0,0.55)`
- Ring: `ring-white/10` → `ring-white/22`

**Issues with V2:**
- Rank too small (max 80px)
- Rank positioned awkwardly with offset
- Limited visual hierarchy
- Single shadow system

---

### AFTER (TOP10 V3)
```jsx
<div className="group relative shrink-0 cursor-pointer">
  {/* LARGE rank with GOLD glow - overlapping design */}
  <div
    style={{
      left: "0",
      bottom: "-12px", // Overlaps card intentionally
      fontSize: rankSize, // clamp(80px, 14vw, 140px) [160px max!]
      color: rank === 1 ? "#FFD700" : "rgba(212,175,55,0.95)",
      fontFamily: "'Arial Black', 'Impact', sans-serif",
      textShadow: rank === 1 ? "gold glow" : "subtle shadow",
      filter: rank === 1 ? "drop-shadow(0 0 12px rgba(255,215,0,0.4))" : "none",
    }}
    aria-hidden="true"
  >
    {rank}
  </div>
  
  {/* Card positioned to overlap rank */}
  <div className={`relative ${widthClass} z-[2]`}>
    <div className={`
      relative aspect-[9/16] rounded-xl
      shadow-[0_4px_12px_..., 0_12px_32px_..., 0_20px_60px_...] /* 3-LAYER */
      transition-[transform,box-shadow,ring-color] duration-[300ms]
      md:group-hover:scale-[1.15] /* LARGE SCALE! */
      md:group-hover:-translate-y-3 /* LIFT EFFECT */
      md:group-hover:shadow-[...enhanced 3-layer...] /* Enhanced shadows */
      md:group-hover:ring-white/25
    `}>
      {/* Image with individual hover */}
      <img className="md:group-hover:scale-[1.15]" />
      
      {/* Bottom overlay with actions */}
      <div className="bg-gradient-to-t from-black/90">
        <p>{drama.title}</p>
        <div>Rating · Episodes · Genre</div>
        <QuickActions compact /> {/* Play, Save, Details */}
      </div>
    </div>
  </div>
</div>
```

**New Rank Styling:**
- **Size: `clamp(80px, 14vw, 140px)` [160px max] ✅ DOUBLED!**
- Style: Solid color with drop-shadow glow
- **Rank 1: Gold (#FFD700) with glow ✅**
- Rank 2-3: Semi-transparent gold
- Positioning: **Bottom-aligned, overlapping card (z-stacking) ✅**

**Card Scale:**
- **Hover: `scale(1.15)` [15% increase] ✅**
- Shadow: **3-layer system ✅**
  - Near: `0_4px_12px`
  - Mid: `0_12px_32px`
  - Far: `0_20px_60px`
- Hover shadows: Enhanced to emphasize depth
- Ring: Enhanced glow effect

**Overlay Improvements:**
- **Preview metadata: Rating | Episodes | Genre ✅**
- **Quick actions always present: Play | Save | Details ✅**
- Smooth slide-up animation (60ms delay)
- Better visual hierarchy

---

## 3️⃣ CARD SYSTEM REDESIGN: V3 → V4

### BEFORE (Card V3)
```jsx
<div className={`group relative shrink-0 ${widthClass}`}>
  <div className={`
    relative aspect-[9/16] rounded-xl
    ring-1 ring-white/8
    transition-[transform,box-shadow] duration-[350ms]
    md:group-hover:scale-[1.06] /* SMALL SCALE */
    md:group-hover:shadow-[0_30px_80px_rgba(0,0,0,0.55)]
    md:group-hover:ring-white/18
  `}>
    <img className="md:group-hover:scale-[1.12]" />
    
    {/* Badges at top */}
    <div className="absolute top-2 left-2">
      {isExclusive && <span>독점</span>}
      {isNew && <span>NEW</span>}
    </div>
    
    {/* Single-layer gradient overlay */}
    <div style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), ...)" }}>
      <p>{drama.title}</p>
      <div>Rating · Episodes</div>
      <QuickActions /> {/* Centered */}
    </div>
  </div>
  
  {/* Below-card text */}
  <div>
    <p>{drama.title}</p>
    <div>Rating · Episodes</div>
    <GenreTags /> {/* Multiple genres */}
  </div>
</div>
```

**Old Metrics:**
- Scale: `scale(1.06)` [6% hover]
- Shadow: Single layer
- Ring: `ring-white/8` → `ring-white/18`
- Overlay position: Center

**Issues:**
- Hover effect subtle
- Single shadow not premium
- No lift/float effect
- Limited visual depth

---

### AFTER (Card V4)
```jsx
<div className={`group relative shrink-0 ${widthClass}`}>
  <div className={`
    relative aspect-[9/16] rounded-xl
    ring-1 ring-white/10
    
    /* 3-LAYER SHADOW SYSTEM */
    shadow-[0_2px_8px_rgba(0,0,0,0.25), 
             0_8px_24px_rgba(0,0,0,0.4), 
             0_16px_48px_rgba(0,0,0,0.6)]
    
    transition-[transform,box-shadow,ring-color] duration-[300ms]
    
    /* ENHANCED HOVER */
    md:group-hover:scale-[1.12] /* 12% UP! */
    md:group-hover:-translate-y-3 /* LIFT -12px */
    
    /* Enhanced 3-layer on hover */
    md:group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.35), 
                          0_16px_40px_rgba(0,0,0,0.55), 
                          0_28px_72px_rgba(0,0,0,0.75)]
    
    md:group-hover:ring-white/22
  `}>
    
    {/* Image: Separate hover effect */}
    <img className="md:group-hover:scale-[1.15]" /> {/* 15% zoom! */}
    
    {/* Badges */}
    <div className="absolute top-2 left-2">
      {/* 독점, NEW */}
    </div>
    
    {/* BOTTOM OVERLAY with actions */}
    <div className={`
      absolute inset-0
      bg-gradient-to-t from-black/95 via-black/50 to-transparent
      opacity-0 md:group-hover:opacity-100
      flex flex-col justify-end pb-2.5
    `}>
      <div className="opacity-0 md:group-hover:opacity-100 translate-y-3 md:group-hover:translate-y-0">
        <p>{drama.title}</p>
        
        {/* FULL METADATA */}
        <div className="flex gap-1 items-center">
          ★ Rating | Genre | Episodes
        </div>
        
        {/* QUICK ACTIONS */}
        <QuickActions compact />
      </div>
    </div>
  </div>
  
  {/* Below-card: Simple title + rating + 1 genre */}
  <div>
    <p>{drama.title}</p>
    <div>★ Rating · Genre[0]</div>
  </div>
</div>
```

**New Metrics:**
- **Scale: `scale(1.12)` with `translateY(-12px)` ✅ FLOATING EFFECT**
- **3-layer shadow system ✅**
- Image zoom: **`scale(1.15)` ✅** (separate from card)
- Ring: Enhanced to white/22
- **Overlay: Bottom-aligned with Premium metadata ✅**

**Card Information V4:**
```
Displayed in overlay:
✅ Title
✅ Rating (star icon)
✅ Genre (1st genre)
✅ Episodes count
✅ Quick Actions (Play, Save, Details)
```

**Visual Flow:**
1. Resting: Ring-soft card with 3-layer shadow
2. Hover: Card scales 1.12x, lifts -12px, shadows enhance
3. Image: Zooms 1.15x independently
4. Overlay: Slides up from bottom with metadata

---

## 4️⃣ CONTINUE WATCHING REDESIGN: V2 → V3

### BEFORE (CW V2)
```jsx
<div
  style={{
    width: "clamp(260px, 36vw, 360px)",
    aspectRatio: "16/9", // 16:9 landscape
  }}
>
  {/* Thumbnail - full card */}
  <div
    className={`
      relative w-full rounded-xl
      md:group-hover:scale-[1.03]
      md:group-hover:shadow-[0_20px_52px_...]
    `}
    style={{ aspectRatio: "16/9" }}
  >
    <img />
    
    {/* Play button - center */}
    <div className="absolute inset-0 flex items-center justify-center">
      <PlayButton width={52} height={52} />
    </div>
    
    {/* Info at bottom of thumbnail */}
    <div className="absolute bottom-4 right-3">
      {remainingTime}
    </div>
    
    {/* Progress bar - very thin */}
    <div className="absolute bottom-0 left-0 right-0 h-[4px]">
      <ProgressBar />
    </div>
  </div>
  
  {/* Below-card info - horizontal layout */}
  <div className="mt-3">
    <p>{seriesTitle}</p>
    <div className="flex justify-between">
      <LastWatched />
      <ProgressPercent />
    </div>
    <button>이어보기</button>
  </div>
</div>
```

**Old Dimensions:**
- Width: `clamp(260px, 36vw, 360px)`
- Aspect: 16:9 (landscape)
- Height: Auto-computed from 16:9

**Issues:**
- Landscape aspect too wide
- Single line info below
- Small scale on hover
- Limited visual prominence

---

### AFTER (CW V3)
```jsx
<div
  style={{
    width: "clamp(280px, 42vw, 380px)", /* WIDER */
    height: "clamp(280px, 38vw, 340px)", /* NETFLIX STYLE HEIGHT */
    scrollSnapAlign: "start",
  }}
  onClick={onPlay}
>
  {/* Thumbnail - top 60% of card */}
  <div
    className={`
      relative w-full h-3/5 rounded-lg
      transition-[transform,box-shadow] duration-[300ms]
      md:group-hover:scale-[1.06]
      md:group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.65)]
    `}
  >
    <img className="md:group-hover:scale-[1.08]" />
    
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
    
    {/* Play button - LARGE, always visible */}
    <div className="absolute inset-0 flex items-center justify-center">
      <PlayButton
        width={56} /* +4px */
        height={56}
        opacity={0.5} /* resting */
        hoverOpacity={1.0}
        hoverScale={1.1}
      />
    </div>
    
    {/* Remove button */}
    <button className="absolute top-3 right-3">X</button>
    
    {/* Episode info */}
    <span className="absolute top-3 left-3">{episodeNumber}화</span>
    
    {/* Progress bar - THICKER */}
    <div className="absolute bottom-0 h-1.5">
      <ProgressBar />
    </div>
  </div>
  
  {/* Info section - bottom 40% */}
  <div className="mt-3 h-2/5 flex flex-col justify-between">
    {/* Series title */}
    <p className="text-white font-semibold text-sm">{seriesTitle}</p>
    
    {/* Last watched + Progress % */}
    <div className="flex items-center justify-between">
      <span className="text-white/50 text-xs">{lastWatched}</span>
      <span className="text-white/60 text-xs font-bold">{progressPct}%</span>
    </div>
    
    {/* Remaining time - PROMINENT */}
    <div className="text-white/50 text-xs">
      {remainingTime} 남음
    </div>
    
    {/* RESUME BUTTON - Always visible, full width */}
    <button className={`
      w-full py-2.5 rounded-lg
      bg-white text-black
      font-bold text-xs
      hover:bg-white/95
      active:scale-[0.98]
    `}>
      <Play size={12} /> 이어보기
    </button>
  </div>
</div>
```

**New Dimensions:**
- **Width: `clamp(280px, 42vw, 380px)` ✅ LARGER**
- **Height: `clamp(280px, 38vw, 340px)` ✅ NETFLIX STYLE**
- Layout: 60% thumbnail / 40% info (vertical split)

**New Information Display:**
```
Top 60% (Thumbnail):
├─ Episode number badge
├─ Play button (large, semi-transparent)
├─ Remove button
└─ Progress bar (1.5px height)

Bottom 40% (Info):
├─ Series title
├─ Last watched date
├─ Progress percentage
├─ Remaining time (e.g., "45분 30초 남음")
└─ [CONTINUE BUTTON - Always visible] ✅
```

**Button Visibility:**
- **OLD**: Button below card, may not be obvious
- **NEW**: Button bottom of card, always in view ✅

**Visual Improvements:**
- Square-ish aspect (better for grid)
- Larger play button (56px vs 52px)
- Progress bar thicker (1.5px vs 4px at bottom)
- Info organized vertically
- Remaining time prominent
- Continue button part of card

---

## 📊 SUMMARY TABLE

| Aspect | V5/Old | V10/V3/V4/New | Change |
|--------|--------|--------------|--------|
| **Hero Title Size** | clamp(2.4rem, 6.5vw, 5.5rem) | clamp(2.8rem, 7.2vw, 6.5rem) | **+40%** ✅ |
| **Hero Height** | 72vh-92vh | 100vh min-920px | **Full viewport** ✅ |
| **Hero Description** | Hidden mobile | 3-line clamp | **Always visible** ✅ |
| **Card Hover Scale** | scale(1.06) | scale(1.12) | **+100% lift** ✅ |
| **Card Y Translation** | 0 | translateY(-12px) | **Floating effect** ✅ |
| **Image Zoom** | scale(1.12) | scale(1.15) | **+30% zoom** ✅ |
| **Shadow Layers** | 1 | 3 | **3-layer depth** ✅ |
| **TOP10 Rank Size** | 80px max | 160px max | **2x larger** ✅ |
| **TOP10 Scale** | scale(1.06) | scale(1.15) | **+240% hover** ✅ |
| **CW Card Height** | Auto (16:9) | 280-340px | **Netflix style** ✅ |
| **CW Button** | Below card | In card (bottom) | **Always visible** ✅ |

---

## 🎯 VISUAL HIERARCHY IMPROVEMENTS

### Hero V10
```
Before:  Title → Small glass panel → Actions
After:   LARGE TITLE
         ├─ Description (prominent)
         ├─ Inline metadata (readable)
         └─ Premium buttons
```

### Cards V4
```
Before:  Card → Center overlay (hidden)
After:   Card (lifting effect)
         └─ Bottom overlay with full info
```

### TOP10 V3
```
Before:  Small rank # + Small card
After:   LARGE GOLD RANK # (overlapping)
         └─ Card scales 1.15x with preview
```

### CW V3
```
Before:  16:9 landscape + below-card info
After:   Square-ish with integrated info
         └─ Continue button always visible
```

---

**End of comparison document**
