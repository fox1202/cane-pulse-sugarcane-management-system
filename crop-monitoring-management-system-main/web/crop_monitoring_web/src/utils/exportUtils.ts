import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import type { FullObservation } from '@/types/database.types';
import type { MobileObservationEntryFormFields, MobileObservationRecord } from '@/services/database.service';
import { format } from 'date-fns';

type ExportObservationRecord = FullObservation | MobileObservationRecord
type AutoTableCapableDoc = jsPDF & { lastAutoTable?: { finalY?: number } }

function isMobileObservationRecord(observation: ExportObservationRecord): observation is MobileObservationRecord {
    return 'source_table' in observation
}

function hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    return true
}

function toDisplayValue(value: unknown): string {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number') return Number.isNaN(value) ? '-' : String(value)
    if (typeof value === 'string') return value.trim().length > 0 ? value : '-'
    return String(value)
}

function formatDateTime(value?: string): string | undefined {
    if (!value) return undefined

    try {
        return format(new Date(value), 'MMM dd, yyyy HH:mm')
    } catch {
        return value
    }
}

function formatSimpleDate(value?: string): string | undefined {
    if (!value) return undefined

    try {
        return format(new Date(value), 'MMM dd, yyyy')
    } catch {
        return value
    }
}

function formatPhoneNumber(entryForm?: MobileObservationEntryFormFields): string | undefined {
    if (!entryForm) return undefined

    const parts = [entryForm.phone_country_code, entryForm.phone_number]
        .filter((value) => typeof value === 'string' && value.trim().length > 0)

    return parts.length > 0 ? parts.join(' ') : undefined
}

function formatSourceLabel(sourceTable?: string): string {
    if (!sourceTable) return 'observations'
    if (sourceTable === 'sugarcane_monitoring') return 'Monitoring record'
    return sourceTable.replace(/_/g, ' ')
}

function buildRows(items: Array<{ label: string; value: unknown }>): Array<[string, string]> {
    return items
        .filter((item) => hasValue(item.value))
        .map((item) => [item.label, toDisplayValue(item.value)])
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 20, y)
    doc.setDrawColor(200, 200, 200)
    doc.line(20, y + 2, pageWidth - 20, y + 2)
}

function getNextSectionY(doc: AutoTableCapableDoc, fallbackY: number): number {
    return (doc.lastAutoTable?.finalY ?? fallbackY) + 15
}

function makeFileSafe(value: string): string {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    return normalized || 'record'
}

function hasCoordinateValue(value?: number): boolean {
    return typeof value === 'number' && !Number.isNaN(value) && value !== 0
}

/**
 * Export observations to CSV
 */
export const exportToCSV = (data: ExportObservationRecord[], filename = 'observations_export.csv') => {
    // Flatten data for CSV
    const flatData = data.map((obs) => {
        const entryForm = isMobileObservationRecord(obs) ? obs.entry_form : undefined

        return {
            ID: obs.id,
            'Client UUID': obs.client_uuid || '',
            Source: isMobileObservationRecord(obs) ? obs.source_table : 'observations',
            Date: formatDateTime(obs.date_recorded) || '',
            Field: obs.field_name,
            Section: obs.section_name,
            Block: obs.block_id,
            'Crop Type': entryForm?.crop_class || obs.crop_information?.crop_type || '',
            Variety: entryForm?.variety || obs.crop_information?.variety || '',
            Stage: obs.crop_information?.crop_stage || '',
            Stress: obs.crop_monitoring?.stress || 'None',
            'Soil Type': entryForm?.soil_type || obs.soil_characteristics?.soil_type || '',
            'pH': entryForm?.soil_ph ?? obs.soil_characteristics?.soil_ph ?? '',
            'Irrigation Type': entryForm?.irrigation_type || obs.irrigation_management?.irrigation_type || '',
            'Water Source': entryForm?.water_source || obs.irrigation_management?.water_source || '',
            'TAMM Area (mm)': entryForm?.tamm_area ?? '',
            'Trial Number': entryForm?.trial_number ?? '',
            'Trial Name': entryForm?.trial_name || '',
            'Contact Person': entryForm?.contact_person || '',
            'Phone Number': formatPhoneNumber(entryForm) || '',
            'Planting Date': formatSimpleDate(entryForm?.planting_date || obs.crop_information?.planting_date) || '',
            'Cutting Date': formatSimpleDate(entryForm?.cutting_date) || '',
            'Expected Harvest Date': formatSimpleDate(entryForm?.expected_harvest_date || obs.crop_information?.expected_harvest_date) || '',
            Remarks: entryForm?.remarks || obs.crop_monitoring?.remarks || '',
            'Moisture %': obs.irrigation_management?.soil_moisture_percentage ?? '',
            'Irrigation Vol': obs.irrigation_management?.irrigation_volume ?? '',
            Fertilizer: obs.nutrient_management?.fertilizer_type || '',
            'App Rate': obs.nutrient_management?.application_rate ?? '',
            Yield: obs.harvest?.yield ?? '',
            Latitude: obs.latitude,
            Longitude: obs.longitude
        }
    })

    const csv = Papa.unparse(flatData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Generate PDF Report for a single observation
 */
export const generatePDFReport = (obs: ExportObservationRecord) => {
    const doc = new jsPDF();
    const tableDoc = doc as AutoTableCapableDoc
    const pageWidth = doc.internal.pageSize.getWidth();
    const entryForm = isMobileObservationRecord(obs) ? obs.entry_form : undefined
    const sourceLabel = formatSourceLabel(isMobileObservationRecord(obs) ? obs.source_table : undefined)
    const phoneNumber = formatPhoneNumber(entryForm)
    const recordId = obs.client_uuid || obs.id
    const summaryFieldName = obs.field_name || entryForm?.trial_name || 'record'

    // Header
    doc.setFillColor(46, 125, 50); // Primary green
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Field Observation Report', 20, 25);

    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth - 20, 25, { align: 'right' });

    // Section 1: Overview
    addSectionTitle(doc, '1. Observation Overview', 55);
    autoTable(doc, {
        startY: 65,
        head: [['Field', 'Value']],
        body: buildRows([
            { label: 'Source Table', value: sourceLabel },
            { label: 'Record ID', value: recordId },
            { label: 'Collector ID', value: obs.collector_id },
            { label: 'Field Name', value: obs.field_name },
            { label: 'Section', value: obs.section_name },
            { label: 'Block', value: obs.block_id },
            { label: 'Date Recorded', value: formatDateTime(obs.date_recorded) },
            { label: 'Created At', value: formatDateTime(obs.created_at) },
        ]),
        theme: 'grid',
        headStyles: { fillColor: [46, 125, 50] },
        columnStyles: {
            0: { cellWidth: 56, fontStyle: 'bold' },
        },
    });

    const cropRows = buildRows([
        { label: 'Crop Class', value: entryForm?.crop_class || obs.crop_information?.crop_type },
        { label: 'Variety', value: entryForm?.variety || obs.crop_information?.variety },
        { label: 'Growth Stage', value: obs.crop_information?.crop_stage },
        { label: 'Stress Level', value: obs.crop_monitoring?.stress },
    ])

    if (cropRows.length > 0) {
        const cropSectionY = getNextSectionY(tableDoc, 65)
        addSectionTitle(doc, '2. Crop Summary', cropSectionY)
        autoTable(doc, {
            startY: cropSectionY + 10,
            head: [['Field', 'Value']],
            body: cropRows,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] },
            columnStyles: {
                0: { cellWidth: 56, fontStyle: 'bold' },
            },
        })
    }

    const fieldRecordRows = buildRows([
        { label: 'Date Recorded', value: formatSimpleDate(entryForm?.date_recorded || obs.date_recorded) },
        { label: 'Trial Number', value: entryForm?.trial_number },
        { label: 'Trial Name', value: entryForm?.trial_name },
        { label: 'Contact Person', value: entryForm?.contact_person },
        { label: 'Phone Number', value: phoneNumber },
    ])

    if (fieldRecordRows.length > 0) {
        const fieldRecordSectionY = getNextSectionY(tableDoc, 65)
        addSectionTitle(doc, '3. Field Record Form', fieldRecordSectionY)
        autoTable(doc, {
            startY: fieldRecordSectionY + 10,
            head: [['Field', 'Value']],
            body: fieldRecordRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            columnStyles: {
                0: { cellWidth: 56, fontStyle: 'bold' },
            },
        })
    }

    const fieldConditionRows = buildRows([
        { label: 'Irrigation Type', value: entryForm?.irrigation_type || obs.irrigation_management?.irrigation_type },
        { label: 'Water Source', value: entryForm?.water_source || obs.irrigation_management?.water_source },
        { label: 'TAMM Area (mm)', value: entryForm?.tamm_area },
        { label: 'Soil Type', value: entryForm?.soil_type || obs.soil_characteristics?.soil_type },
        { label: 'pH', value: entryForm?.soil_ph ?? obs.soil_characteristics?.soil_ph },
        { label: 'Planting Date', value: formatSimpleDate(entryForm?.planting_date || obs.crop_information?.planting_date) },
        { label: 'Cutting Date', value: formatSimpleDate(entryForm?.cutting_date) },
        { label: 'Expected Harvest Date', value: formatSimpleDate(entryForm?.expected_harvest_date || obs.crop_information?.expected_harvest_date) },
        { label: 'Remarks', value: entryForm?.remarks || obs.crop_monitoring?.remarks },
    ])

    if (fieldConditionRows.length > 0) {
        const conditionsSectionY = getNextSectionY(tableDoc, 65)
        addSectionTitle(doc, '4. Field Conditions', conditionsSectionY)
        autoTable(doc, {
            startY: conditionsSectionY + 10,
            head: [['Field', 'Value']],
            body: fieldConditionRows,
            theme: 'grid',
            headStyles: { fillColor: [46, 125, 50] },
            columnStyles: {
                0: { cellWidth: 56, fontStyle: 'bold' },
            },
        })
    }

    const geoRows = buildRows([
        { label: 'Latitude', value: hasCoordinateValue(obs.latitude) ? obs.latitude.toFixed(5) : undefined },
        { label: 'Longitude', value: hasCoordinateValue(obs.longitude) ? obs.longitude.toFixed(5) : undefined },
        { label: 'GPS Accuracy', value: typeof obs.gps_accuracy === 'number' && obs.gps_accuracy > 0 ? `${obs.gps_accuracy} m` : undefined },
        { label: 'Captured Images', value: obs.images?.length },
    ])

    if (geoRows.length > 0) {
        const geoSectionY = getNextSectionY(tableDoc, 65)
        addSectionTitle(doc, '5. Geospatial Summary', geoSectionY)
        autoTable(doc, {
            startY: geoSectionY + 10,
            head: [['Field', 'Value']],
            body: geoRows,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
            columnStyles: {
                0: { cellWidth: 56, fontStyle: 'bold' },
            },
        })
    }

    // GPS footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`GPS: ${obs.latitude}, ${obs.longitude} | Source: ${sourceLabel} | ID: ${recordId}`, 20, doc.internal.pageSize.getHeight() - 10);

    doc.save(`Observation_Report_${makeFileSafe(summaryFieldName)}_${makeFileSafe(String(recordId).slice(0, 12))}.pdf`);
};

/**
 * Export all data from all Supabase tables to CSV files
 */
export const exportAllDataToCSV = async () => {
    try {
        const { fetchAllData } = await import('@/services/database.service');
        const allData = await fetchAllData();

        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');

        // Export each table to separate CSV
        const exports = [
            { name: 'observations', data: allData.observations.map(obs => ({
                id: obs.id,
                client_uuid: obs.client_uuid,
                collector_id: obs.collector_id,
                section_name: obs.section_name,
                block_id: obs.block_id,
                field_name: obs.field_name,
                latitude: obs.latitude,
                longitude: obs.longitude,
                gps_accuracy: obs.gps_accuracy,
                date_recorded: obs.date_recorded,
                created_at: obs.created_at
            }))},
            { name: 'blocks', data: allData.blocks },
            { name: 'crop_information', data: allData.cropInformation },
            { name: 'crop_monitoring', data: allData.cropMonitoring },
            { name: 'soil_characteristics', data: allData.soilCharacteristics },
            { name: 'irrigation_management', data: allData.irrigationManagement },
            { name: 'nutrient_management', data: allData.nutrientManagement },
            { name: 'crop_protection', data: allData.cropProtection },
            { name: 'control_methods', data: allData.controlMethods },
            { name: 'harvest_information', data: allData.harvestInformation },
            { name: 'residual_management', data: allData.residualManagement },
            { name: 'observation_images', data: allData.observationImages },
            { name: 'profiles', data: allData.profiles }
        ];

        exports.forEach(({ name, data }) => {
            if (data && data.length > 0) {
                const csv = Papa.unparse(data);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${name}_${timestamp}.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        });

        return { success: true, exportedTables: exports.filter(e => e.data && e.data.length > 0).map(e => e.name) };
    } catch (error) {
        console.error('Error exporting all data:', error);
        throw error;
    }
};

/**
 * Export all data to a single comprehensive CSV with joined information
 */
export const exportComprehensiveDataToCSV = async () => {
    try {
        const { fetchAllData } = await import('@/services/database.service');
        const allData = await fetchAllData();

        // Create a comprehensive dataset by joining observations with related data
        const comprehensiveData = allData.observations.map(obs => ({
            // Observation basics
            observation_id: obs.id,
            client_uuid: obs.client_uuid,
            collector_id: obs.collector_id,
            section_name: obs.section_name,
            block_id: obs.block_id,
            field_name: obs.field_name,
            latitude: obs.latitude,
            longitude: obs.longitude,
            gps_accuracy: obs.gps_accuracy,
            date_recorded: obs.date_recorded,
            created_at: obs.created_at,

            // Crop Information
            crop_type: obs.crop_information?.crop_type,
            ratoon_number: obs.crop_information?.ratoon_number,
            variety: obs.crop_information?.variety,
            planting_date: obs.crop_information?.planting_date,
            expected_harvest_date: obs.crop_information?.expected_harvest_date,
            crop_stage: obs.crop_information?.crop_stage,

            // Crop Monitoring
            stress: obs.crop_monitoring?.stress,
            monitoring_remarks: obs.crop_monitoring?.remarks,

            // Soil Characteristics
            soil_type: obs.soil_characteristics?.soil_type,
            soil_texture: obs.soil_characteristics?.soil_texture,
            soil_ph: obs.soil_characteristics?.soil_ph,
            organic_matter: obs.soil_characteristics?.organic_matter,
            drainage_class: obs.soil_characteristics?.drainage_class,

            // Irrigation Management
            irrigation_type: obs.irrigation_management?.irrigation_type,
            irrigation_date: obs.irrigation_management?.irrigation_date,
            irrigation_volume: obs.irrigation_management?.irrigation_volume,
            soil_moisture_percentage: obs.irrigation_management?.soil_moisture_percentage,
            water_source: obs.irrigation_management?.water_source,

            // Nutrient Management
            fertilizer_type: obs.nutrient_management?.fertilizer_type,
            fertilizer_application_date: obs.nutrient_management?.application_date,
            application_rate: obs.nutrient_management?.application_rate,
            npk_ratio: obs.nutrient_management?.npk_ratio,

            // Crop Protection
            weed_type: obs.crop_protection?.weed_type,
            weed_level: obs.crop_protection?.weed_level,
            pest_type: obs.crop_protection?.pest_type,
            pest_severity: obs.crop_protection?.pest_severity,
            disease_type: obs.crop_protection?.disease_type,
            disease_severity: obs.crop_protection?.disease_severity,
            protection_remarks: obs.crop_protection?.remarks,

            // Control Methods
            weed_control: obs.control_methods?.weed_control,
            pest_control: obs.control_methods?.pest_control,
            disease_control: obs.control_methods?.disease_control,

            // Harvest Information
            harvest_date: obs.harvest?.harvest_date,
            yield: obs.harvest?.yield,
            harvest_method: obs.harvest?.harvest_method,

            // Residual Management
            residue_type: obs.residual_management?.residue_type,
            management_method: obs.residual_management?.management_method,
            residual_remarks: obs.residual_management?.remarks,

            // Images count
            image_count: obs.images?.length || 0
        }));

        const csv = Papa.unparse(comprehensiveData);
        const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `comprehensive_data_export_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        return { success: true, recordCount: comprehensiveData.length };
    } catch (error) {
        console.error('Error exporting comprehensive data:', error);
        throw error;
    }
};
