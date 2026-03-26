import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:archive/archive.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:xml/xml.dart' as xml;
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'dart:math' show min, max;
import '../models/observation_models.dart';
import '../services/local_db.dart';
import '../providers/sync_provider.dart';
import '../utils/app_colors.dart';
import '../utils/geo_utils.dart';
import '../utils/spatial_geojson_import.dart';

class SpatialDataUploadScreen extends StatefulWidget {
  const SpatialDataUploadScreen({super.key});

  @override
  State<SpatialDataUploadScreen> createState() =>
      _SpatialDataUploadScreenState();
}

class _SpatialDataUploadScreenState extends State<SpatialDataUploadScreen> {
  List<PlatformFile> _selectedFiles = [];
  List<Map<String, dynamic>> _parsedFeatures = [];
  bool _isProcessing = false;
  String _statusMessage = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Upload Spatial Data'),
        backgroundColor: AppColors.primaryGreen,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton.icon(
              onPressed: _pickFiles,
              icon: const Icon(Icons.file_upload),
              label: const Text('Select Files (KML, KMZ, ZIP, CSV, GEOJSON)'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primaryGreen,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: _isProcessing ? null : _loadBundledFieldObservations,
              icon: const Icon(Icons.map_rounded),
              label: const Text('Load Bundled Field Observations'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primaryGreen,
                side: const BorderSide(color: AppColors.primaryGreen),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
            const SizedBox(height: 16),
            if (_selectedFiles.isNotEmpty)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Selected Files:',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        itemCount: _selectedFiles.length,
                        itemBuilder: (context, index) {
                          final file = _selectedFiles[index];
                          return ListTile(
                            leading: const Icon(Icons.insert_drive_file),
                            title: Text(file.name),
                            subtitle: Text(
                              '${(file.size / 1024).toStringAsFixed(2)} KB',
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isProcessing ? null : _processFiles,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryGreen,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isProcessing
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Process and Create Observations'),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _statusMessage,
                      style: const TextStyle(color: Colors.blue),
                    ),
                  ],
                ),
              ),
            if (_parsedFeatures.isNotEmpty)
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Parsed Features (${_parsedFeatures.length}):',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        itemCount: _parsedFeatures.length,
                        itemBuilder: (context, index) {
                          final feature = _parsedFeatures[index];
                          return Card(
                            child: ListTile(
                              title: Text('Feature ${index + 1}'),
                              subtitle: Text(
                                'Hectarage: ${feature['hectarage']?.toStringAsFixed(2) ?? 'N/A'} ha',
                              ),
                              trailing: IconButton(
                                icon: const Icon(Icons.edit),
                                onPressed: () =>
                                    _showFieldMappingDialog(feature, index),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isProcessing ? null : _createObservations,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryGreen,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isProcessing
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Create Observations'),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickFiles() async {
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: ['kml', 'kmz', 'zip', 'csv', 'geojson'],
    );

    if (result != null) {
      setState(() {
        _selectedFiles = result.files;
        _parsedFeatures = [];
        _statusMessage = '';
      });
    }
  }

  Future<void> _loadBundledFieldObservations() async {
    setState(() {
      _isProcessing = true;
      _statusMessage = 'Loading bundled field observations...';
      _selectedFiles = [];
    });

    try {
      final geoJsonString = await rootBundle.loadString(
        'assets/spatial/field_observations.geojson',
      );
      final features = parseGeoJsonSpatialFeatures(geoJsonString);

      setState(() {
        _parsedFeatures = features;
        _statusMessage =
            'Loaded ${features.length} bundled field observation layers';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Error loading bundled GeoJSON: $e';
      });
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  Future<void> _processFiles() async {
    if (_selectedFiles.isEmpty) return;

    setState(() {
      _isProcessing = true;
      _statusMessage = 'Processing files...';
    });

    try {
      List<Map<String, dynamic>> features = [];

      // Process files
      for (final file in _selectedFiles) {
        final extension = (file.extension ?? '').toLowerCase();
        print(
          'DEBUG: Processing file: ${file.name}, extension: $extension, size: ${file.size}',
        );

        try {
          if (extension == 'kml') {
            print('DEBUG: Detected KML file');
            final kmlFeatures = await _processKmlFile(file);
            print(
              'DEBUG: KML processing returned ${kmlFeatures.length} features',
            );
            features.addAll(kmlFeatures);
          } else if (extension == 'kmz') {
            print('DEBUG: Detected KMZ file');
            final kmzFeatures = await _processKmzFile(file);
            print(
              'DEBUG: KMZ processing returned ${kmzFeatures.length} features',
            );
            features.addAll(kmzFeatures);
          } else if (extension == 'zip') {
            print('DEBUG: Detected ZIP file');
            final zipFeatures = await _processZipFile(file);
            print(
              'DEBUG: ZIP processing returned ${zipFeatures.length} features',
            );
            features.addAll(zipFeatures);
          } else if (extension == 'csv') {
            print('DEBUG: Detected CSV file');
            final csvFeatures = await _processCsvFile(file);
            print(
              'DEBUG: CSV processing returned ${csvFeatures.length} features',
            );
            features.addAll(csvFeatures);
          } else if (extension == 'geojson') {
            print('DEBUG: Detected GeoJSON file');
            final geoJsonFeatures = await _processGeoJsonFile(file);
            print(
              'DEBUG: GeoJSON processing returned ${geoJsonFeatures.length} features',
            );
            features.addAll(geoJsonFeatures);
          } else {
            print('DEBUG: Unknown extension: $extension');
            setState(() {
              _statusMessage =
                  'Error: Unknown file type: $extension. Supported: KML, KMZ, ZIP, CSV, GEOJSON';
            });
          }
        } catch (fileError) {
          print('DEBUG: Error processing ${file.name}: $fileError');
          print('Stack trace: ${StackTrace.current}');
          setState(() {
            _statusMessage =
                'Error processing ${file.name}: ${fileError.toString().substring(0, 100)}';
          });
        }
      }

      print('DEBUG: Total features collected: ${features.length}');

      if (features.isEmpty) {
        print('DEBUG: No features parsed from any file');
        setState(() {
          _statusMessage =
              'No features found. Check file format and try again.';
        });
      } else {
        print('DEBUG: SUCCESS - Features parsed: ${features.length}');
        setState(() {
          _parsedFeatures = features;
          _statusMessage = 'Processed ${features.length} features successfully';
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Error processing files: $e';
      });
      print('Processing error: $e');
      print('Stack trace: ${StackTrace.current}');
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }

  List<xml.XmlElement> _getAllElementsByLocalName(
    xml.XmlElement parent,
    String localName,
  ) {
    final result = <xml.XmlElement>[];

    for (final child in parent.children) {
      if (child is xml.XmlElement) {
        try {
          final childLocalName = child.name.local;

          if (childLocalName == localName) {
            result.add(child);
          }
          result.addAll(_getAllElementsByLocalName(child, localName));
        } catch (e) {
          print('DEBUG: Error accessing child element: $e');
        }
      }
    }

    return result;
  }

  Future<List<int>?> _getFileBytes(PlatformFile file) async {
    // Try to get bytes - if null, read from file path
    if (file.bytes != null) {
      print('DEBUG _getFileBytes: Using bytes from PlatformFile');
      return file.bytes;
    } else if (file.path != null && file.path!.isNotEmpty) {
      print('DEBUG _getFileBytes: Reading from file path: ${file.path}');
      try {
        final bytes = await File(file.path!).readAsBytes();
        print('DEBUG _getFileBytes: Successfully read ${bytes.length} bytes');
        return bytes;
      } catch (e) {
        print('DEBUG _getFileBytes: ERROR reading from path: $e');
        return null;
      }
    } else {
      print('DEBUG _getFileBytes: No bytes and no valid path');
      return null;
    }
  }

  Future<List<Map<String, dynamic>>> _processKmlFile(PlatformFile file) async {
    final features = <Map<String, dynamic>>[];

    print('DEBUG: _processKmlFile called with file: ${file.name}');

    final fileBytes = await _getFileBytes(file);
    if (fileBytes == null) {
      print('DEBUG: Could not read file bytes');
      return features;
    }

    try {
      print('DEBUG: Decoding file...');
      final kmlString = utf8.decode(fileBytes);
      print('DEBUG: File decoded, length: ${kmlString.length}');

      final doc = xml.XmlDocument.parse(kmlString);
      print('DEBUG: XML parsed successfully');

      // Get all Placemark elements recursively, ignoring namespaces
      final placemarks = _getAllElementsByLocalName(
        doc.rootElement,
        'Placemark',
      );

      print('DEBUG: Found ${placemarks.length} placemarks in KML');

      for (final placemark in placemarks) {
        // Get name and description, ignoring namespaces
        String? name;
        String? description;

        for (final child in placemark.children) {
          if (child is xml.XmlElement) {
            if (child.name.local == 'name') {
              name = child.innerText;
            } else if (child.name.local == 'description') {
              description = child.innerText;
            }
          }
        }

        name ??= 'Unknown';
        description ??= '';

        print('DEBUG: Processing placemark - $name');

        // Find Polygon element
        xml.XmlElement? polygonElement;
        for (final child in placemark.children) {
          if (child is xml.XmlElement && child.name.local == 'Polygon') {
            polygonElement = child;
            break;
          }
        }

        if (polygonElement != null) {
          final rings = <List<LatLng>>[];

          // Process outer boundary
          xml.XmlElement? outerBoundary;
          for (final child in polygonElement.children) {
            if (child is xml.XmlElement &&
                child.name.local == 'outerBoundaryIs') {
              outerBoundary = child;
              break;
            }
          }

          if (outerBoundary != null) {
            final ring = _parseKmlRing(outerBoundary);
            if (ring.isNotEmpty) {
              rings.add(ring);
            }
          }

          // Process inner boundaries
          for (final child in polygonElement.children) {
            if (child is xml.XmlElement &&
                child.name.local == 'innerBoundaryIs') {
              final ring = _parseKmlRing(child);
              if (ring.isNotEmpty) {
                rings.add(ring);
              }
            }
          }

          if (rings.isNotEmpty) {
            final hectarage = _calculatePolygonAreaFromLatLng(rings);
            final centroid = _calculateCentroid(rings.first);

            features.add({
              'rings': rings,
              'attributes': {'name': name, 'description': description},
              'hectarage': hectarage,
              'centroid': centroid,
              'block_id': '',
              'section_name': '',
              'field_name': '',
            });
            print('DEBUG: Added polygon feature - $name');
          }
        } else {
          // Check for Point geometry
          xml.XmlElement? pointElement;
          for (final child in placemark.children) {
            if (child is xml.XmlElement && child.name.local == 'Point') {
              pointElement = child;
              break;
            }
          }

          if (pointElement != null) {
            final pointCoord = _parseKmlPoint(pointElement);
            if (pointCoord != null) {
              // Create a small circular polygon around the point
              const radius = 0.0001; // ~10 meters in degrees
              final circleRing = <LatLng>[
                LatLng(pointCoord.latitude + radius, pointCoord.longitude),
                LatLng(pointCoord.latitude, pointCoord.longitude + radius),
                LatLng(pointCoord.latitude - radius, pointCoord.longitude),
                LatLng(pointCoord.latitude, pointCoord.longitude - radius),
                LatLng(pointCoord.latitude + radius, pointCoord.longitude),
              ];

              final hectarage = _calculatePolygonAreaFromLatLng([circleRing]);

              features.add({
                'rings': [circleRing],
                'attributes': {'name': name, 'description': description},
                'hectarage': hectarage,
                'centroid': pointCoord,
                'block_id': '',
                'section_name': '',
                'field_name': '',
              });
              print('DEBUG: Added point feature - $name');
            }
          }
        }
      }
    } catch (e) {
      print('Error processing KML: $e');
      print('Stack trace: ${StackTrace.current}');
      rethrow;
    }

    return features;
  }

  Future<List<Map<String, dynamic>>> _processKmzFile(PlatformFile file) async {
    final features = <Map<String, dynamic>>[];

    final fileBytes = await _getFileBytes(file);
    if (fileBytes == null) return features;

    try {
      final archive = ZipDecoder().decodeBytes(fileBytes);
      final kmlFile = archive.files.firstWhere(
        (f) => f.name.endsWith('.kml') && f.isFile,
        orElse: () => ArchiveFile('', 0, []),
      );

      if (kmlFile.size == 0) {
        throw Exception('No KML file found in KMZ');
      }

      final kmlString = utf8.decode(kmlFile.content);
      final doc = xml.XmlDocument.parse(kmlString);

      // Get all Placemark elements recursively, ignoring namespaces
      final placemarks = _getAllElementsByLocalName(
        doc.rootElement,
        'Placemark',
      );
      print('DEBUG: Found ${placemarks.length} placemarks in KMZ');

      for (final placemark in placemarks) {
        // Get name and description, ignoring namespaces
        String? name;
        String? description;

        for (final child in placemark.children) {
          if (child is xml.XmlElement) {
            if (child.name.local == 'name') {
              name = child.innerText;
            } else if (child.name.local == 'description') {
              description = child.innerText;
            }
          }
        }

        name ??= 'Unknown';
        description ??= '';

        // Find Polygon element
        xml.XmlElement? polygonElement;
        for (final child in placemark.children) {
          if (child is xml.XmlElement && child.name.local == 'Polygon') {
            polygonElement = child;
            break;
          }
        }

        if (polygonElement != null) {
          final rings = <List<LatLng>>[];

          // Process outer boundary
          xml.XmlElement? outerBoundary;
          for (final child in polygonElement.children) {
            if (child is xml.XmlElement &&
                child.name.local == 'outerBoundaryIs') {
              outerBoundary = child;
              break;
            }
          }

          if (outerBoundary != null) {
            final ring = _parseKmlRing(outerBoundary);
            if (ring.isNotEmpty) {
              rings.add(ring);
            }
          }

          // Process inner boundaries
          for (final child in polygonElement.children) {
            if (child is xml.XmlElement &&
                child.name.local == 'innerBoundaryIs') {
              final ring = _parseKmlRing(child);
              if (ring.isNotEmpty) {
                rings.add(ring);
              }
            }
          }

          if (rings.isNotEmpty) {
            final hectarage = _calculatePolygonAreaFromLatLng(rings);
            final centroid = _calculateCentroid(rings.first);

            features.add({
              'rings': rings,
              'attributes': {'name': name, 'description': description},
              'hectarage': hectarage,
              'centroid': centroid,
              'block_id': '',
              'section_name': '',
              'field_name': '',
            });
          }
        } else {
          // Check for Point geometry
          xml.XmlElement? pointElement;
          for (final child in placemark.children) {
            if (child is xml.XmlElement && child.name.local == 'Point') {
              pointElement = child;
              break;
            }
          }

          if (pointElement != null) {
            final pointCoord = _parseKmlPoint(pointElement);
            if (pointCoord != null) {
              // Create a small circular polygon around the point
              const radius = 0.0001; // ~10 meters in degrees
              final circleRing = <LatLng>[
                LatLng(pointCoord.latitude + radius, pointCoord.longitude),
                LatLng(pointCoord.latitude, pointCoord.longitude + radius),
                LatLng(pointCoord.latitude - radius, pointCoord.longitude),
                LatLng(pointCoord.latitude, pointCoord.longitude - radius),
                LatLng(pointCoord.latitude + radius, pointCoord.longitude),
              ];

              final hectarage = _calculatePolygonAreaFromLatLng([circleRing]);

              features.add({
                'rings': [circleRing],
                'attributes': {'name': name, 'description': description},
                'hectarage': hectarage,
                'centroid': pointCoord,
                'block_id': '',
                'section_name': '',
                'field_name': '',
              });
            }
          }
        }
      }
    } catch (e) {
      print('Error processing KMZ: $e');
      rethrow;
    }

    return features;
  }

  Future<List<Map<String, dynamic>>> _processZipFile(PlatformFile file) async {
    final features = <Map<String, dynamic>>[];

    final fileBytes = await _getFileBytes(file);
    if (fileBytes == null) return features;

    try {
      final archive = ZipDecoder().decodeBytes(fileBytes);

      // Look for KML files
      for (final archFile in archive.files) {
        if ((archFile.name.endsWith('.kml') ||
                archFile.name.endsWith('.KML')) &&
            archFile.isFile) {
          final kmlString = utf8.decode(archFile.content);
          final doc = xml.XmlDocument.parse(kmlString);

          // Get all Placemark elements recursively, ignoring namespaces
          final placemarks = _getAllElementsByLocalName(
            doc.rootElement,
            'Placemark',
          );
          print('DEBUG: Found ${placemarks.length} placemarks in ZIP');

          for (final placemark in placemarks) {
            // Get name and description, ignoring namespaces
            String? name;
            String? description;

            for (final child in placemark.children) {
              if (child is xml.XmlElement) {
                if (child.name.local == 'name') {
                  name = child.innerText;
                } else if (child.name.local == 'description') {
                  description = child.innerText;
                }
              }
            }

            name ??= 'Unknown';
            description ??= '';

            // Find Polygon element
            xml.XmlElement? polygonElement;
            for (final child in placemark.children) {
              if (child is xml.XmlElement && child.name.local == 'Polygon') {
                polygonElement = child;
                break;
              }
            }

            if (polygonElement != null) {
              final rings = <List<LatLng>>[];

              // Process outer boundary
              xml.XmlElement? outerBoundary;
              for (final child in polygonElement.children) {
                if (child is xml.XmlElement &&
                    child.name.local == 'outerBoundaryIs') {
                  outerBoundary = child;
                  break;
                }
              }

              if (outerBoundary != null) {
                final ring = _parseKmlRing(outerBoundary);
                if (ring.isNotEmpty) {
                  rings.add(ring);
                }
              }

              // Process inner boundaries
              for (final child in polygonElement.children) {
                if (child is xml.XmlElement &&
                    child.name.local == 'innerBoundaryIs') {
                  final ring = _parseKmlRing(child);
                  if (ring.isNotEmpty) {
                    rings.add(ring);
                  }
                }
              }

              if (rings.isNotEmpty) {
                final hectarage = _calculatePolygonAreaFromLatLng(rings);
                final centroid = _calculateCentroid(rings.first);

                features.add({
                  'rings': rings,
                  'attributes': {'name': name, 'description': description},
                  'hectarage': hectarage,
                  'centroid': centroid,
                  'block_id': '',
                  'section_name': '',
                  'field_name': '',
                });
              }
            } else {
              // Check for Point geometry
              xml.XmlElement? pointElement;
              for (final child in placemark.children) {
                if (child is xml.XmlElement && child.name.local == 'Point') {
                  pointElement = child;
                  break;
                }
              }

              if (pointElement != null) {
                final pointCoord = _parseKmlPoint(pointElement);
                if (pointCoord != null) {
                  // Create a small circular polygon around the point
                  const radius = 0.0001; // ~10 meters in degrees
                  final circleRing = <LatLng>[
                    LatLng(pointCoord.latitude + radius, pointCoord.longitude),
                    LatLng(pointCoord.latitude, pointCoord.longitude + radius),
                    LatLng(pointCoord.latitude - radius, pointCoord.longitude),
                    LatLng(pointCoord.latitude, pointCoord.longitude - radius),
                    LatLng(pointCoord.latitude + radius, pointCoord.longitude),
                  ];

                  final hectarage = _calculatePolygonAreaFromLatLng([
                    circleRing,
                  ]);

                  features.add({
                    'rings': [circleRing],
                    'attributes': {'name': name, 'description': description},
                    'hectarage': hectarage,
                    'centroid': pointCoord,
                    'block_id': '',
                    'section_name': '',
                    'field_name': '',
                  });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      print('Error processing ZIP: $e');
      rethrow;
    }

    return features;
  }

  Future<List<Map<String, dynamic>>> _processCsvFile(PlatformFile file) async {
    final features = <Map<String, dynamic>>[];

    print('DEBUG: _processCsvFile called with file: ${file.name}');
    print('DEBUG: file.bytes is null: ${file.bytes == null}');
    print('DEBUG: file.path: ${file.path}');

    late List<int> fileBytes;

    // Try to get bytes - if null, read from file path
    if (file.bytes != null) {
      print('DEBUG: Using bytes from PlatformFile');
      fileBytes = file.bytes!;
    } else if (file.path != null && file.path!.isNotEmpty) {
      print(
        'DEBUG: Bytes are null, attempting to read from path: ${file.path}',
      );
      try {
        fileBytes = await File(file.path!).readAsBytes();
        print(
          'DEBUG: Successfully read ${fileBytes.length} bytes from file path',
        );
      } catch (e) {
        print('DEBUG: ERROR reading from file path: $e');
        print('Stack trace: ${StackTrace.current}');
        return features;
      }
    } else {
      print('DEBUG: ERROR - No bytes and no valid path available');
      return features;
    }

    try {
      print('DEBUG: File size: ${fileBytes.length} bytes');
      final csvString = utf8.decode(fileBytes);
      print('DEBUG: CSV decoded successfully, length: ${csvString.length}');

      // Handle both \n and \r\n line endings
      final finalString = csvString.replaceAll('\r\n', '\n');
      final lines = finalString.split('\n');
      print('DEBUG: CSV has ${lines.length} lines');

      if (lines.isEmpty) {
        print('DEBUG: CSV file is empty');
        return features;
      }

      // Parse header row
      final headerLine = lines[0].trim();
      print('DEBUG: Header line: $headerLine');

      final headers = headerLine
          .split(',')
          .map((h) => h.trim().toLowerCase())
          .toList();

      print('DEBUG: CSV headers: $headers');
      print('DEBUG: Number of headers: ${headers.length}');

      // Find column indices
      final wktIndex = headers.indexOf('wkt');
      final nameIndex = headers.indexOf('name');
      final latIndex = headers.indexOf('latitude');
      final lngIndex = headers.indexOf('longitude');
      final fieldNameIndex = headers.indexOf('fieldname');
      final idIndex = headers.indexOf('id'); // Use 'id' column as block_id
      final blockIdIndex = headers.indexOf('blockid');
      final hectaresIndex = headers.indexOf('hectares');

      print(
        'DEBUG: Column indices - WKT: $wktIndex, Name: $nameIndex, ID: $idIndex, BlockID: $blockIdIndex',
      );

      // Parse data rows
      int rowCount = 0;
      bool useWkt = wktIndex >= 0;
      print('DEBUG: Using WKT format: $useWkt');

      for (int i = 1; i < lines.length; i++) {
        final line = lines[i].trim();
        if (line.isEmpty) {
          print('DEBUG: Row $i is empty, skipping');
          continue;
        }

        try {
          print(
            'DEBUG: Parsing row $i (first 100 chars): ${line.length > 100 ? line.substring(0, 100) : line}',
          );
          final columns = _parseCsvLine(line);
          print('DEBUG: Row $i parsed into ${columns.length} columns');
          if (columns.isNotEmpty) {
            print(
              'DEBUG: Row $i Column 0 (WKT): ${columns[0].substring(0, min(80, columns[0].length))}',
            );
          }
          if (columns.length > 2) {
            print('DEBUG: Row $i Column 2 (Name): ${columns[2]}');
          }

          final name = nameIndex < columns.length
              ? columns[nameIndex].trim()
              : 'Unknown';
          print('DEBUG: Row $i name: $name');

          final fieldName =
              fieldNameIndex >= 0 && fieldNameIndex < columns.length
              ? columns[fieldNameIndex].trim()
              : name; // Use name as field name if not explicitly set

          // Use blockIdIndex first, then fall back to idIndex
          final blockId = blockIdIndex >= 0 && blockIdIndex < columns.length
              ? columns[blockIdIndex].trim()
              : (idIndex >= 0 && idIndex < columns.length
                    ? columns[idIndex].trim()
                    : '');
          print('DEBUG: Row $i blockId: $blockId, fieldName: $fieldName');
          var hectares = 1.5;

          if (hectaresIndex >= 0 && hectaresIndex < columns.length) {
            try {
              hectares = double.parse(
                columns[hectaresIndex].trim().isEmpty
                    ? '1.5'
                    : columns[hectaresIndex].trim(),
              );
            } catch (_) {}
          }

          if (useWkt && wktIndex < columns.length) {
            // Parse WKT polygon
            final wktText = columns[wktIndex].trim();
            print('DEBUG: Row $i WKT length: ${wktText.length}');
            final ring = _parseWktPolygon(wktText);
            print('DEBUG: Row $i parsed to ${ring.length} coordinates');

            if (ring.isNotEmpty) {
              final centroid = _calculateCentroid(ring);

              features.add({
                'rings': [ring],
                'attributes': {'name': name},
                'hectarage': hectares,
                'centroid': centroid,
                'block_id': blockId,
                'section_name': '',
                'field_name': fieldName,
              });

              rowCount++;
              print('DEBUG: ✓ Added WKT row $rowCount: $name');
            } else {
              print('DEBUG: ✗ Row $i: No coordinates parsed from WKT');
            }
          } else if (latIndex >= 0 && lngIndex >= 0) {
            // Parse simple lat/lng
            final latStr = latIndex < columns.length
                ? columns[latIndex].trim()
                : '';
            final lngStr = lngIndex < columns.length
                ? columns[lngIndex].trim()
                : '';

            print('DEBUG: Row $i lat/lng: $latStr, $lngStr');

            try {
              final lat = double.parse(latStr);
              final lng = double.parse(lngStr);

              // Create a small circular polygon around the point
              const radius = 0.0001; // ~10 meters in degrees
              final circleRing = <LatLng>[
                LatLng(lat + radius, lng),
                LatLng(lat, lng + radius),
                LatLng(lat - radius, lng),
                LatLng(lat, lng - radius),
                LatLng(lat + radius, lng),
              ];

              final centroid = LatLng(lat, lng);

              features.add({
                'rings': [circleRing],
                'attributes': {'name': name},
                'hectarage': hectares,
                'centroid': centroid,
                'block_id': blockId,
                'section_name': '',
                'field_name': fieldName,
              });

              rowCount++;
              print('DEBUG: ✓ Added lat/lng row $rowCount: $name');
            } catch (e) {
              print('DEBUG: ✗ Row $i: Error parsing coordinates: $e');
            }
          } else {
            print('DEBUG: ✗ Row $i: No WKT or lat/lng columns found');
            print(
              'DEBUG: wktIndex=$wktIndex, latIndex=$latIndex, lngIndex=$lngIndex',
            );
          }
        } catch (e) {
          print('DEBUG: ✗ Row $i error: $e');
          print('Stack trace: ${StackTrace.current}');
        }
      }

      print('DEBUG: Total CSV rows processed: $rowCount');
    } catch (e) {
      print('ERROR in _processCsvFile: $e');
      print('Stack trace: ${StackTrace.current}');
    }

    return features;
  }

  Future<List<Map<String, dynamic>>> _processGeoJsonFile(
    PlatformFile file,
  ) async {
    final fileBytes = await _getFileBytes(file);
    if (fileBytes == null) return <Map<String, dynamic>>[];

    final geoJsonString = utf8.decode(fileBytes);
    return parseGeoJsonSpatialFeatures(geoJsonString);
  }

  List<LatLng> _parseWktPolygon(String wktText) {
    final ring = <LatLng>[];

    try {
      // Handle MULTIPOLYGON Z format and remove quotes
      String cleanedWkt = wktText
          .replaceAll('"', '')
          .replaceAll("'", '')
          .trim();

      print('DEBUG WKT: Original length: ${wktText.length} chars');
      print(
        'DEBUG WKT: First 100 chars: ${wktText.substring(0, min(100, wktText.length))}',
      );
      print('DEBUG WKT: Cleaned length: ${cleanedWkt.length} chars');
      print(
        'DEBUG WKT: Cleaned first 100 chars: ${cleanedWkt.substring(0, min(100, cleanedWkt.length))}',
      );

      // Check what the WKT contains
      print(
        'DEBUG WKT: Contains "MULTIPOLYGON": ${cleanedWkt.contains('MULTIPOLYGON')}',
      );
      print('DEBUG WKT: Contains "(((": ${cleanedWkt.contains('(((')}');
      print('DEBUG WKT: Contains ")))": ${cleanedWkt.contains(')))')}');

      // Find coordinate section
      int startIdx = cleanedWkt.indexOf('(((');
      int endIdx = cleanedWkt.lastIndexOf(')))');

      print('DEBUG WKT: startIdx of (((: $startIdx');
      print('DEBUG WKT: endIdx of ))): $endIdx');

      // Try alternative pattern if not found
      if (startIdx == -1) {
        startIdx = cleanedWkt.indexOf('((');
        print('DEBUG WKT: Trying alternate pattern ((, found at: $startIdx');
      }

      if (endIdx == -1) {
        endIdx = cleanedWkt.lastIndexOf('))');
        print('DEBUG WKT: Trying alternate pattern )), found at: $endIdx');
      }

      if (startIdx == -1 || endIdx == -1 || startIdx >= endIdx) {
        print('DEBUG WKT: ERROR - Could not extract coordinate bounds');
        print('DEBUG WKT: startIdx=$startIdx, endIdx=$endIdx');
        return ring;
      }

      // Extract coordinates
      // Adjust indices based on what we found
      int adjustedStart = startIdx;
      if (startIdx + 3 <= cleanedWkt.length &&
          cleanedWkt.substring(
                startIdx,
                min(startIdx + 3, cleanedWkt.length),
              ) ==
              '(((') {
        adjustedStart += 3;
      } else if (startIdx + 2 <= cleanedWkt.length &&
          cleanedWkt.substring(
                startIdx,
                min(startIdx + 2, cleanedWkt.length),
              ) ==
              '((') {
        adjustedStart += 2;
      } else {
        adjustedStart += 1;
      }

      int adjustedEnd = endIdx;
      if (endIdx >= 3 &&
          cleanedWkt.substring(max(0, endIdx - 3), endIdx) == ')))') {
        adjustedEnd = endIdx - 3;
      } else if (endIdx >= 2 &&
          cleanedWkt.substring(max(0, endIdx - 2), endIdx) == '))') {
        adjustedEnd = endIdx - 2;
      } else {
        adjustedEnd = endIdx - 1;
      }

      final coordSection = cleanedWkt.substring(adjustedStart, adjustedEnd);
      print('DEBUG WKT: Extracted ${coordSection.length} chars of coordinates');
      print(
        'DEBUG WKT: First 150 chars: ${coordSection.substring(0, min(150, coordSection.length))}',
      );

      // Split by comma and parse each coordinate pair
      final parts = coordSection.split(',').toList();
      print('DEBUG WKT: Split into ${parts.length} coordinate parts');

      int coordCount = 0;
      for (int i = 0; i < parts.length; i++) {
        final part = parts[i].trim();
        if (part.isEmpty) {
          print('DEBUG WKT: Part $i is empty, skipping');
          continue;
        }

        final values = part.split(RegExp(r'\s+')).toList();
        print('DEBUG WKT: Part $i has ${values.length} values: $values');

        if (values.length >= 2) {
          try {
            final lng = double.parse(values[0]);
            final lat = double.parse(values[1]);
            ring.add(LatLng(lat, lng));
            coordCount++;
            if (coordCount <= 3 || coordCount % 10 == 0) {
              print(
                'DEBUG WKT: ✓ Part $i: Added coordinate #$coordCount: lat=$lat, lng=$lng',
              );
            }
          } catch (e) {
            print(
              'DEBUG WKT: ✗ Part $i: Error parsing "${values[0]}" and "${values[1]}" - $e',
            );
          }
        } else {
          print('DEBUG WKT: ✗ Part $i: Not enough values - $values');
        }
      }

      print('DEBUG WKT: ✓ Final ring has ${ring.length} coordinates');
    } catch (e) {
      print('DEBUG WKT: ✗ ERROR parsing WKT: $e');
      print('Stack trace: ${StackTrace.current}');
    }

    return ring;
  }

  List<String> _parseCsvLine(String line) {
    final result = <String>[];
    var currentField = '';
    var insideQuotes = false;

    for (int i = 0; i < line.length; i++) {
      final char = line[i];

      if (char == '"') {
        insideQuotes = !insideQuotes;
      } else if (char == ',' && !insideQuotes) {
        result.add(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    result.add(currentField);
    return result;
  }

  List<LatLng> _parseKmlRing(xml.XmlElement boundary) {
    final ring = <LatLng>[];

    // Find LinearRing element by local name (ignoring namespace)
    xml.XmlElement? linearRing;
    for (final child in boundary.children) {
      if (child is xml.XmlElement && child.name.local == 'LinearRing') {
        linearRing = child;
        break;
      }
    }

    if (linearRing != null) {
      // Find coordinates element by local name (ignoring namespace)
      xml.XmlElement? coordsElement;
      for (final child in linearRing.children) {
        if (child is xml.XmlElement && child.name.local == 'coordinates') {
          coordsElement = child;
          break;
        }
      }

      if (coordsElement != null) {
        final coordsText = coordsElement.innerText.trim();
        final coordPairs = coordsText
            .split(RegExp(r'\s+'))
            .where((c) => c.isNotEmpty);

        for (final pair in coordPairs) {
          final parts = pair.split(',');
          if (parts.length >= 2) {
            try {
              final lng = double.parse(parts[0]);
              final lat = double.parse(parts[1]);
              ring.add(LatLng(lat, lng));
            } catch (e) {
              print('Error parsing coordinate: $pair - $e');
            }
          }
        }
      }
    }

    return ring;
  }

  LatLng? _parseKmlPoint(xml.XmlElement pointElement) {
    // Find coordinates element by local name (ignoring namespace)
    xml.XmlElement? coordsElement;
    for (final child in pointElement.children) {
      if (child is xml.XmlElement && child.name.local == 'coordinates') {
        coordsElement = child;
        break;
      }
    }

    if (coordsElement != null) {
      final coordsText = coordsElement.innerText.trim();
      final parts = coordsText.split(',');
      if (parts.length >= 2) {
        try {
          final lng = double.parse(parts[0]);
          final lat = double.parse(parts[1]);
          return LatLng(lat, lng);
        } catch (e) {
          print('Error parsing point coordinate: $coordsText - $e');
        }
      }
    }

    return null;
  }

  double _calculatePolygonAreaFromLatLng(List<List<LatLng>> rings) {
    final geometry = _buildGeoJsonGeometry(rings);
    return GeoUtils.calculateAreaHectares(geometry) ?? 0;
  }

  LatLng _calculateCentroid(List<LatLng> ring) {
    if (ring.isEmpty) return const LatLng(0, 0);

    double latSum = 0, lngSum = 0;
    for (final point in ring) {
      latSum += point.latitude;
      lngSum += point.longitude;
    }
    return LatLng(latSum / ring.length, lngSum / ring.length);
  }

  List<List<LatLng>> _extractRings(dynamic rawRings) {
    if (rawRings is! List) return <List<LatLng>>[];

    return rawRings
        .whereType<List>()
        .map((ring) => ring.whereType<LatLng>().toList())
        .where((ring) => ring.length >= 3)
        .toList();
  }

  Map<String, dynamic>? _buildGeoJsonGeometry(List<List<LatLng>> rings) {
    final coordinates = <List<List<double>>>[];

    for (final ring in rings) {
      if (ring.length < 3) continue;

      final ringCoordinates = ring
          .map((point) => <double>[point.longitude, point.latitude])
          .toList();

      final first = ringCoordinates.first;
      final last = ringCoordinates.last;
      if (first[0] != last[0] || first[1] != last[1]) {
        ringCoordinates.add(<double>[first[0], first[1]]);
      }

      coordinates.add(ringCoordinates);
    }

    if (coordinates.isEmpty) return null;

    return {'type': 'Polygon', 'coordinates': coordinates};
  }

  String _resolveBlockId(Map<String, dynamic> feature, int index) {
    final explicitBlockId = feature['block_id']?.toString().trim() ?? '';
    if (explicitBlockId.isNotEmpty) {
      return explicitBlockId;
    }

    final fieldName = feature['field_name']?.toString().trim() ?? '';
    final attributes =
        (feature['attributes'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final blockName = attributes['name']?.toString().trim() ?? '';
    final slugSource = fieldName.isNotEmpty ? fieldName : blockName;
    final slug = _slugify(slugSource);

    if (slug.isNotEmpty) {
      return 'block-$slug-${index + 1}';
    }

    return 'block-${index + 1}';
  }

  String? _featureTextValue(Map<String, dynamic> feature, String key) {
    final value = feature[key];
    if (value == null) return null;
    if (value is num) {
      if (value == value.roundToDouble()) {
        return value.toInt().toString();
      }
      return value.toString();
    }

    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  double? _featureDoubleValue(Map<String, dynamic> feature, String key) {
    final value = feature[key];
    if (value == null) return null;
    if (value is num) return value.toDouble();
    final text = value.toString().trim();
    if (text.isEmpty) return null;
    return double.tryParse(text);
  }

  String? _featureIsoDateValue(Map<String, dynamic> feature, String key) {
    final text = _featureTextValue(feature, key);
    if (text == null) return null;

    final parsed = DateTime.tryParse(text);
    return parsed?.toIso8601String() ?? text;
  }

  String _slugify(String value) {
    return value
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
  }

  void _showFieldMappingDialog(Map<String, dynamic> feature, int index) {
    final attributes = feature['attributes'] as Map<String, dynamic>;
    final attributeKeys = attributes.keys.toList();

    String? selectedBlockIdField;
    String? selectedSectionNameField;
    String? selectedFieldNameField;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Map Fields'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: selectedBlockIdField,
                  items: attributeKeys
                      .map(
                        (key) => DropdownMenuItem(
                          value: key,
                          child: Text('$key: ${attributes[key]}'),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setState(() => selectedBlockIdField = value),
                  decoration: const InputDecoration(
                    labelText: 'Block ID Field',
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: selectedSectionNameField,
                  items: attributeKeys
                      .map(
                        (key) => DropdownMenuItem(
                          value: key,
                          child: Text('$key: ${attributes[key]}'),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setState(() => selectedSectionNameField = value),
                  decoration: const InputDecoration(
                    labelText: 'Section Name Field',
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  initialValue: selectedFieldNameField,
                  items: attributeKeys
                      .map(
                        (key) => DropdownMenuItem(
                          value: key,
                          child: Text('$key: ${attributes[key]}'),
                        ),
                      )
                      .toList(),
                  onChanged: (value) =>
                      setState(() => selectedFieldNameField = value),
                  decoration: const InputDecoration(
                    labelText: 'Field Name Field',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _parsedFeatures[index]['block_id'] =
                      selectedBlockIdField != null
                      ? attributes[selectedBlockIdField].toString()
                      : '';
                  _parsedFeatures[index]['section_name'] =
                      selectedSectionNameField != null
                      ? attributes[selectedSectionNameField].toString()
                      : '';
                  _parsedFeatures[index]['field_name'] =
                      selectedFieldNameField != null
                      ? attributes[selectedFieldNameField].toString()
                      : '';
                });
                Navigator.pop(context);
              },
              child: const Text('Apply'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _createObservations() async {
    if (_parsedFeatures.isEmpty) return;

    setState(() {
      _isProcessing = true;
      _statusMessage = 'Creating observations...';
    });

    try {
      final localDb = LocalDB();
      final syncProvider = Provider.of<SyncProvider>(context, listen: false);

      int createdCount = 0;

      // First, save blocks from the imported features
      print('DEBUG: Saving ${_parsedFeatures.length} blocks...');
      for (int index = 0; index < _parsedFeatures.length; index++) {
        final feature = _parsedFeatures[index];
        try {
          final blockId = _resolveBlockId(feature, index);
          final sectionName = feature['section_name']?.toString().trim() ?? '';
          final attributes = Map<String, dynamic>.from(
            feature['attributes'] as Map<String, dynamic>? ??
                <String, dynamic>{},
          );
          final fieldId = _featureTextValue(feature, 'field_id') ?? '';
          final explicitFieldName = _featureTextValue(feature, 'field_name');
          final blockName =
              explicitFieldName ??
              _featureTextValue(feature, 'block_id') ??
              attributes['name']?.toString().trim() ??
              fieldId;
          final fieldName =
              explicitFieldName ?? (fieldId.isNotEmpty ? fieldId : blockName);
          final rings = _extractRings(feature['rings']);
          final geom = feature['geometry'] ?? _buildGeoJsonGeometry(rings);

          feature['block_id'] = blockId;
          feature['section_name'] = sectionName;
          feature['field_name'] = fieldName;
          feature['geom'] = geom;

          print(
            'DEBUG: Block - ID:$blockId, Name:$blockName, Field:$fieldName, Section:$sectionName',
          );

          // Create BlockModel from feature
          final block = BlockModel(
            id: blockId,
            blockId: blockId,
            sectionName: sectionName.isEmpty ? null : sectionName,
            name: blockName,
            fieldName: fieldName.isEmpty ? null : fieldName,
            geom: geom,
          );

          // Save to local DB
          await localDb.saveBlock(block.toMap());
          print('DEBUG: ✓ Saved block: $blockId - $blockName');
        } catch (e) {
          print('DEBUG: ✗ Error saving block: $e');
        }
      }

      // Now create observations from features
      for (int index = 0; index < _parsedFeatures.length; index++) {
        final feature = _parsedFeatures[index];
        final centroid = feature['centroid'] as LatLng;
        final now = DateTime.now();

        final geometry =
            feature['geometry'] ??
            feature['geom'] ??
            _buildGeoJsonGeometry(_extractRings(feature['rings']));
        final fieldId = _featureTextValue(feature, 'field_id');
        final fieldName =
            _featureTextValue(feature, 'field_name') ??
            fieldId ??
            'Imported field ${index + 1}';
        final blockId = _featureTextValue(feature, 'block_id') ?? '';
        final area =
            _featureDoubleValue(feature, 'area') ??
            _featureDoubleValue(feature, 'hectarage');
        final dateRecorded =
            _featureIsoDateValue(feature, 'date_recorded') ??
            now.toIso8601String();
        final fieldRemarks =
            _featureTextValue(feature, 'field_remarks') ??
            'Imported from spatial data';

        final data = <String, dynamic>{
          if (fieldId != null) 'field_id': fieldId,
          'field_name': fieldName,
          'block_id': blockId,
          'latitude': centroid.latitude,
          'longitude': centroid.longitude,
          'gps_accuracy': 0.0,
          'date_recorded': dateRecorded,
          'crop_type': _featureTextValue(feature, 'crop_type') ?? 'Sugarcane',
          if (_featureTextValue(feature, 'crop_class') != null)
            'crop_class': _featureTextValue(feature, 'crop_class'),
          if (_featureTextValue(feature, 'trial_number') != null)
            'trial_number': _featureTextValue(feature, 'trial_number'),
          if (_featureTextValue(feature, 'trial_name') != null)
            'trial_name': _featureTextValue(feature, 'trial_name'),
          if (_featureTextValue(feature, 'contact_person') != null)
            'contact_person': _featureTextValue(feature, 'contact_person'),
          if (area != null) 'area': area,
          if (_featureTextValue(feature, 'irrigation_type') != null)
            'irrigation_type': _featureTextValue(feature, 'irrigation_type'),
          if (_featureTextValue(feature, 'water_source') != null)
            'water_source': _featureTextValue(feature, 'water_source'),
          if (_featureTextValue(feature, 'tam_mm') != null)
            'tam_mm': _featureTextValue(feature, 'tam_mm'),
          if (_featureTextValue(feature, 'soil_type') != null)
            'soil_type': _featureTextValue(feature, 'soil_type'),
          if (_featureDoubleValue(feature, 'soil_ph') != null)
            'soil_ph': _featureDoubleValue(feature, 'soil_ph'),
          'field_remarks': fieldRemarks,
          if (_featureIsoDateValue(feature, 'planting_date') != null)
            'planting_date': _featureIsoDateValue(feature, 'planting_date'),
          if (_featureIsoDateValue(feature, 'previous_cutting') != null)
            'previous_cutting': _featureIsoDateValue(
              feature,
              'previous_cutting',
            ),
          if (_featureIsoDateValue(feature, 'expected_harvest_date') != null)
            'expected_harvest_date': _featureIsoDateValue(
              feature,
              'expected_harvest_date',
            ),
          if (_featureTextValue(feature, 'residue_type') != null)
            'residue_type': _featureTextValue(feature, 'residue_type'),
          if (_featureTextValue(feature, 'residue_management_method') != null)
            'residue_management_method': _featureTextValue(
              feature,
              'residue_management_method',
            ),
          if (_featureTextValue(feature, 'residual_management_remarks') != null)
            'residual_management_remarks': _featureTextValue(
              feature,
              'residual_management_remarks',
            ),
          if (_featureTextValue(feature, 'fertilizer_type') != null)
            'fertilizer_type': _featureTextValue(feature, 'fertilizer_type'),
          if (_featureIsoDateValue(feature, 'nutrient_application_date') !=
              null)
            'nutrient_application_date': _featureIsoDateValue(
              feature,
              'nutrient_application_date',
            ),
          if (_featureDoubleValue(feature, 'application_rate') != null)
            'application_rate': _featureDoubleValue(
              feature,
              'application_rate',
            ),
          if (_featureIsoDateValue(feature, 'foliar_sampling_date') != null)
            'foliar_sampling_date': _featureIsoDateValue(
              feature,
              'foliar_sampling_date',
            ),
          if (_featureTextValue(feature, 'herbicide_name') != null)
            'herbicide_name': _featureTextValue(feature, 'herbicide_name'),
          if (_featureIsoDateValue(feature, 'weed_application_date') != null)
            'weed_application_date': _featureIsoDateValue(
              feature,
              'weed_application_date',
            ),
          if (_featureDoubleValue(feature, 'weed_application_rate') != null)
            'weed_application_rate': _featureDoubleValue(
              feature,
              'weed_application_rate',
            ),
          if (_featureTextValue(feature, 'pest_remarks') != null)
            'pest_remarks': _featureTextValue(feature, 'pest_remarks'),
          if (_featureTextValue(feature, 'disease_remarks') != null)
            'disease_remarks': _featureTextValue(feature, 'disease_remarks'),
          if (_featureIsoDateValue(feature, 'harvest_date') != null)
            'harvest_date': _featureIsoDateValue(feature, 'harvest_date'),
          if (_featureDoubleValue(feature, 'harvest_yield') != null)
            'harvest_yield': _featureDoubleValue(feature, 'harvest_yield'),
          if (_featureTextValue(feature, 'quality_remarks') != null)
            'quality_remarks': _featureTextValue(feature, 'quality_remarks'),
          if (geometry != null) 'geom_polygon': geometry,
          if (geometry != null) 'geometry': geometry,
          if (geometry != null) 'spatial_data': geometry,
          'created_at': now.toIso8601String(),
          'import_source': 'spatial_geojson',
          'synced': 0,
        };

        await localDb.insertObservation(data);

        createdCount++;
      }

      // Trigger sync
      await syncProvider.startSync();

      setState(() {
        _statusMessage = 'Created $createdCount observations successfully';
        _parsedFeatures = [];
        _selectedFiles = [];
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Created $createdCount observations')),
        );
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Error creating observations: $e';
      });
      print('Create observations error: $e');
    } finally {
      setState(() {
        _isProcessing = false;
      });
    }
  }
}
