# Yield Analytics - Visual Layout Reference

## 📺 Page Layout & Components

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  🌾 YIELD ANALYTICS & PERFORMANCE                                          ║
║  Comprehensive analysis of harvest yield data across all fields and crops   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────┐
│ 📅 FILTER BAR                                                                │
│                                                                              │
│ [Start Date ▼] [End Date ▼] [Crop Type ▼] [Variety ▼] [Section ▼] [Block ▼] │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────┬─────────────────────┐
│ 📊 STATS CARDS  │                 │                 │                     │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────┤
│ Total           │ With Yield Data │ Unique Fields   │ Crop Types          │
│ Observations    │                 │                 │                     │
│                 │                 │                 │                     │
│     125         │      87         │      8          │      5              │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────┘

┌─────────────────────────────────────┬─────────────────────────────────────┐
│ 📊 AVERAGE YIELD BY FIELD           │ 📊 AVERAGE YIELD BY CROP TYPE      │
│ (Bar Chart)                         │ (Bar Chart)                        │
│                                     │                                    │
│ Field A    ████████ 5,500 kg/ha    │ Sugarcane  ████████ 6,200 kg/ha   │
│ Field B    ███████  5,100 kg/ha    │ Corn       █████████ 7,100 kg/ha  │
│ Field C    █████    4,800 kg/ha    │ Wheat      ████ 3,800 kg/ha       │
│ Field D    ██████   5,200 kg/ha    │ Rice       ██████ 5,400 kg/ha     │
│                                     │ Sorghum    █████ 5,000 kg/ha      │
└─────────────────────────────────────┴─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📈 YIELD TREND OVER TIME (Line Chart)                                       │
│                                                                             │
│     7000 │    ╱╲                                                            │
│     6500 │   ╱  ╲    ╱╲                                                    │
│     6000 │  ╱    ╲  ╱  ╲    ╱──╲                                          │
│     5500 │ ╱      ╲╱    ╲  ╱    ╲                                         │
│     5000 │                ╲╱      ╲__                                      │
│          │                                                                  │
│          └─────────────────────────────────────────────────────────────────│
│          Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────┬─────────────────────────────────────┐
│ 🥧 YIELD DISTRIBUTION BY CROP TYPE  │ 📍 YIELD COMPARISON SCATTER        │
│ (Pie Chart)                         │ (Scatter Plot)                     │
│                                     │                                    │
│       ╱─────────╲                   │  7500│    ●                        │
│      ╱   Corn    ╲                  │      │  ●   ●   ●                 │
│      │  35% 7.1K │                  │  6500│●  ●  ●   ●                │
│      │            │                  │      │  ●                        │
│      ╲────────────╱                  │  5500│●   ●   ●                 │
│   ╱────┴───────────┴────╲            │      │    ●                      │
│  ╱  Sugarcane    Rice    ╲           │  4500│                          │
│ │   26% 6.2K   17% 5.4K  │           │      └──────────────────        │
│  ╲  Wheat Sorghum       ╱            │      0    2    4    6   Records  │
│   ╲────┬───────────┬────╱            │                                   │
│        │ 12%       10%               │                                   │
│        3.8K        5.0K             │                                    │
│                                     │                                    │
└─────────────────────────────────────┴─────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📋 RECENT YIELD RECORDS                                                     │
├────────────┬──────────────┬───────────────┬────────────┬──────────────────┤
│ Field      │ Crop Type    │ Variety       │ Yield      │ Date             │
├────────────┼──────────────┼───────────────┼────────────┼──────────────────┤
│ Field A    │ Sugarcane    │ VAT-90        │ 5,800 kg/ha│ Dec 15, 2024    │
│ Field B    │ Corn         │ Pioneer-7200  │ 7,200 kg/ha│ Dec 10, 2024    │
│ Field C    │ Wheat        │ HD-2967       │ 3,900 kg/ha│ Dec 05, 2024    │
│ Field D    │ Rice         │ IR-64         │ 5,300 kg/ha│ Nov 30, 2024    │
│ Field A    │ Sorghum      │ CSH-13        │ 5,100 kg/ha│ Nov 25, 2024    │
│ ...        │ ...          │ ...           │ ...        │ ...             │
│ (Showing 5 of 87 records)                                                 │
└────────────┴──────────────┴───────────────┴────────────┴──────────────────┘
```

## 🎨 Color Scheme

| Component | Color | Use |
|-----------|-------|-----|
| Bar Charts Primary | #10b981 (Green) | Positive indicators, fields |
| Bar Charts Secondary | #3b82f6 (Blue) | Alternative metrics |
| Line Chart | #f59e0b (Amber) | Trends and changes |
| Pie Chart | Multiple Colors | Distribution segments |
| Success Stats | #10b981 (Green) | High yield, good metrics |
| Warning Stats | #f59e0b (Amber) | Medium metrics |
| Error Stats | #ef4444 (Red) | Low yield |

## 📐 Responsive Breakpoints

### Desktop (1200px+)
```
┌─────────────────────────────────────────────────┐
│ Chart 1 (50%)          │ Chart 2 (50%)         │
├────────────────────────┼───────────────────────┤
│ Chart 3 (50%)          │ Chart 4 (50%)         │
├────────────────────────┴───────────────────────┤
│ Chart 5 (100%)                                 │
├────────────────────────────────────────────────┤
│ Data Table (100%)                              │
└────────────────────────────────────────────────┘
```

### Tablet (768px - 1199px)
```
┌──────────────────────────────┐
│ Chart 1 (100%)               │
├──────────────────────────────┤
│ Chart 2 (100%)               │
├──────────────────────────────┤
│ Chart 3 (100%)               │
├──────────────────────────────┤
│ Data Table (100%)            │
└──────────────────────────────┘
```

### Mobile (< 768px)
```
┌────────────────────┐
│ Chart 1 (100%)     │
├────────────────────┤
│ Chart 2 (100%)     │
├────────────────────┤
│ Chart 3 (100%)     │
├────────────────────┤
│ Data Table scroll  │
└────────────────────┘
```

## 🖱️ Interactive Elements

### Hover Interactions
- Charts show tooltip with exact values
- Bars/points highlight on hover
- Colors brighten on hover
- Smooth transitions (0.2s)

### Click Interactions
- Filter fields trigger updates
- Chart segments can be toggled in legend

### Touch Interactions
- Swipe to scroll tables
- Tap to see tooltips
- Double-tap to zoom charts

## 📊 Data Aggregation Examples

### Example 1: Field A Yield Over Time
```
Raw Data:
- Oct 1: 5200 kg/ha
- Nov 1: 5400 kg/ha
- Dec 1: 5800 kg/ha

Aggregated Display:
Field A ← Average of 5,467 kg/ha
```

### Example 2: Sugarcane Total From All Fields
```
Raw Data:
- Field A: 5,800 kg/ha
- Field C: 6,200 kg/ha
- Field E: 6,100 kg/ha

Pie Chart Shows: 
Sugarcane ← 30% of total yield
```

## 📈 Real-Time Updates

When filters change:
1. Data is recalculated (< 100ms)
2. Charts transition smoothly
3. Statistics cards update
4. Table refreshes
5. All changes are immediate

## 🚀 Performance Metrics

- Initial Load: ~500ms
- Filter Update: ~50ms
- Chart Render: ~200ms
- Total Page Interactive: ~750ms

## ✨ Accessibility Features

- Proper semantic HTML
- Color contrast ratios (WCAG AA)
- Keyboard navigation support
- ARIA labels on charts
- Tooltip descriptions
- Screen reader support
