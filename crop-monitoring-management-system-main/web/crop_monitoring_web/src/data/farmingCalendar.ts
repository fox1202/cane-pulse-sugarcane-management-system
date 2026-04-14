export interface FarmingCalendarTask {
    month: number
    weekNumber: number
    weekLabel: string
    activity: string
}

export interface FarmingCalendarGrowthStage {
    key: string
    title: string
    startWeek: number
    endWeek: number
    summary: string
    activityFocus: string[]
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
    growthStages: FarmingCalendarGrowthStage[]
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
        growthStages: [
            {
                key: 'plant-establishment',
                title: 'Establishment',
                startWeek: 1,
                endWeek: 4,
                summary: 'Bud germination, emergence, and early stand establishment set the crop up for uniform growth.',
                activityFocus: [
                    'Keep irrigation even and watch emergence closely.',
                    'Check stand establishment and early weed pressure.',
                    'Prepare soil results and inputs before the first nutrient split.',
                ],
            },
            {
                key: 'plant-tillering',
                title: 'Tillering',
                startWeek: 5,
                endWeek: 8,
                summary: 'The crop builds tillers and early canopy, so nutrient timing and weed control matter most here.',
                activityFocus: [
                    'Apply the early post-emergent herbicide.',
                    'Apply the first and second nitrogen and potassium splits.',
                    'Monitor tiller build-up and close any early growth gaps.',
                ],
            },
            {
                key: 'plant-grand-growth',
                title: 'Grand Growth',
                startWeek: 9,
                endWeek: 16,
                summary: 'Rapid canopy expansion and stalk extension drive biomass accumulation in this phase.',
                activityFocus: [
                    'Apply the late nitrogen split where the calendar calls for it.',
                    'Follow up with herbicide and hoeing where weeds remain active.',
                    'Maintain stable irrigation to support vigorous cane growth.',
                ],
            },
            {
                key: 'plant-ripening',
                title: 'Ripening and Maturity',
                startWeek: 17,
                endWeek: 60,
                summary: 'The crop shifts from bulk growth into ripening, field conditioning, and harvest readiness.',
                activityFocus: [
                    'Keep checking crop health and late stress signals.',
                    'Balance irrigation carefully as the crop moves toward maturity.',
                    'Plan harvest timing, access, and field logistics.',
                ],
            },
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
        growthStages: [
            {
                key: 'ratoon-recovery',
                title: 'Shoot Recovery',
                startWeek: 1,
                endWeek: 4,
                summary: 'Fresh ratoon shoots recover from the cut and rebuild the stool for the next cycle.',
                activityFocus: [
                    'Check stool recovery and keep moisture steady after the cut.',
                    'Follow up soil analysis results and confirm early nutrient needs.',
                    'Keep the field clean while the ratoon stand is re-establishing.',
                ],
            },
            {
                key: 'ratoon-tillering',
                title: 'Tillering',
                startWeek: 5,
                endWeek: 8,
                summary: 'Ratoon stools build productive tillers, so nutrition and early protection are the priorities.',
                activityFocus: [
                    'Apply the first and second nitrogen and potassium splits.',
                    'Watch for uneven regrowth or nutrient deficiency across the stool.',
                    'Protect the young canopy from weed competition.',
                ],
            },
            {
                key: 'ratoon-grand-growth',
                title: 'Grand Growth',
                startWeek: 9,
                endWeek: 16,
                summary: 'The ratoon canopy expands fast and the crop pushes rapid stalk extension.',
                activityFocus: [
                    'Apply the late nitrogen split where it is still needed.',
                    'Apply post-emergent herbicide and hoeing where weeds survive.',
                    'Maintain irrigation to support fast cane growth.',
                ],
            },
            {
                key: 'ratoon-ripening',
                title: 'Ripening and Harvest Prep',
                startWeek: 17,
                endWeek: 52,
                summary: 'The ratoon crop moves into ripening, field monitoring, and preparation for the next harvest cut.',
                activityFocus: [
                    'Monitor ripening progress and watch for lodging or stress.',
                    'Balance irrigation with the expected harvest window.',
                    'Prepare harvest timing, haulage access, and field readiness.',
                ],
            },
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

export interface HarvestProximityTask {
    offsetDays: number
    weekLabel: string
    activity: string
}

export const HARVEST_PROXIMITY_TASKS: HarvestProximityTask[] = [
    {
        offsetDays: -84,
        weekLabel: '12 wks to harvest',
        activity: 'Request crushing allocation and confirm harvest scheduling with the mill.',
    },
    {
        offsetDays: -56,
        weekLabel: '8 wks to harvest',
        activity: 'Begin dry-off irrigation management – reduce irrigation in the lead-up to harvest.',
    },
    {
        offsetDays: -42,
        weekLabel: '6 wks to harvest',
        activity: 'Conduct final eldana, smut, and pest scouting before harvest.',
    },
    {
        offsetDays: -28,
        weekLabel: '4 wks to harvest',
        activity: 'Confirm burning program, haulage access, and field readiness for harvest.',
    },
    {
        offsetDays: -14,
        weekLabel: '2 wks to harvest',
        activity: 'Complete final dry-off and prepare burning and haulage logistics.',
    },
    {
        offsetDays: 0,
        weekLabel: 'Harvest',
        activity: 'Burning, cutting, and haulage operations commence.',
    },
]
