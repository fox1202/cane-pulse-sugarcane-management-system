export interface FarmingCalendarTask {
    month: number
    weekNumber: number
    weekLabel: string
    activity: string
}

export interface FarmingCalendarTemplate {
    id: 'plant' | 'ratoon'
    title: string
    sourceSheet: string
    workbookTitle: string
    referenceLabel: string
    fieldAnchor: 'planting_date' | 'cut_date'
    anchorWeekNumber: number
    monthRange: [number, number]
    notes: string[]
    tasks: FarmingCalendarTask[]
}

export const FARMING_CALENDAR_TEMPLATES: FarmingCalendarTemplate[] = [
    {
        id: 'plant',
        title: 'Plant Cane',
        sourceSheet: 'Plant',
        workbookTitle: "Zimbabwe Sugarcane Farmers' Calendar for Plant Cane",
        referenceLabel: 'Project start date',
        fieldAnchor: 'planting_date',
        anchorWeekNumber: 4,
        monthRange: [0, 14],
        notes: [
            'This calendar is for plant cane. There is a separate calendar for ratoon cane.',
            'This calendar acts as a guide to help you track activities.',
            'Irrigation should happen throughout the period. Avoid over or under irrigating.',
            'Timelines may differ slightly depending on season, on-farm conditions, and availability of resources.',
            'Contact ZSAES scientists when in doubt.',
            'For certified seedcane providers, contact ZSAES Plant Pathology.',
        ],
        tasks: [
            { month: 2, weekNumber: 5, weekLabel: 'Week 5', activity: 'Apply the early post-emergent herbicide.' },
            { month: 2, weekNumber: 6, weekLabel: 'Week 6', activity: 'Apply first split of nitrogen fertiliser and potassium according to soil results.' },
            { month: 2, weekNumber: 8, weekLabel: 'Week 8', activity: 'Apply second split of nitrogen fertiliser and the second potassium split.' },
            { month: 3, weekNumber: 10, weekLabel: 'Week 10', activity: 'For late-season crops, apply the third nitrogen split at 10 weeks after emergence.' },
            { month: 4, weekNumber: 13, weekLabel: 'Week 13', activity: 'Apply the post-emergent herbicide and hoe where weed pressure requires it.' },
        ],
    },
    {
        id: 'ratoon',
        title: 'Ratoon Cane',
        sourceSheet: 'Ratoon',
        workbookTitle: "Zimbabwe Sugarcane Farmers' Calendar for Ratoon Cane",
        referenceLabel: 'Cut date',
        fieldAnchor: 'cut_date',
        anchorWeekNumber: 1,
        monthRange: [1, 12],
        notes: [
            'This calendar is for ratoon cane. There is a separate calendar for plant cane.',
            'This calendar acts as a guide to help you track activities.',
            'Irrigation should happen throughout the period. Avoid over or under irrigating.',
            'Timelines may differ slightly depending on season, on-farm conditions, and availability of resources.',
            'Contact ZSAES scientists when in doubt.',
        ],
        tasks: [
            { month: 1, weekNumber: 2, weekLabel: 'Week 2', activity: 'Follow up on soil analysis results and apply SSP or MAP.' },
            { month: 2, weekNumber: 6, weekLabel: 'Week 6', activity: 'Apply the first split of nitrogen fertiliser and potassium based on soil results.' },
            { month: 2, weekNumber: 8, weekLabel: 'Week 8', activity: 'Apply the second split of nitrogen fertiliser and the second potassium split.' },
            { month: 3, weekNumber: 7, weekLabel: 'Week 7', activity: 'For late-season crops, apply the third nitrogen split at 10 weeks after emergence.' },
            { month: 5, weekNumber: 13, weekLabel: 'Week 13', activity: 'Apply post-emergent herbicide and hoe where weed pressure requires it.' },
        ],
    },
]

export function getFarmingCalendarTemplate(templateId: FarmingCalendarTemplate['id']): FarmingCalendarTemplate {
    return FARMING_CALENDAR_TEMPLATES.find((template) => template.id === templateId) ?? FARMING_CALENDAR_TEMPLATES[0]
}
