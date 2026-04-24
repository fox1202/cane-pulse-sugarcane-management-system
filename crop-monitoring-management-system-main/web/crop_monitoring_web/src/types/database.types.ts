// Database type definitions matching Supabase schema
import { UserRole } from './auth.types';

export interface Profile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: UserRole;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface Block {
    id: string;
    block_id: string;
    name?: string;
    geom: any; // GeoJSON Polygon/MultiPolygon
    created_at: string;
    created_by: string;
}

export interface Observation {
    id: string;
    client_uuid?: string;
    collector_id: string;
    section_name: string;
    block_id: string;
    field_name: string;
    latitude: number;
    longitude: number;
    gps_accuracy: number;
    date_recorded: string;
    created_at: string;
}

export interface CropInformation {
    id: string;
    observation_id: string;
    crop_type: string;
    ratoon_number: number;
    variety: string;
    ploughing_date?: string;
    planting_date: string;
    expected_harvest_date: string;
    crop_stage: string;
}

export interface CropMonitoring {
    id: string;
    observation_id: string;
    stress: string;
    remarks: string;
}

export interface SoilCharacteristics {
    id: string;
    observation_id: string;
    soil_type: string;
    soil_texture: string;
    soil_ph: number;
    organic_matter: number;
    drainage_class: string;
}

export interface IrrigationManagement {
    id: string;
    observation_id: string;
    irrigation_type: string;
    irrigation_date: string;
    irrigation_volume: number;
    soil_moisture_percentage: number;
    water_source: string;
}

export interface NutrientManagement {
    id: string;
    observation_id: string;
    fertilizer_type: string;
    application_date: string;
    application_rate: number;
    npk_ratio: string;
}

export interface FertilizerApplication {
    loop_number?: number;
    fertilizer_type?: string;
    application_date?: string;
    application_rate?: number;
    foliar_sampling_date?: string;
}

export interface HerbicideApplication {
    loop_number?: number;
    herbicide_name?: string;
    application_date?: string;
    application_rate?: number;
}

export interface FertilizerApplicationRecord {
    field_name: string;
    fertilizer_applications?: FertilizerApplication[];
    herbicide_applications?: HerbicideApplication[];
    foliar_sampling_date?: string;
    collector_id?: string;
    remarks?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CropProtection {
    id: string;
    observation_id: string;
    weed_type: string;
    weed_level: string;
    pest_type: string;
    pest_severity: string;
    disease_type: string;
    disease_severity: string;
    remarks: string;
}

export interface ControlMethods {
    id: string;
    observation_id: string;
    weed_control: string;
    pest_control: string;
    disease_control: string;
}

export interface HarvestInformation {
    id: string;
    observation_id: string;
    harvest_date: string;
    yield: number;
    harvest_method: string;
}

export interface ResidualManagement {
    id: string;
    observation_id: string;
    residue_type: string;
    management_method: string;
    remarks: string;
}

export interface ObservationImage {
    id: string;
    observation_id: string;
    image_url: string;
    storage_path?: string;
    taken_at: string;
    uploaded_by: string;
}

export interface Field {
    id?: string;
    field_name: string;
    section_name: string;
    block_id: string;
    area?: number;
    latitude: number;
    longitude: number;
    irrigation_type?: string;
    water_source?: string;
    tam_mm?: string;
    tamm_area?: number;
    soil_type?: string;
    created_at?: string;
    created_by?: string;
    date_recorded?: string;
    crop_type?: string;
    latest_variety?: string;
    latest_stage?: string;
    latest_stress?: string;
    latest_moisture?: number;
    latest_irrigation_type?: string;
    latest_pest_control?: string;
    latest_disease_control?: string;
    latest_weed_control?: string;
    latest_remarks?: string;
    latest_image?: string;
    observation_count: number;
    is_sprayed?: boolean;
    is_synced?: boolean;
    last_spray_date?: string;
    latest_observation_date?: string;
    local_updated_at?: string;
    updated_at?: string;
    geom?: any;
}

export interface FieldWithGeom extends Field {
    geom?: any; // PostGIS GeoJSON or similar
}

export interface ObservationEntryForm {
    id: number | string;
    client_uuid?: string;
    collector_id?: string;
    selected_field?: string;
    section_name: string;
    field_name: string;
    field_id?: string;
    block_id?: string;
    area?: number;
    block_size?: number;
    spatial_data?: any;
    geom_polygon?: any;
    latitude?: number;
    longitude?: number;
    gps_accuracy?: number;
    date_recorded: string;
    trial_number?: string | number;
    trial_name?: string;
    contact_person?: string;
    phone_country_code?: string;
    phone_number?: string;
    crop_type?: string;
    crop_class?: string;
    variety?: string;
    ploughing_date?: string;
    planting_date?: string;
    soil_sampling_date?: string;
    soil_test_pdf_url?: string;
    foliar_analysis_pdf_url?: string;
    final_eldana_survey_pdf_url?: string;
    previous_cutting_date?: string;
    cutting_date?: string;
    expected_harvest_date?: string;
    irrigation_type?: string;
    water_source?: string;
    tam_mm?: string;
    tamm_area?: number;
    soil_type?: string;
    soil_ph?: number;
    field_remarks?: string;
    stress?: string;
    residue_type?: string;
    residue_management_method?: string;
    residual_management_remarks?: string;
    fertilizer_type?: string;
    nutrient_application_date?: string;
    application_rate?: number;
    fertilizer_applications?: FertilizerApplication[];
    foliar_sampling_date?: string;
    herbicide_name?: string;
    weed_application_date?: string;
    weed_application_rate?: number;
    herbicide_applications?: HerbicideApplication[];
    pest_remarks?: string;
    disease_remarks?: string;
    harvest_date?: string;
    yield?: number;
    harvest_method?: string;
    quality_remarks?: string;
    remarks?: string;
    source_table?: string;
    created_at: string;
    updated_at: string;
}

export interface SugarcaneMonitoringRecord {
    id: string;
    field_name: string;
    field_id?: string;
    section_name?: string;
    block_id?: string;
    area?: number;
    geom_polygon?: any;
    latitude?: number;
    longitude?: number;
    date_recorded: string;
    crop_type?: string;
    crop_class?: string;
    variety?: string;
    ratoon_number?: number;
    crop_stage?: string;
    ploughing_date?: string;
    planting_date?: string;
    soil_sampling_date?: string;
    soil_test_pdf_url?: string;
    soil_test_pdf_path?: string;
    foliar_analysis_pdf_url?: string;
    final_eldana_survey_pdf_url?: string;
    previous_cutting?: string;
    previous_cutting_date?: string;
    expected_harvest_date?: string;
    stress?: string;
    tam_mm?: string;
    soil_type?: string;
    soil_texture?: string;
    soil_ph?: number;
    organic_matter?: number;
    drainage_class?: string;
    irrigation_type?: string;
    irrigation_date?: string;
    irrigation_volume?: number;
    soil_moisture_percentage?: number;
    water_source?: string;
    trial_number?: string;
    trial_name?: string;
    contact_person?: string;
    field_remarks?: string;
    fertilizer_type?: string;
    fertilizer_application_date?: string;
    nutrient_application_date?: string;
    application_rate?: number;
    fertilizer_applications?: FertilizerApplication[];
    npk_ratio?: string;
    foliar_sampling_date?: string;
    herbicide_name?: string;
    weed_application_date?: string;
    weed_application_rate?: number;
    herbicide_applications?: HerbicideApplication[];
    weed_type?: string;
    weed_level?: string;
    pest_type?: string;
    pest_severity?: string;
    disease_type?: string;
    disease_severity?: string;
    pest_remarks?: string;
    disease_remarks?: string;
    weed_control?: string;
    pest_control?: string;
    disease_control?: string;
    harvest_date?: string;
    harvest_yield?: number;
    yield?: number;
    harvest_method?: string;
    quality_remarks?: string;
    residue_type?: string;
    residue_management_method?: string;
    residual_management_remarks?: string;
    collector_id?: string;
    remarks?: string;
    image_url?: string;
    well_known_text?: string;
    raw_values?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

// Full observation with all related data
export interface FullObservation extends Observation {
    crop_information?: CropInformation;
    crop_monitoring?: CropMonitoring;
    soil_characteristics?: SoilCharacteristics;
    irrigation_management?: IrrigationManagement;
    nutrient_management?: NutrientManagement;
    crop_protection?: CropProtection;
    control_methods?: ControlMethods;
    harvest?: HarvestInformation;
    residual_management?: ResidualManagement;
    images?: ObservationImage[];
}

// Filter types
export interface ObservationFilters {
    cropType?: string;
    variety?: string;
    fieldName?: string;
    section?: string;
    block?: string;
    startDate?: string;
    endDate?: string;
    stressLevel?: string;
}
