import type {
    ControlMethods,
    CropInformation,
    CropMonitoring,
    CropProtection,
    FullObservation,
    HarvestInformation,
    IrrigationManagement,
    NutrientManagement,
    ResidualManagement,
    SoilCharacteristics,
} from '@/types/database.types'

export interface ObservationDraftSeed extends Partial<Omit<
    FullObservation,
    | 'crop_information'
    | 'crop_monitoring'
    | 'soil_characteristics'
    | 'irrigation_management'
    | 'nutrient_management'
    | 'crop_protection'
    | 'control_methods'
    | 'harvest'
    | 'residual_management'
>> {
    crop_information?: Partial<CropInformation>
    crop_monitoring?: Partial<CropMonitoring>
    soil_characteristics?: Partial<SoilCharacteristics>
    irrigation_management?: Partial<IrrigationManagement>
    nutrient_management?: Partial<NutrientManagement>
    crop_protection?: Partial<CropProtection>
    control_methods?: Partial<ControlMethods>
    harvest?: Partial<HarvestInformation>
    residual_management?: Partial<ResidualManagement>
}

function mergeRequired<T>(base: T, overrides?: Partial<T>): T {
    return {
        ...base,
        ...overrides,
    }
}

export function createEmptyObservationDraft(collectorId: string): FullObservation {
    return {
        id: '',
        client_uuid: '',
        collector_id: collectorId,
        section_name: '',
        block_id: '',
        field_name: '',
        latitude: 0,
        longitude: 0,
        gps_accuracy: 0,
        date_recorded: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        crop_information: {
            id: '',
            observation_id: '',
            crop_type: '',
            ratoon_number: 0,
            variety: '',
            planting_date: '',
            expected_harvest_date: '',
            crop_stage: '',
        },
        crop_monitoring: {
            id: '',
            observation_id: '',
            canopy_cover: 0,
            crop_vigor: '',
            stress: '',
            remarks: '',
        },
        soil_characteristics: {
            id: '',
            observation_id: '',
            soil_type: '',
            soil_texture: '',
            soil_ph: 0,
            organic_matter: 0,
            drainage_class: '',
        },
        irrigation_management: {
            id: '',
            observation_id: '',
            irrigation_type: '',
            irrigation_date: '',
            irrigation_volume: 0,
            soil_moisture_percentage: 0,
            water_source: '',
        },
        nutrient_management: {
            id: '',
            observation_id: '',
            fertilizer_type: '',
            application_date: '',
            application_rate: 0,
            npk_ratio: '',
        },
        crop_protection: {
            id: '',
            observation_id: '',
            weed_type: '',
            weed_level: '',
            pest_type: '',
            pest_severity: '',
            disease_type: '',
            disease_severity: '',
            remarks: '',
        },
        control_methods: {
            id: '',
            observation_id: '',
            weed_control: '',
            pest_control: '',
            disease_control: '',
        },
        harvest: {
            id: '',
            observation_id: '',
            harvest_date: '',
            yield: 0,
            harvest_method: '',
        },
        residual_management: {
            id: '',
            observation_id: '',
            residue_type: '',
            management_method: '',
            remarks: '',
        },
    }
}

export function buildObservationDraft(
    collectorId: string,
    seed?: ObservationDraftSeed | null
): FullObservation {
    const empty = createEmptyObservationDraft(collectorId)

    if (!seed) {
        return empty
    }

    return {
        ...empty,
        ...seed,
        collector_id: seed.collector_id || collectorId,
        crop_information: mergeRequired(empty.crop_information, seed.crop_information),
        crop_monitoring: mergeRequired(empty.crop_monitoring, seed.crop_monitoring),
        soil_characteristics: mergeRequired(empty.soil_characteristics, seed.soil_characteristics),
        irrigation_management: mergeRequired(empty.irrigation_management, seed.irrigation_management),
        nutrient_management: mergeRequired(empty.nutrient_management, seed.nutrient_management),
        crop_protection: mergeRequired(empty.crop_protection, seed.crop_protection),
        control_methods: mergeRequired(empty.control_methods, seed.control_methods),
        harvest: mergeRequired(empty.harvest, seed.harvest),
        residual_management: mergeRequired(empty.residual_management, seed.residual_management),
    }
}
