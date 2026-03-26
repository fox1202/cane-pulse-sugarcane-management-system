# Quick Start Guide - Spatial Data Upload Feature

## 📋 What This Does

Allows you to import geospatial data (shapes/polygons) from KML, KMZ, or ZIP files and automatically create crop monitoring observations with:
- ✅ Auto-filled location (Block ID, Section Name, Field Name)
- ✅ Calculated area (hectarage) of each polygon
- ✅ Location coordinate from polygon center
- ✅ Full observation records ready for field data collection

---

## 🚀 Quick Start (3 Minutes)

### Step 1: Prepare Your Data
Get a KML or KMZ file containing polygons with attributes:
- Can export from Google Earth
- Can export from QGIS/ArcGIS  
- Must have polygon geometries with properties/attributes

**Example attributes**: Block_ID, Section, Field_Name

### Step 2: Open Feature in App
1. Tap **Menu** (≡) in app
2. Select **"Upload Spatial Data"**

### Step 3: Import File
1. Click **"Select Files (KML, KMZ, ZIP)"**
2. Choose your KML/KMZ/ZIP file
3. Click **"Process and Create Observations"**
4. Wait for processing (shows status)

### Step 4: Map Fields
For each polygon feature shown:
1. Click the ✏️ **Edit** button
2. Select which column = Block ID
3. Select which column = Section Name  
4. Select which column = Field Name
5. Click **Apply**

*Repeat for all features if needed*

### Step 5: Create Observations
1. Click **"Create Observations"**
2. Done! ✅ Observations created locally
3. App auto-syncs to backend

---

## 📊 What Gets Created

For each polygon, the app creates one **Observation** with:

```
Location:
  ✓ Block ID: (from selected attribute)
  ✓ Section Name: (from selected attribute)
  ✓ Field Name: (from selected attribute)
  ✓ Latitude: (polygon center)
  ✓ Longitude: (polygon center)

Crop Info:
  ✓ Type: Sugarcane
  ✓ Stage: Plant
  ✓ Planting Date: Today
  ✓ Harvest Date: +365 days

Other Fields:
  ✓ Pre-filled with sensible defaults
  ✓ Editable after creation
```

---

## 💡 Tips & Tricks

### Finding Hectarage
- After processing, each feature shows: **"Hectarage: XX.XX ha"**
- This is calculated from polygon area
- Accuracy: ±2-3% for field-level operations

### Mapping Attributes
The mapping dialog shows your data attributes:
```
Name: "Block-A1"
Description: "Sugarcane field"
Category: "Crop"
```

Select the appropriate one for each field.

### Batch Import
- Can select multiple files at once
- Can upload multiple KML files in a ZIP
- All features from all files processed together

### After Creation
- Observations stored locally (offline)
- Mark "unsynced" automatically
- Auto-sync when online
- Edit individual observations later

---

## 📝 Sample KML Structure

If creating KML files manually:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Block-A1</name>
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

---

## ⚠️ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "No features found" | Check KML has Polygons (not Points/Lines) |
| "Hectarage shows 0" | Verify coordinates are valid |
| Field mapping empty | Ensure attributes exist in KML |
| App freezes during processing | Normal for large files; wait 5-10 sec |
| Missing observations | Check local storage sync status |

---

## 📂 File Formats Supported

| Format | Details | Use Case |
|--------|---------|---------|
| **KML** | Plain text XML | Google Earth, simple files |
| **KMZ** | Compressed KML | Smaller file size, emails |
| **ZIP** | Archive with KML | Multiple files bundled |

---

## 🎯 Workflow Example

**Scenario**: You have 5 sugarcane blocks to monitor

1. **Prepare**: 
   - Export each block boundary from GIS
   - Create KML with block properties
   
2. **Import**:
   - Upload 1 KML file with all 5 blocks
   
3. **Map**:
   - Edit each block feature (5 times)
   - Select Block ID, Section, Field Name
   
4. **Create**:
   - Click "Create Observations"
   - ✅ 5 observations created in 10 seconds
   
5. **Collect**:
   - Now ready for field monitoring
   - Fill in crop details later

---

## 🔢 Technical Details (Optional)

### Area Calculation
- Uses spherical excess formula
- Based on WGS84 (standard GPS coordinates)
- Accuracy: ~2-3% over field-sized areas
- Converts m² → hectares automatically

### Centroid Calculation
- Averages all polygon coordinate points
- Used as observation location
- Placed at field center

### Format Support
- Coordinate format: lng,lat,elevation
- Coordinate system: WGS84 (EPSG:4326)
- Ring requirement: Closed (first = last point)

---

## 📞 Support

### Need Help?
1. Check **SPATIAL_DATA_UPLOAD_DOCS.md** for detailed guide
2. Verify KML structure with XML viewer
3. Test with sample Google Earth export first

### Common Questions

**Q: Can I edit observations after creation?**
A: Yes! All observations appear in "Observations" list for editing.

**Q: Is data lost if app crashes?**
A: No. All data saved locally first, then synced.

**Q: Can I import different file formats?**
A: Currently: KML, KMZ, ZIP. Shapefiles coming soon.

**Q: Does it work offline?**
A: Yes! Observations created offline, synced when online.

---

## 🎓 Sample Test

Try this to test the feature:

1. **Create test KML**:
   ```
   Block ID: "TEST-001"
   Section: "Section-A"
   Field: "Field-1"
   Area: ~0.5 hectares
   ```

2. **Import** and verify:
   - Features show in list
   - Hectarage calculates
   - Field mapping works
   - Observation created

3. **Verify**:
   - Check "Observations" list
   - See new observation
   - Confirm location matches

---

## 📊 Checklist

Use this to verify successful import:

- [ ] File selected and processed
- [ ] Features listed with hectarage
- [ ] All fields mapped (Block, Section, Field)
- [ ] "Create Observations" button enabled
- [ ] Observations created (see success message)
- [ ] New observations appear in list
- [ ] Sync shows in progress indicator
- [ ] Ready for field data collection

---

**Version**: 1.0
**Last Updated**: March 2026
**Status**: Ready to Use ✅

For detailed documentation, see: **SPATIAL_DATA_UPLOAD_DOCS.md**
