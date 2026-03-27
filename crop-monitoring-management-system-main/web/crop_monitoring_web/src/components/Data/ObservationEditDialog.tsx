import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import { FullObservation } from '@/types/database.types';
import {
    fetchPredefinedFields,
    getPredefinedFieldByName,
    type PredefinedField,
    type MobileObservationRecord,
} from '@/services/database.service';
import { useAuth } from '@/contexts/AuthContext';
import { buildObservationDraft, type ObservationDraftSeed } from '@/utils/observationDraft';

type ObservationEditRecord = FullObservation | MobileObservationRecord

interface ObservationEditDialogProps {
    open: boolean;
    onClose: () => void;
    observation: ObservationEditRecord | null;
    onSave: (updatedObs: ObservationEditRecord) => Promise<void>;
    mode?: 'edit' | 'create';
}

function isMobileObservationRecord(observation: ObservationEditRecord): observation is MobileObservationRecord {
    return 'source_table' in observation
}

export const ObservationEditDialog: React.FC<ObservationEditDialogProps> = ({
    open,
    onClose,
    observation,
    onSave,
    mode = 'edit'
}) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<ObservationEditRecord | null>(null);
    const [predefinedFields, setPredefinedFields] = useState<PredefinedField[]>([]);
    const [isLoadingFields, setIsLoadingFields] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (mode === 'create') {
            setFormData(buildObservationDraft(user?.id || '', observation as ObservationDraftSeed | null));
        } else if (observation) {
            setFormData(JSON.parse(JSON.stringify(observation))); // Deep copy
        }
    }, [observation, mode, user?.id]);


    useEffect(() => {
        let isMounted = true;

        if (!open) return () => { };

        const loadPredefinedFields = async () => {
            setIsLoadingFields(true);
            try {
                const fields = await fetchPredefinedFields();
                if (isMounted) setPredefinedFields(fields);
            } catch (err) {
                if (isMounted) {
                    console.error('Failed to load predefined fields:', err);
                    setError('Failed to load predefined fields from backend registry.');
                }
            } finally {
                if (isMounted) setIsLoadingFields(false);
            }
        };

        loadPredefinedFields();

        return () => {
            isMounted = false;
        };
    }, [open]);

    const fieldOptions = React.useMemo(() => {
        if (!formData) return predefinedFields;
        const exists = predefinedFields.some((f) => f.field_name === formData.field_name);
        if (!formData.field_name || exists) return predefinedFields;

        return [{
            id: 'legacy-field',
            field_name: formData.field_name,
            section_name: formData.section_name,
            block_id: formData.block_id,
            latitude: formData.latitude,
            longitude: formData.longitude,
            observation_count: 0,
        }, ...predefinedFields];
    }, [predefinedFields, formData]);

    const selectedField = React.useMemo(
        () => getPredefinedFieldByName(fieldOptions, formData?.field_name),
        [fieldOptions, formData?.field_name]
    );

    // observation_entry_form table has been disconnected - all records are now from observations table
    const isObservationEntryFormRecord = false;

    const entryForm = isObservationEntryFormRecord && formData && isMobileObservationRecord(formData)
        ? (formData.entry_form ?? {})
        : undefined;

    const handleChange = (section: keyof FullObservation, field: string, value: any) => {
        if (!formData) return;

        setFormData(prev => {
            if (!prev) return null;
            // Handle top-level fields
            if (section === 'field_name' || section === 'section_name' || section === 'block_id') {
                return { ...prev, [field]: value };
            }
            // Handle nested fields
            return {
                ...prev,
                [section]: {
                    ...(prev[section] as any),
                    [field]: value
                }
            };
        });
    };

    const handleTopLevelChange = (field: keyof FullObservation, value: any) => {
        setFormData(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const handleEntryFormChange = (field: string, value: any) => {
        setFormData(prev => {
            if (!prev || !isMobileObservationRecord(prev)) return prev;

            return {
                ...prev,
                entry_form: {
                    ...(prev.entry_form ?? {}),
                    [field]: value,
                },
            };
        });
    };

    const handleFieldSelection = (fieldName: string) => {
        if (!formData) return;
        const match = getPredefinedFieldByName(fieldOptions, fieldName);

        setFormData(prev => {
            if (!prev) return null;

            if (!match) {
                return {
                    ...prev,
                    field_name: fieldName,
                };
            }

            const nextRecord: ObservationEditRecord = {
                ...prev,
                field_name: match.field_name,
                section_name: match.section_name,
                block_id: match.block_id,
                latitude: match.latitude ?? prev.latitude,
                longitude: match.longitude ?? prev.longitude,
                crop_information: {
                    ...(prev.crop_information as any),
                    crop_type: match.crop_type || prev.crop_information?.crop_type,
                }
            };

            // observation_entry_form table has been disconnected
            return nextRecord;
        });
    };

    const handleSubmit = async () => {
        if (!formData) return;
        setLoading(true);
        setError(null);
        try {
            const validFieldNames = new Set(fieldOptions.map((f) => f.field_name));
            if (!formData.field_name || !validFieldNames.has(formData.field_name)) {
                throw new Error('Please select a predefined field from the backend field registry.');
            }
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    if (!formData) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {mode === 'create' ? '➕ Create New Observation Record' : '✏️ Edit Observation Record'}
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>LOCATION</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Field Name (Predefined)"
                            value={formData.field_name || ''}
                            onChange={(e) => handleFieldSelection(e.target.value)}
                            disabled={isLoadingFields}
                            helperText={isLoadingFields ? 'Loading backend field registry...' : 'Collectors must select from predefined fields.'}
                        >
                            {fieldOptions.map((field) => (
                                <MenuItem key={`${field.block_id}-${field.field_name}`} value={field.field_name}>
                                    {field.field_name} ({field.block_id})
                                </MenuItem>
                            ))}
                        </TextField>
                        {isLoadingFields && (
                            <Typography variant="caption" sx={{ display: 'inline-flex', alignItems: 'center', mt: 0.5, gap: 0.6 }}>
                                <CircularProgress size={12} />
                                Loading fields...
                            </Typography>
                        )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <TextField
                            fullWidth
                            label="Block ID"
                            value={selectedField?.block_id || formData.block_id || ''}
                            InputProps={{ readOnly: true }}
                            disabled
                        />
                    </Grid>
                </Grid>

                {!isObservationEntryFormRecord && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>OBSERVATION DETAILS</Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Date Recorded"
                                    InputLabelProps={{ shrink: true }}
                                    value={String(formData.date_recorded || '').split('T')[0]}
                                    onChange={(e) => handleTopLevelChange('date_recorded', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="Latitude"
                                    value={formData.latitude ?? 0}
                                    onChange={(e) => handleTopLevelChange('latitude', Number(e.target.value) || 0)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 3 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="Longitude"
                                    value={formData.longitude ?? 0}
                                    onChange={(e) => handleTopLevelChange('longitude', Number(e.target.value) || 0)}
                                />
                            </Grid>
                        </Grid>
                    </>
                )}

                {isObservationEntryFormRecord && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>MOBILE FORM DETAILS</Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Date Recorded"
                                    InputLabelProps={{ shrink: true }}
                                    value={entryForm?.date_recorded || formData.date_recorded || ''}
                                    onChange={(e) => handleEntryFormChange('date_recorded', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="Trial Number"
                                    value={entryForm?.trial_number ?? ''}
                                    onChange={(e) => handleEntryFormChange('trial_number', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Trial Name"
                                    value={entryForm?.trial_name || ''}
                                    onChange={(e) => handleEntryFormChange('trial_name', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Contact Person"
                                    value={entryForm?.contact_person || ''}
                                    onChange={(e) => handleEntryFormChange('contact_person', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Phone Country Code"
                                    value={entryForm?.phone_country_code || ''}
                                    onChange={(e) => handleEntryFormChange('phone_country_code', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    value={entryForm?.phone_number || ''}
                                    onChange={(e) => handleEntryFormChange('phone_number', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Cutting Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={entryForm?.cutting_date || ''}
                                    onChange={(e) => handleEntryFormChange('cutting_date', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="TAMM Area (mm)"
                                    value={entryForm?.tamm_area ?? ''}
                                    onChange={(e) => handleEntryFormChange('tamm_area', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Remarks"
                                    multiline
                                    rows={3}
                                    value={entryForm?.remarks || ''}
                                    onChange={(e) => handleEntryFormChange('remarks', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </>
                )}

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>CROP INFORMATION</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Crop Type"
                            value={formData.crop_information?.crop_type || ''}
                            onChange={(e) => handleChange('crop_information', 'crop_type', e.target.value)}
                        />
                    </Grid>
                    {isObservationEntryFormRecord ? (
                        <>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Planting Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={entryForm?.planting_date || formData.crop_information?.planting_date || ''}
                                    onChange={(e) => handleEntryFormChange('planting_date', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Expected Harvest Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={entryForm?.expected_harvest_date || formData.crop_information?.expected_harvest_date || ''}
                                    onChange={(e) => handleEntryFormChange('expected_harvest_date', e.target.value)}
                                />
                            </Grid>
                        </>
                    ) : (
                        <Grid size={{ xs: 12, md: 6 }}>
                            <TextField
                                select
                                fullWidth
                                label="Growth Stage"
                                value={formData.crop_information?.crop_stage || ''}
                                onChange={(e) => handleChange('crop_information', 'crop_stage', e.target.value)}
                            >
                                {['Germination', 'Tillering', 'Grand Growth', 'Maturity', 'Harvesting'].map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}
                </Grid>

                {!isObservationEntryFormRecord && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>MONITORING</Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="Canopy Cover (%)"
                                    value={formData.crop_monitoring?.canopy_cover || 0}
                                    onChange={(e) => handleChange('crop_monitoring', 'canopy_cover', parseFloat(e.target.value))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Crop Vigor"
                                    value={formData.crop_monitoring?.crop_vigor || ''}
                                    onChange={(e) => handleChange('crop_monitoring', 'crop_vigor', e.target.value)}
                                >
                                    {['Excellent', 'Good', 'Fair', 'Poor'].map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Stress Level"
                                    value={formData.crop_monitoring?.stress || ''}
                                    onChange={(e) => handleChange('crop_monitoring', 'stress', e.target.value)}
                                >
                                    {['None', 'Water', 'Nutrient', 'Pest', 'Disease'].map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>
                    </>
                )}

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>SOIL CHARACTERISTICS</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Soil Type"
                            value={formData.soil_characteristics?.soil_type || ''}
                            onChange={(e) => handleChange('soil_characteristics', 'soil_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="pH Level"
                            value={formData.soil_characteristics?.soil_ph || ''}
                            onChange={(e) => handleChange('soil_characteristics', 'soil_ph', parseFloat(e.target.value))}
                        />
                    </Grid>
                    {!isObservationEntryFormRecord && (
                        <>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Texture"
                                    value={formData.soil_characteristics?.soil_texture || ''}
                                    onChange={(e) => handleChange('soil_characteristics', 'soil_texture', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="Organic Matter (%)"
                                    value={formData.soil_characteristics?.organic_matter || ''}
                                    onChange={(e) => handleChange('soil_characteristics', 'organic_matter', parseFloat(e.target.value))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Drainage Class"
                                    value={formData.soil_characteristics?.drainage_class || ''}
                                    onChange={(e) => handleChange('soil_characteristics', 'drainage_class', e.target.value)}
                                />
                            </Grid>
                        </>
                    )}
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>IRRIGATION MANAGEMENT</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Irrigation Type"
                            value={formData.irrigation_management?.irrigation_type || ''}
                            onChange={(e) => handleChange('irrigation_management', 'irrigation_type', e.target.value)}
                        />
                    </Grid>
                    {isObservationEntryFormRecord ? (
                        <Grid size={{ xs: 12, md: 4 }}>
                            <TextField
                                fullWidth
                                label="Water Source"
                                value={formData.irrigation_management?.water_source || ''}
                                onChange={(e) => handleChange('irrigation_management', 'water_source', e.target.value)}
                            />
                        </Grid>
                    ) : (
                        <>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.irrigation_management?.irrigation_date || ''}
                                    onChange={(e) => handleChange('irrigation_management', 'irrigation_date', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="Soil Moisture (%)"
                                    value={formData.irrigation_management?.soil_moisture_percentage || 0}
                                    onChange={(e) => handleChange('irrigation_management', 'soil_moisture_percentage', parseFloat(e.target.value))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Water Source"
                                    value={formData.irrigation_management?.water_source || ''}
                                    onChange={(e) => handleChange('irrigation_management', 'water_source', e.target.value)}
                                />
                            </Grid>
                        </>
                    )}
                </Grid>

                {!isObservationEntryFormRecord && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>NUTRIENT MANAGEMENT</Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Application Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.nutrient_management?.application_date || ''}
                                    onChange={(e) => handleChange('nutrient_management', 'application_date', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="NPK Ratio"
                                    value={formData.nutrient_management?.npk_ratio || ''}
                                    onChange={(e) => handleChange('nutrient_management', 'npk_ratio', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </>
                )}

                {!isObservationEntryFormRecord && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>CROP PROTECTION</Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Weed Type"
                                    value={formData.crop_protection?.weed_type || ''}
                                    onChange={(e) => handleChange('crop_protection', 'weed_type', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Weed Level"
                                    value={formData.crop_protection?.weed_level || ''}
                                    onChange={(e) => handleChange('crop_protection', 'weed_level', e.target.value)}
                                >
                                    {['None', 'Low', 'Medium', 'High'].map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Pest Type"
                                    value={formData.crop_protection?.pest_type || ''}
                                    onChange={(e) => handleChange('crop_protection', 'pest_type', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Pest Severity"
                                    value={formData.crop_protection?.pest_severity || ''}
                                    onChange={(e) => handleChange('crop_protection', 'pest_severity', e.target.value)}
                                >
                                    {['None', 'Low', 'Medium', 'High'].map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Disease Type"
                                    value={formData.crop_protection?.disease_type || ''}
                                    onChange={(e) => handleChange('crop_protection', 'disease_type', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Disease Severity"
                                    value={formData.crop_protection?.disease_severity || ''}
                                    onChange={(e) => handleChange('crop_protection', 'disease_severity', e.target.value)}
                                >
                                    {['None', 'Low', 'Medium', 'High'].map((opt) => (
                                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, md: 12 }}>
                                <TextField
                                    fullWidth
                                    label="Remarks"
                                    multiline
                                    rows={2}
                                    value={formData.crop_protection?.remarks || ''}
                                    onChange={(e) => handleChange('crop_protection', 'remarks', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </>
                )}

                {!isObservationEntryFormRecord && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>CONTROL METHODS</Typography>
                        <Grid container spacing={2} sx={{ mb: 4 }}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Weed Control"
                                    value={formData.control_methods?.weed_control || ''}
                                    onChange={(e) => handleChange('control_methods', 'weed_control', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Pest Control"
                                    value={formData.control_methods?.pest_control || ''}
                                    onChange={(e) => handleChange('control_methods', 'pest_control', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Disease Control"
                                    value={formData.control_methods?.disease_control || ''}
                                    onChange={(e) => handleChange('control_methods', 'disease_control', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </>
                )}

                {!isObservationEntryFormRecord && (
                    <>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>HARVEST & RESIDUALS</Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="date"
                                    fullWidth
                                    label="Harvest Date"
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.harvest?.harvest_date || ''}
                                    onChange={(e) => handleChange('harvest', 'harvest_date', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    type="number"
                                    fullWidth
                                    label="Yield (tons/ha)"
                                    value={formData.harvest?.yield || ''}
                                    onChange={(e) => handleChange('harvest', 'yield', parseFloat(e.target.value))}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <TextField
                                    fullWidth
                                    label="Harvest Method"
                                    value={formData.harvest?.harvest_method || ''}
                                    onChange={(e) => handleChange('harvest', 'harvest_method', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Residue Type"
                                    value={formData.residual_management?.residue_type || ''}
                                    onChange={(e) => handleChange('residual_management', 'residue_type', e.target.value)}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Management Method"
                                    value={formData.residual_management?.management_method || ''}
                                    onChange={(e) => handleChange('residual_management', 'management_method', e.target.value)}
                                />
                            </Grid>
                        </Grid>
                    </>
                )}

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Saving...' : mode === 'create' ? 'Create Record' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
