import React from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    alpha,
    useTheme,
    Grid,
    TextField,
} from '@mui/material';

interface FilterBarProps {
    filters: {
        startDate: string | null;
        endDate: string | null;
        cropType: string;
        variety: string;
        section: string;
        block: string;
        field: string;
    };
    onFilterChange: (name: string, value: string | null) => void;
    options: {
        cropTypes: string[];
        varieties: string[];
        sections: string[];
        blocks: string[];
        fields: string[];
    };
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, options }) => {
    const theme = useTheme();

    return (
        <Paper
            sx={{
                p: 3,
                mb: 4,
                borderRadius: 4,
                bgcolor: alpha(theme.palette.background.paper, 0.4),
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(27,94,32,0.12)',
                boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)',
            }}
        >
            <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                    <TextField
                        type="date"
                        label="Start Date"
                        value={filters.startDate ? filters.startDate.split('T')[0] : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        fullWidth
                        variant="filled"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ borderRadius: 2, '& .MuiFilledInput-root': { borderRadius: 2 } }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                    <TextField
                        type="date"
                        label="End Date"
                        value={filters.endDate ? filters.endDate.split('T')[0] : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange('endDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                        fullWidth
                        variant="filled"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ borderRadius: 2, '& .MuiFilledInput-root': { borderRadius: 2 } }}
                    />
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 2 }}>
                    <FormControl fullWidth variant="filled" size="small">
                        <InputLabel>Crop Type</InputLabel>
                        <Select
                            value={filters.cropType}
                            onChange={(e) => onFilterChange('cropType', e.target.value)}
                            label="Crop Type"
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="all">All Types</MenuItem>
                            {options.cropTypes.map((t: string) => (
                                <MenuItem key={t} value={t}>{t}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 1.5 }}>
                    <FormControl fullWidth variant="filled" size="small">
                        <InputLabel>Block</InputLabel>
                        <Select
                            value={filters.block}
                            onChange={(e) => onFilterChange('block', e.target.value)}
                            label="Block"
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="all">All Blocks</MenuItem>
                            {options.blocks.map((b: string) => (
                                <MenuItem key={b} value={b}>{b}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: 3, lg: 1.5 }}>
                    <FormControl fullWidth variant="filled" size="small">
                        <InputLabel>Field</InputLabel>
                        <Select
                            value={filters.field}
                            onChange={(e) => onFilterChange('field', e.target.value)}
                            label="Field"
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="all">All Fields</MenuItem>
                            {options.fields.map((f: string) => (
                                <MenuItem key={f} value={f}>{f}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

            </Grid>
        </Paper>
    );
};
