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
            { month: 0, weekNumber: 1, weekLabel: 'Week 1', activity: 'Secure seedcane from a certified source. Begin land preparation with ripping and discing.' },
            { month: 0, weekNumber: 2, weekLabel: 'Week 2', activity: 'Complete soil sampling and ridging.' },
            { month: 0, weekNumber: 3, weekLabel: 'Week 3', activity: 'Follow up on soil analysis results and apply SSP.' },
            { month: 0, weekNumber: 4, weekLabel: 'Week 4', activity: 'Plant, irrigate immediately, and apply a pre-emergence herbicide. In late season, apply ACTARA SC for YSA control.' },
            { month: 1, weekNumber: 5, weekLabel: 'Week 5', activity: 'Watch for cane emergence. Timing depends on soil moisture and temperature. Continue irrigation cycles until dry-off and track TAM closely.' },
            { month: 2, weekNumber: 5, weekLabel: 'Week 5', activity: 'Rogue smut and apply early post-emergent herbicide.' },
            { month: 2, weekNumber: 6, weekLabel: 'Week 6', activity: 'Apply first split of nitrogen fertiliser and potassium according to soil results.' },
            { month: 2, weekNumber: 8, weekLabel: 'Week 8', activity: 'Apply second split of nitrogen fertiliser and the second potassium split.' },
            { month: 3, weekNumber: 10, weekLabel: 'Week 10', activity: 'For late-season crops, apply the third nitrogen split at 10 weeks after emergence.' },
            { month: 3, weekNumber: 12, weekLabel: 'Week 12', activity: 'Run pest and disease surveys for smut, white grubs, BMB scouting, and pre-canopy eldana saccharina.' },
            { month: 4, weekNumber: 13, weekLabel: 'Week 13', activity: 'Apply post-emergent herbicide and hoe where weed pressure requires it.' },
            { month: 4, weekNumber: 14, weekLabel: 'Week 14', activity: 'Carry out YSA scouting.' },
            { month: 4, weekNumber: 15, weekLabel: 'Week 15', activity: 'Carry out YSA scouting.' },
            { month: 4, weekNumber: 16, weekLabel: 'Week 16', activity: 'Carry out YSA scouting.' },
            { month: 5, weekNumber: 17, weekLabel: 'Week 17', activity: 'Carry out YSA scouting.' },
            { month: 5, weekNumber: 18, weekLabel: 'Week 18', activity: 'Carry out YSA scouting.' },
            { month: 6, weekNumber: 21, weekLabel: 'Week 21', activity: 'Run the post-canopy eldana saccharina survey.' },
            { month: 6, weekNumber: 22, weekLabel: 'Week 22', activity: 'Take foliar samples.' },
            { month: 13, weekNumber: 50, weekLabel: 'Week 50', activity: 'End irrigation cycles.' },
            { month: 13, weekNumber: 51, weekLabel: 'Week 51', activity: 'Start dry-off. Final timing should still follow TAM.' },
            { month: 13, weekNumber: 52, weekLabel: 'Week 52', activity: 'Carry out a maturity test.' },
            { month: 14, weekNumber: 55, weekLabel: 'Week 55', activity: 'Begin harvesting, burning, cutting, and haulage.' },
            { month: 14, weekNumber: 56, weekLabel: 'Week 56', activity: 'Continue harvesting, burning, cutting, and haulage.' },
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
            { month: 1, weekNumber: 1, weekLabel: 'Week 1', activity: 'Sample soil soon after cutback and watch for cane emergence. Cooler conditions may delay emergence.' },
            { month: 1, weekNumber: 2, weekLabel: 'Week 2', activity: 'Follow up on soil analysis results and apply SSP or MAP.' },
            { month: 2, weekNumber: 6, weekLabel: 'Week 6', activity: 'Apply the first split of nitrogen fertiliser and potassium based on soil results.' },
            { month: 2, weekNumber: 8, weekLabel: 'Week 8', activity: 'Apply the second split of nitrogen fertiliser and the second potassium split.' },
            { month: 3, weekNumber: 5, weekLabel: 'Week 5', activity: 'Rogue smut and apply early post-emergent herbicide.' },
            { month: 3, weekNumber: 7, weekLabel: 'Week 7', activity: 'For late-season crops, apply the third nitrogen split at 10 weeks after emergence.' },
            { month: 4, weekNumber: 9, weekLabel: 'Week 9', activity: 'Carry out YSA scouting.' },
            { month: 4, weekNumber: 12, weekLabel: 'Week 12', activity: 'Run pest and disease surveys for smut, white grubs, BMB scouting, and pre-canopy eldana saccharina.' },
            { month: 5, weekNumber: 13, weekLabel: 'Week 13', activity: 'Apply post-emergent herbicide and hoe where weed pressure requires it.' },
            { month: 5, weekNumber: 14, weekLabel: 'Week 14', activity: 'Carry out YSA scouting.' },
            { month: 5, weekNumber: 15, weekLabel: 'Week 15', activity: 'Carry out YSA scouting.' },
            { month: 5, weekNumber: 16, weekLabel: 'Week 16', activity: 'Carry out YSA scouting.' },
            { month: 6, weekNumber: 17, weekLabel: 'Week 17', activity: 'Carry out YSA scouting.' },
            { month: 6, weekNumber: 18, weekLabel: 'Week 18', activity: 'Carry out YSA scouting.' },
            { month: 7, weekNumber: 21, weekLabel: 'Week 21', activity: 'Run the post-canopy eldana saccharina survey.' },
            { month: 7, weekNumber: 22, weekLabel: 'Week 22', activity: 'Take foliar samples.' },
            { month: 11, weekNumber: 46, weekLabel: 'Week 46', activity: 'End irrigation cycles.' },
            { month: 11, weekNumber: 47, weekLabel: 'Week 47', activity: 'Start dry-off. Final timing should still follow TAM.' },
            { month: 11, weekNumber: 48, weekLabel: 'Week 48', activity: 'Carry out a maturity test.' },
            { month: 12, weekNumber: 51, weekLabel: 'Week 51', activity: 'Begin harvesting, burning, cutting, and haulage.' },
            { month: 12, weekNumber: 52, weekLabel: 'Week 52', activity: 'Continue harvesting, burning, cutting, and haulage.' },
        ],
    },
]

export function getFarmingCalendarTemplate(templateId: FarmingCalendarTemplate['id']): FarmingCalendarTemplate {
    return FARMING_CALENDAR_TEMPLATES.find((template) => template.id === templateId) ?? FARMING_CALENDAR_TEMPLATES[0]
}
