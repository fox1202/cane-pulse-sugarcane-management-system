# Spatial Data Upload Feature Documentation

## Overview
The Spatial Data Upload feature allows users to import geospatial data (KML, KMZ, ZIP files) and automatically create observations from polygon geometries. This is particularly useful for bulk data import from GIS systems.

## Features

### 1. **File Format Support**
- **KML Files**: Standard Keyhole Markup Language files
- **KMZ Files**: Compressed KML files (ZIP with KML inside)
- **ZIP Files**: ZIP archives containing KML files
- Multiple files can be selected and processed at once

### 2. **Automatic Field Mapping**
- Select which attributes from the spatial data map to:
  - Block ID
  - Section Name
  - Field Name
- Uses a dropdown dialog for intuitive mapping

### 3. **Hectarage Calculation**
- Automatically calculates polygon area in hectares using geographic coordinates
- Uses Haversine formula approximation for accurate area calculation
- Displays hectarage for each polygon

### 4. **Centroid Calculation**
- Calculates the centroid of each polygon
- Uses centroid as the observation location (latitude/longitude)

### 5. **Bulk Observation Creation**
- Creates one observation per polygon
- Auto-fills location data from geometry
- Pre-populates with default values for other fields
- Stores observations locally and syncs with backend

## Usage

### Accessing the Feature
1. Open the Mobile App
2. Open the Navigation Drawer (hamburger menu)
3. Select **"Upload Spatial Data"** option

### Step-by-Step Process

#### Step 1: Select Files
1. Click **"Select Files (KML, KMZ, ZIP)"** button
2. Choose one or more KML, KMZ, or ZIP files from your device
3. Selected files will be displayed in the list

#### Step 2: Process Files
1. Click **"Process and Create Observations"** button
2. App will:
   - Extract polygons from the selected files
   - Calculate area and centroid for each polygon
   - Parse attribute data
   - Display processing status

#### Step 3: Map Fields
1. For each feature, review the calculated hectarage
2. Click the **Edit** icon (pencil) to map fields
3. In the dialog:
   - Select which attribute column corresponds to Block ID
   - Select which attribute column corresponds to Section Name
   - Select which attribute column corresponds to Field Name
4. Click **Apply** to save the mapping

#### Step 4: Create Observations
1. Once all features are mapped, click **"Create Observations"**
2. App will:
   - Create an observation for each polygon
   - Auto-fill location data (block ID, section name, field name)
   - Set location from polygon centroid
   - Include calculated hectarage in coordinates
   - Store locally
   - Sync with backend

### Default Values Assigned
When creating observations from spatial data:
- **Crop Type**: Sugarcane
- **Planting Date**: Current date
- **Expected Harvest Date**: Current date + 365 days
- **Crop Stage**: Plant
- **Vigor**: Good
- **Soil pH**: 6.5
- **Harvest Method**: Manual
- **Remarks**: "Imported from spatial data"

All other fields can be edited after creation through the standard observation form.

## Technical Implementation

### Architecture
```
SpatialDataUploadScreen
├── File Selection (_pickFiles)
├── File Processing (_processFiles)
│   ├── KML Processing (_processKmlFile)
│   ├── KMZ Processing (_processKmzFile)
│   └── ZIP Processing (_processZipFile)
├── XML Parsing (_parseKmlRing)
├── Geometric Calculations
│   ├── Area (_calculatePolygonAreaFromLatLng)
│   └── Centroid (_calculateCentroid)
├── Field Mapping (_showFieldMappingDialog)
└── Observation Creation (_createObservations)
```

### Key Dependencies
- `file_picker: ^8.1.7` - File selection dialog
- `archive: ^3.4.10` - ZIP file handling
- `xml: ^6.5.0` - XML/KML parsing
- `latlong2: ^0.9.0` - Geographic coordinate handling

### Area Calculation

The app uses the spherical excess formula approximation for calculating polygon areas:

```
area = (dLng * (2 + sin(lat1) + sin(lat2)) / 2) * R²

where:
- dLng = difference in longitude (in radians)
- lat1, lat2 = latitudes of consecutive points (in radians)
- R = Earth's radius (~111,320 meters per degree)
```

The result is converted from m² to hectares (1 hectare = 10,000 m²).

### Centroid Calculation

Simple average of all polygon vertices:
```
centroid_lat = sum(latitudes) / number_of_points
centroid_lng = sum(longitudes) / number_of_points
```

## Integration with Observation Flow

1. **Local Storage**: All created observations are stored locally using SQLite
2. **Sync Provider**: Observations marked as unsynced and queued for backend sync
3. **Backend**: On sync, observations are sent to Supabase with all collected data
4. **Editing**: Users can edit any observation through the standard form

## Data Model

Each created observation includes:

```dart
ObservationModel {
  fieldIden: FieldIdentification {
    sectionName: String,
    blockId: String,
    fieldName: String,
    latitude: double,
    longitude: double,
    gpsAccuracy: 0.0,
    dateRecorded: DateTime
  },
  cropInfo: CropInformation {
    cropType: 'Sugarcane',
    ratoonNumber: 0,
    variety: '',
    plantingDate: DateTime,
    expectedHarvestDate: DateTime,
    cropStage: 'Plant'
  },
  monitoring: CropMonitoring { ... },
  soil: SoilCharacteristics { ... },
  irrigation: IrrigationManagement { ... },
  nutrient: NutrientManagement { ... },
  protection: CropProtection { ... },
  control: ControlMethods { ... },
  harvest: HarvestInformation { ... },
  residual: ResidualManagement { ... },
  createdAt: DateTime
}
```

## Error Handling

- **Invalid file format**: User-friendly error message displayed
- **Missing KML in KMZ**: Exception caught and reported
- **Coordinate parsing errors**: Individual coordinates skipped with logging
- **Observation creation failures**: Error message shown with details

## Performance Considerations

- File processing is asynchronous to prevent UI freezing
- Progress status is displayed during processing
- No limit on number of features per file
- Memory efficient polygon storage

## Future Enhancements

Potential improvements:
1. Support for Shapefile format (.shp, .dbf, .shx)
2. Custom projection support for accurate area calculations
3. Preview map showing imported polygons
4. Batch import history and management
5. Attribute import/export for field mapping
6. Custom formula support for default field values
7. Dry-run option before creating observations

## Testing

### Test Data Sources
- Google Earth (Export as KML)
- GIS software (QGIS, ArcGIS)
- OpenGIS online tools
- Manual KML creation

### Sample KML Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Block A1</name>
      <description>Section 1</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              13.1234,77.5678,0
              13.1244,77.5678,0
              13.1244,77.5688,0
              13.1234,77.5688,0
              13.1234,77.5678,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
```

## Support & Troubleshooting

### Common Issues

**Q: "No KML file found in KMZ"**
- A: Ensure the KMZ file contains at least one KML file at the root level

**Q: Hectarage values seem incorrect**
- A: Verify coordinates are in WGS84 (EPSG:4326) format for accurate calculations

**Q: Features not appearing in processed list**
- A: Ensure polygons have valid ring definitions with closed coordinates (first point = last point)

**Q: Mapping dialog won't save**
- A: Select valid attribute fields from dropdown before applying

### Debug Logging

The app logs detailed information for troubleshooting. Enable in console to see:
- File processing status
- Coordinate parsing errors
- Area calculation details
- Observation creation status

---

**Last Updated**: March 2026
**Version**: 1.0
