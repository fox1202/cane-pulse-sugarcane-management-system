import type { Field } from '@/types/database.types'

type FieldGeometry =
    | {
        type: 'Polygon'
        coordinates: number[][][]
    }
    | {
        type: 'MultiPolygon'
        coordinates: number[][][][]
    }

interface HardcodedFieldProperties {
    field_name: string
    section_name: string
    block_id: string
    crop_type?: string
    latest_stress?: string
    latest_moisture?: number
    observation_count?: number
    is_sprayed?: boolean
    last_spray_date?: string
    latest_observation_date?: string
    updated_at?: string
}

interface HardcodedFieldFeature {
    type: 'Feature'
    properties: HardcodedFieldProperties
    geometry: FieldGeometry
}

interface HardcodedFieldFeatureCollection {
    type: 'FeatureCollection'
    features: HardcodedFieldFeature[]
}

export interface HardcodedFieldRecord extends Field {
    latest_observation_date?: string
    updated_at?: string
}

export const HARDCODED_FIELD_SHAPEFILE: HardcodedFieldFeatureCollection = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {
                field_name: "Sable K2 trial B",
                section_name: "SABLE",
                block_id: "K2 TRIAL B"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61463598956125,
                            -21.03296256788796
                        ],
                        [
                            31.61483132077431,
                            -21.03383990348692
                        ],
                        [
                            31.61545967622858,
                            -21.03371659254729
                        ],
                        [
                            31.6152587972852,
                            -21.03284009414503
                        ],
                        [
                            31.61463598956125,
                            -21.03296256788796
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Sable K2 trial A",
                section_name: "SABLE",
                block_id: "K2 TRIAL A"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61424314093364,
                            -21.03305534234794
                        ],
                        [
                            31.61444866419781,
                            -21.03390950780246
                        ],
                        [
                            31.61482405012035,
                            -21.03383404868602
                        ],
                        [
                            31.61462674748745,
                            -21.03295680394494
                        ],
                        [
                            31.61424314093364,
                            -21.03305534234794
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Sable K1",
                section_name: "SABLE",
                block_id: "K1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61395644198356,
                            -21.03224676109842
                        ],
                        [
                            31.61411051226709,
                            -21.03300972079769
                        ],
                        [
                            31.61522129228558,
                            -21.03278090232173
                        ],
                        [
                            31.61505530389181,
                            -21.03203001017649
                        ],
                        [
                            31.61395644198356,
                            -21.03224676109842
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Sable J3",
                section_name: "SABLE",
                block_id: "J3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61358147602282,
                            -21.03415773474256
                        ],
                        [
                            31.61373560114986,
                            -21.0348629446174
                        ],
                        [
                            31.61444184272778,
                            -21.03472959857438
                        ],
                        [
                            31.61432249339157,
                            -21.03400401804402
                        ],
                        [
                            31.61358147602282,
                            -21.03415773474256
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Sable J4",
                section_name: "SABLE",
                block_id: "J4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61374722846459,
                            -21.03493750378471
                        ],
                        [
                            31.61390583873307,
                            -21.03570060388877
                        ],
                        [
                            31.61463769562256,
                            -21.03556936837081
                        ],
                        [
                            31.61446183264476,
                            -21.03478825792673
                        ],
                        [
                            31.61374722846459,
                            -21.03493750378471
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "K3 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "K3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61444630108168,
                            -21.03395990598919
                        ],
                        [
                            31.614614572655,
                            -21.03474078317391
                        ],
                        [
                            31.61514626457168,
                            -21.03462263708066
                        ],
                        [
                            31.61492054820852,
                            -21.03388710652916
                        ],
                        [
                            31.61444630108168,
                            -21.03395990598919
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "K3 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "K3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61494045886292,
                            -21.0338809156432
                        ],
                        [
                            31.61515950018724,
                            -21.03461588932809
                        ],
                        [
                            31.61565304014263,
                            -21.03451495970689
                        ],
                        [
                            31.61547004106343,
                            -21.03375928303794
                        ],
                        [
                            31.61494045886292,
                            -21.0338809156432
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "K4 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "K4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61461867590666,
                            -21.03477433466817
                        ],
                        [
                            31.61478132619186,
                            -21.03556486944061
                        ],
                        [
                            31.614944683623,
                            -21.03553061212487
                        ],
                        [
                            31.61476651002749,
                            -21.03473398766618
                        ],
                        [
                            31.61461867590666,
                            -21.03477433466817
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Untitled polygon",
                section_name: "ZSAES TRIAL SITES",
                block_id: "UNTITLED"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61477728793628,
                            -21.03472668001409
                        ],
                        [
                            31.61495894590362,
                            -21.03553166438935
                        ],
                        [
                            31.61584609566587,
                            -21.03535080436442
                        ],
                        [
                            31.61565587080031,
                            -21.03452764048956
                        ],
                        [
                            31.61477728793628,
                            -21.03472668001409
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L1 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61514678353047,
                            -21.032023536629
                        ],
                        [
                            31.61522822512442,
                            -21.03236081611857
                        ],
                        [
                            31.61662606128134,
                            -21.03208265153928
                        ],
                        [
                            31.61653613438698,
                            -21.03173350837161
                        ],
                        [
                            31.61514678353047,
                            -21.032023536629
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L1 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61522684049769,
                            -21.03236831832448
                        ],
                        [
                            31.61525294240884,
                            -21.03249886188371
                        ],
                        [
                            31.61666425509044,
                            -21.03221612321743
                        ],
                        [
                            31.61662644116901,
                            -21.03208037962769
                        ],
                        [
                            31.61522684049769,
                            -21.03236831832448
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L1 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61524834868804,
                            -21.03249609280448
                        ],
                        [
                            31.61530120991797,
                            -21.03276375144334
                        ],
                        [
                            31.61673486288304,
                            -21.03247126873578
                        ],
                        [
                            31.61666265571049,
                            -21.03221769868533
                        ],
                        [
                            31.61524834868804,
                            -21.03249609280448
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L2 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61531558797861,
                            -21.03282214718229
                        ],
                        [
                            31.61541260976713,
                            -21.03328765697458
                        ],
                        [
                            31.61684016614085,
                            -21.03298706390801
                        ],
                        [
                            31.61672446834978,
                            -21.03252468170528
                        ],
                        [
                            31.61531558797861,
                            -21.03282214718229
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L2 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61541333770435,
                            -21.0332949320099
                        ],
                        [
                            31.61551123338105,
                            -21.03371563028145
                        ],
                        [
                            31.61695282584203,
                            -21.03341481188241
                        ],
                        [
                            31.61684008544436,
                            -21.03299156870074
                        ],
                        [
                            31.61541333770435,
                            -21.0332949320099
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L3 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61552734787899,
                            -21.03375912338227
                        ],
                        [
                            31.61558517070977,
                            -21.03402662976978
                        ],
                        [
                            31.61701785045397,
                            -21.03373571114634
                        ],
                        [
                            31.61696323716108,
                            -21.03345887659589
                        ],
                        [
                            31.61552734787899,
                            -21.03375912338227
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L3 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61558715565172,
                            -21.03403325374907
                        ],
                        [
                            31.61563743550195,
                            -21.03426556232974
                        ],
                        [
                            31.61708278657899,
                            -21.03398157404197
                        ],
                        [
                            31.61702017176995,
                            -21.03372820203152
                        ],
                        [
                            31.61558715565172,
                            -21.03403325374907
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L4 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61564811342455,
                            -21.03432611158947
                        ],
                        [
                            31.61581313485611,
                            -21.03502142640673
                        ],
                        [
                            31.61725264880969,
                            -21.03473733237513
                        ],
                        [
                            31.61706968706455,
                            -21.03403216319889
                        ],
                        [
                            31.61564811342455,
                            -21.03432611158947
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "L4 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "L4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6158194625245,
                            -21.03503186119149
                        ],
                        [
                            31.61588768087199,
                            -21.03532913743769
                        ],
                        [
                            31.61732213564146,
                            -21.03505614801676
                        ],
                        [
                            31.61724832156928,
                            -21.03476435427323
                        ],
                        [
                            31.6158194625245,
                            -21.03503186119149
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "N1A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "N1A"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61661685398834,
                            -21.03172467751732
                        ],
                        [
                            31.61678577355507,
                            -21.03246130766877
                        ],
                        [
                            31.61766959212476,
                            -21.03229892367845
                        ],
                        [
                            31.61750458058575,
                            -21.03155325589377
                        ],
                        [
                            31.61661685398834,
                            -21.03172467751732
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "N1B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "N1B"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61756608962665,
                            -21.03155028278871
                        ],
                        [
                            31.61774057242582,
                            -21.03229542593845
                        ],
                        [
                            31.61837802773212,
                            -21.03216644848079
                        ],
                        [
                            31.61821381660754,
                            -21.03142160862492
                        ],
                        [
                            31.61756608962665,
                            -21.03155028278871
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "M1",
                section_name: "ZSAES TRIAL SITES",
                block_id: "M1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61413629463421,
                            -21.0368411913557
                        ],
                        [
                            31.61429109078487,
                            -21.03761970030294
                        ],
                        [
                            31.61442496382431,
                            -21.03772832380234
                        ],
                        [
                            31.61533407786435,
                            -21.03753372270331
                        ],
                        [
                            31.61515292976787,
                            -21.03666217623635
                        ],
                        [
                            31.61413629463421,
                            -21.0368411913557
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "M2",
                section_name: "ZSAES TRIAL SITES",
                block_id: "M2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61522889618665,
                            -21.03666294564304
                        ],
                        [
                            31.61540522268767,
                            -21.03753472758691
                        ],
                        [
                            31.61643462515741,
                            -21.03731191479234
                        ],
                        [
                            31.61626207510165,
                            -21.03646247131656
                        ],
                        [
                            31.61522889618665,
                            -21.03666294564304
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "M3",
                section_name: "ZSAES TRIAL SITES",
                block_id: "M3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6139298656313,
                            -21.0359775976809
                        ],
                        [
                            31.61411930271048,
                            -21.03677026393914
                        ],
                        [
                            31.61515368857519,
                            -21.03658685121689
                        ],
                        [
                            31.61498034815677,
                            -21.03576763445221
                        ],
                        [
                            31.6139298656313,
                            -21.0359775976809
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "M4",
                section_name: "ZSAES TRIAL SITES",
                block_id: "M4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61504606488525,
                            -21.03575557869826
                        ],
                        [
                            31.61521417541161,
                            -21.03656619827089
                        ],
                        [
                            31.61622459830092,
                            -21.03638507666743
                        ],
                        [
                            31.61602815814698,
                            -21.0355658640188
                        ],
                        [
                            31.61504606488525,
                            -21.03575557869826
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "N2",
                section_name: "ZSAES TRIAL SITES",
                block_id: "N2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61680265996366,
                            -21.03253089504411
                        ],
                        [
                            31.61699497818553,
                            -21.03339446196376
                        ],
                        [
                            31.61859931104208,
                            -21.03307876153182
                        ],
                        [
                            31.61840994692797,
                            -21.03224938594667
                        ],
                        [
                            31.61680265996366,
                            -21.03253089504411
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "N3",
                section_name: "ZSAES TRIAL SITES",
                block_id: "N3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61703974379891,
                            -21.03348306030477
                        ],
                        [
                            31.61712611907208,
                            -21.03395272866161
                        ],
                        [
                            31.61831139501274,
                            -21.03373327137056
                        ],
                        [
                            31.61819978194091,
                            -21.03324072901882
                        ],
                        [
                            31.61703974379891,
                            -21.03348306030477
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "N4 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "N4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61716169597698,
                            -21.03402361207229
                        ],
                        [
                            31.61736998690944,
                            -21.03493155027374
                        ],
                        [
                            31.61785398102959,
                            -21.03445908235899
                        ],
                        [
                            31.61776212047598,
                            -21.03391369529551
                        ],
                        [
                            31.61716169597698,
                            -21.03402361207229
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "N4 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "N4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6177880044354,
                            -21.03390428380021
                        ],
                        [
                            31.61787761506088,
                            -21.03440879531382
                        ],
                        [
                            31.6183454839582,
                            -21.03395197567812
                        ],
                        [
                            31.61828380859423,
                            -21.03379076732019
                        ],
                        [
                            31.6177880044354,
                            -21.03390428380021
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S1 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61213732749072,
                            -21.03472845613914
                        ],
                        [
                            31.61225771131963,
                            -21.03523967890032
                        ],
                        [
                            31.61352497900883,
                            -21.03499666940898
                        ],
                        [
                            31.61339857292148,
                            -21.03447643548075
                        ],
                        [
                            31.61213732749072,
                            -21.03472845613914
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S1 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61210259786681,
                            -21.03459510631624
                        ],
                        [
                            31.61213330491315,
                            -21.03472039884706
                        ],
                        [
                            31.6134128608254,
                            -21.03446627958019
                        ],
                        [
                            31.61338919895413,
                            -21.03434561231704
                        ],
                        [
                            31.61210259786681,
                            -21.03459510631624
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S1 trial E",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6120394470543,
                            -21.0343256459995
                        ],
                        [
                            31.61210780897345,
                            -21.03459042002616
                        ],
                        [
                            31.61337680745595,
                            -21.0343398160193
                        ],
                        [
                            31.6133138851268,
                            -21.03406517166005
                        ],
                        [
                            31.6120394470543,
                            -21.0343256459995
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S1 trial F",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61166954849426,
                            -21.0327028682262
                        ],
                        [
                            31.61203393084993,
                            -21.03431398405547
                        ],
                        [
                            31.61332451336508,
                            -21.03405488240562
                        ],
                        [
                            31.61293472472726,
                            -21.03242837396396
                        ],
                        [
                            31.61166954849426,
                            -21.0327028682262
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S2",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61035099828323,
                            -21.03297664016915
                        ],
                        [
                            31.61108382841942,
                            -21.0362151449352
                        ],
                        [
                            31.61234166884967,
                            -21.03594922382576
                        ],
                        [
                            31.61155849774605,
                            -21.03278169203371
                        ],
                        [
                            31.61035099828323,
                            -21.03297664016915
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S3 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.60900914688299,
                            -21.03324369557642
                        ],
                        [
                            31.60913307715412,
                            -21.03376346802479
                        ],
                        [
                            31.61037672916897,
                            -21.03349487734328
                        ],
                        [
                            31.61026518531336,
                            -21.03299926111594
                        ],
                        [
                            31.60900914688299,
                            -21.03324369557642
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S3 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6091341933164,
                            -21.03377176989463
                        ],
                        [
                            31.60945164396295,
                            -21.03511677277179
                        ],
                        [
                            31.61067366127066,
                            -21.0349037692126
                        ],
                        [
                            31.61037768328855,
                            -21.03350321402944
                        ],
                        [
                            31.6091341933164,
                            -21.03377176989463
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S4 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61245910465673,
                            -21.03608288518375
                        ],
                        [
                            31.61284600400251,
                            -21.03774960251048
                        ],
                        [
                            31.6140972557877,
                            -21.03737374087294
                        ],
                        [
                            31.61372450453437,
                            -21.03581121903117
                        ],
                        [
                            31.61245910465673,
                            -21.03608288518375
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S1 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61366590073632,
                            -21.03571166756088
                        ],
                        [
                            31.61368640223298,
                            -21.03563664919645
                        ],
                        [
                            31.61360882454728,
                            -21.0353190940552
                        ],
                        [
                            31.61233827940127,
                            -21.0355695854989
                        ],
                        [
                            31.6124355959098,
                            -21.03596211261448
                        ],
                        [
                            31.61366590073632,
                            -21.03571166756088
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S1 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61360989000769,
                            -21.03531321563093
                        ],
                        [
                            31.61352649465626,
                            -21.03499676729445
                        ],
                        [
                            31.61225943887093,
                            -21.03524113903768
                        ],
                        [
                            31.61233482623576,
                            -21.0355696999077
                        ],
                        [
                            31.61360989000769,
                            -21.03531321563093
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S4 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6128467030652,
                            -21.03775142886315
                        ],
                        [
                            31.61312116684729,
                            -21.03902472801659
                        ],
                        [
                            31.61425855198386,
                            -21.03880210618637
                        ],
                        [
                            31.61436626120938,
                            -21.03859217718009
                        ],
                        [
                            31.61409201982525,
                            -21.03736367670763
                        ],
                        [
                            31.6128467030652,
                            -21.03775142886315
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S5 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S5"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61108223518658,
                            -21.0363414934183
                        ],
                        [
                            31.61148322546454,
                            -21.0381702550149
                        ],
                        [
                            31.61280084815987,
                            -21.03793813820811
                        ],
                        [
                            31.61238157486093,
                            -21.03606744872706
                        ],
                        [
                            31.61108223518658,
                            -21.0363414934183
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S5 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S5"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61148410659678,
                            -21.03817122804235
                        ],
                        [
                            31.61157949062588,
                            -21.03858536037344
                        ],
                        [
                            31.61287134825507,
                            -21.03834515953067
                        ],
                        [
                            31.61280084184112,
                            -21.03793902070261
                        ],
                        [
                            31.61148410659678,
                            -21.03817122804235
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S5 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S5"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61158068541427,
                            -21.03858579490216
                        ],
                        [
                            31.61168255682754,
                            -21.0390330260185
                        ],
                        [
                            31.61298882344956,
                            -21.03881536563452
                        ],
                        [
                            31.61287117150516,
                            -21.03834532842295
                        ],
                        [
                            31.61158068541427,
                            -21.03858579490216
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S5 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S5"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61168489371997,
                            -21.03903351471423
                        ],
                        [
                            31.61176103550731,
                            -21.039303911248
                        ],
                        [
                            31.61306509159484,
                            -21.03906984999909
                        ],
                        [
                            31.61298895502204,
                            -21.03881571276956
                        ],
                        [
                            31.61168489371997,
                            -21.03903351471423
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S6 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S6"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.60979949400862,
                            -21.03661498544736
                        ],
                        [
                            31.61012924457605,
                            -21.03819705847775
                        ],
                        [
                            31.61028589016925,
                            -21.03847013882628
                        ],
                        [
                            31.61145400592349,
                            -21.03826740602531
                        ],
                        [
                            31.61101791169316,
                            -21.03633298721094
                        ],
                        [
                            31.60979949400862,
                            -21.03661498544736
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S6 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S6"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61028480035439,
                            -21.038466678382
                        ],
                        [
                            31.61059821429595,
                            -21.03887006215085
                        ],
                        [
                            31.6115535792941,
                            -21.0386849628222
                        ],
                        [
                            31.61145229623848,
                            -21.03827008368477
                        ],
                        [
                            31.61028480035439,
                            -21.038466678382
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S6 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S6"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61059906561247,
                            -21.03886884635456
                        ],
                        [
                            31.61069626939343,
                            -21.03930253773295
                        ],
                        [
                            31.6116341982106,
                            -21.03910176415083
                        ],
                        [
                            31.61155343902416,
                            -21.03869987159788
                        ],
                        [
                            31.61059906561247,
                            -21.03886884635456
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S6 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S6"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61069955295401,
                            -21.03930328095332
                        ],
                        [
                            31.6107205905675,
                            -21.03944195459601
                        ],
                        [
                            31.61075214342008,
                            -21.03951928121437
                        ],
                        [
                            31.61171739032506,
                            -21.03931724699112
                        ],
                        [
                            31.61163500261549,
                            -21.03910098072594
                        ],
                        [
                            31.61069955295401,
                            -21.03930328095332
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S3 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.60971839723296,
                            -21.03631745362246
                        ],
                        [
                            31.60975359812345,
                            -21.0365026368724
                        ],
                        [
                            31.61100180376046,
                            -21.03623686594025
                        ],
                        [
                            31.61096669498195,
                            -21.03610629821992
                        ],
                        [
                            31.60971839723296,
                            -21.03631745362246
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "S3 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "S3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.60945257813975,
                            -21.03511724520828
                        ],
                        [
                            31.60971823132554,
                            -21.03631701423589
                        ],
                        [
                            31.61096607645542,
                            -21.0361057947557
                        ],
                        [
                            31.61067386002223,
                            -21.03490431088072
                        ],
                        [
                            31.60945257813975,
                            -21.03511724520828
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z1 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61421933780004,
                            -21.04001249546038
                        ],
                        [
                            31.61386692458413,
                            -21.04095601586735
                        ],
                        [
                            31.61446518664538,
                            -21.04115159167712
                        ],
                        [
                            31.61481976377979,
                            -21.04020020420614
                        ],
                        [
                            31.61421933780004,
                            -21.04001249546038
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z1 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61481842382085,
                            -21.04020107030004
                        ],
                        [
                            31.61446492685329,
                            -21.04115143990394
                        ],
                        [
                            31.61490169248068,
                            -21.04129952905104
                        ],
                        [
                            31.61526476273336,
                            -21.04035506816002
                        ],
                        [
                            31.61481842382085,
                            -21.04020107030004
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z1 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61526841773434,
                            -21.04035019078587
                        ],
                        [
                            31.61490228006272,
                            -21.04130057337667
                        ],
                        [
                            31.61545541373387,
                            -21.04148653299426
                        ],
                        [
                            31.6158033199067,
                            -21.04051834918875
                        ],
                        [
                            31.61526841773434,
                            -21.04035019078587
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z1 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61580035077773,
                            -21.04051785275407
                        ],
                        [
                            31.61545084293299,
                            -21.0414847969329
                        ],
                        [
                            31.61613542228629,
                            -21.04171737242955
                        ],
                        [
                            31.61649963884091,
                            -21.04073385940772
                        ],
                        [
                            31.61580035077773,
                            -21.04051785275407
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z1 trial E",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61650311621824,
                            -21.04073118614743
                        ],
                        [
                            31.61613813721901,
                            -21.04171810683349
                        ],
                        [
                            31.61680149398853,
                            -21.04193208161192
                        ],
                        [
                            31.61715051898673,
                            -21.04095105615212
                        ],
                        [
                            31.61650311621824,
                            -21.04073118614743
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z1 trial F",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61715051898673,
                            -21.04095105615212
                        ],
                        [
                            31.61680149398853,
                            -21.04193208161192
                        ],
                        [
                            31.61705051605831,
                            -21.04201816188029
                        ],
                        [
                            31.61741786162739,
                            -21.0410429881949
                        ],
                        [
                            31.61715051898673,
                            -21.04095105615212
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z4 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61383313643719,
                            -21.04338517918082
                        ],
                        [
                            31.61366940679427,
                            -21.04384873153671
                        ],
                        [
                            31.6142841585377,
                            -21.04405505785286
                        ],
                        [
                            31.61445920319035,
                            -21.04358649194192
                        ],
                        [
                            31.61383313643719,
                            -21.04338517918082
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z4 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61290181865479,
                            -21.04366671556992
                        ],
                        [
                            31.61263354368907,
                            -21.04426903018938
                        ],
                        [
                            31.61378976530536,
                            -21.04466862261167
                        ],
                        [
                            31.61401810833613,
                            -21.04468300693547
                        ],
                        [
                            31.61425266932778,
                            -21.04412140272723
                        ],
                        [
                            31.61290181865479,
                            -21.04366671556992
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z4 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61446942114265,
                            -21.04360138917675
                        ],
                        [
                            31.61409904518095,
                            -21.0446691381411
                        ],
                        [
                            31.61431619653671,
                            -21.04460192833385
                        ],
                        [
                            31.61466752532018,
                            -21.04363299833673
                        ],
                        [
                            31.61446942114265,
                            -21.04360138917675
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "ZE trial E",
                section_name: "ZSAES TRIAL SITES",
                block_id: "ZE"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61466752532018,
                            -21.04363299833673
                        ],
                        [
                            31.61431619653671,
                            -21.04460192833385
                        ],
                        [
                            31.61456818629737,
                            -21.04450218271868
                        ],
                        [
                            31.61486597890518,
                            -21.04371825691044
                        ],
                        [
                            31.61466752532018,
                            -21.04363299833673
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z4 trial F",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61486604342401,
                            -21.04371830902334
                        ],
                        [
                            31.61456812648477,
                            -21.04450569384254
                        ],
                        [
                            31.61494995340303,
                            -21.04436314712654
                        ],
                        [
                            31.61513325517873,
                            -21.04382148558907
                        ],
                        [
                            31.61486604342401,
                            -21.04371830902334
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z4 trial G",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6151370733206,
                            -21.04382148546419
                        ],
                        [
                            31.61495376644339,
                            -21.04437384110934
                        ],
                        [
                            31.61588388035751,
                            -21.04403232909564
                        ],
                        [
                            31.6151370733206,
                            -21.04382148546419
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z2 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6150048391827,
                            -21.04140526671979
                        ],
                        [
                            31.6146661295419,
                            -21.04240294890679
                        ],
                        [
                            31.61508439248512,
                            -21.04256801619968
                        ],
                        [
                            31.6154348202071,
                            -21.041534572136
                        ],
                        [
                            31.6150048391827,
                            -21.04140526671979
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z2 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61383620670739,
                            -21.04105103004752
                        ],
                        [
                            31.61346800252016,
                            -21.04200121270705
                        ],
                        [
                            31.61466372613393,
                            -21.04240084157127
                        ],
                        [
                            31.61499869439322,
                            -21.04140266606026
                        ],
                        [
                            31.61383620670739,
                            -21.04105103004752
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z2 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61543642756735,
                            -21.0415346597552
                        ],
                        [
                            31.61508799329227,
                            -21.04256883106441
                        ],
                        [
                            31.61553520894621,
                            -21.04270183525065
                        ],
                        [
                            31.61586943018599,
                            -21.04169439355451
                        ],
                        [
                            31.61543642756735,
                            -21.0415346597552
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z2 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6158684349971,
                            -21.0417022660884
                        ],
                        [
                            31.61553389360727,
                            -21.04270214572908
                        ],
                        [
                            31.61576718714414,
                            -21.04280233716476
                        ],
                        [
                            31.61610350072048,
                            -21.04178408402074
                        ],
                        [
                            31.6158684349971,
                            -21.0417022660884
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z2 trial E",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61610113417452,
                            -21.04178550940592
                        ],
                        [
                            31.61576875963151,
                            -21.04280110598339
                        ],
                        [
                            31.61641916943693,
                            -21.04300565583663
                        ],
                        [
                            31.61672224898665,
                            -21.04199691209674
                        ],
                        [
                            31.61610113417452,
                            -21.04178550940592
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "F2 trial F",
                section_name: "ZSAES TRIAL SITES",
                block_id: "F2"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61672323286385,
                            -21.04199737691404
                        ],
                        [
                            31.61642073155756,
                            -21.04300696617723
                        ],
                        [
                            31.61670641610986,
                            -21.043104723669
                        ],
                        [
                            31.61703647815076,
                            -21.04210025335237
                        ],
                        [
                            31.61672323286385,
                            -21.04199737691404
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z3 trial B",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61386813995917,
                            -21.04220050745177
                        ],
                        [
                            31.61351620378585,
                            -21.04315134484522
                        ],
                        [
                            31.61456945070948,
                            -21.04350273350885
                        ],
                        [
                            31.61490132471638,
                            -21.04255274353175
                        ],
                        [
                            31.61386813995917,
                            -21.04220050745177
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z3 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61345347159666,
                            -21.04203787131523
                        ],
                        [
                            31.61309950730868,
                            -21.04301589249046
                        ],
                        [
                            31.61351991903373,
                            -21.04315108720517
                        ],
                        [
                            31.61386826827403,
                            -21.04220079713613
                        ],
                        [
                            31.61345347159666,
                            -21.04203787131523
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z3 trial C",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61490132299949,
                            -21.04255274078452
                        ],
                        [
                            31.61456938245684,
                            -21.0434990182451
                        ],
                        [
                            31.61481722731939,
                            -21.04360276599976
                        ],
                        [
                            31.61515333266345,
                            -21.04261687326983
                        ],
                        [
                            31.61490132299949,
                            -21.04255274078452
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z3 trial D",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61514951524009,
                            -21.04261687354304
                        ],
                        [
                            31.61482104100491,
                            -21.04360276609324
                        ],
                        [
                            31.6152449601326,
                            -21.04373565241823
                        ],
                        [
                            31.6155854207257,
                            -21.04276311187144
                        ],
                        [
                            31.61514951524009,
                            -21.04261687354304
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "ZE trial E (2)",
                section_name: "ZSAES TRIAL SITES",
                block_id: "ZE"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61558465048391,
                            -21.04276783970203
                        ],
                        [
                            31.61523933306731,
                            -21.04373388971415
                        ],
                        [
                            31.61573540355094,
                            -21.04391788577511
                        ],
                        [
                            31.61608742212627,
                            -21.04290066083691
                        ],
                        [
                            31.61558465048391,
                            -21.04276783970203
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z3 trial F",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61608876218245,
                            -21.04293549011665
                        ],
                        [
                            31.61573885613191,
                            -21.04391800140131
                        ],
                        [
                            31.61597866811683,
                            -21.04400588059178
                        ],
                        [
                            31.61616764793632,
                            -21.04399248836555
                        ],
                        [
                            31.61637866353811,
                            -21.04387710087633
                        ],
                        [
                            31.61645881391573,
                            -21.04377388577188
                        ],
                        [
                            31.61670089872293,
                            -21.04311873485454
                        ],
                        [
                            31.61608876218245,
                            -21.04293549011665
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Z4 trial A",
                section_name: "ZSAES TRIAL SITES",
                block_id: "Z4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61303930844043,
                            -21.04310176047305
                        ],
                        [
                            31.6128770604615,
                            -21.04360153486939
                        ],
                        [
                            31.61366684116278,
                            -21.04385482855782
                        ],
                        [
                            31.61383456683451,
                            -21.04336652122591
                        ],
                        [
                            31.61303930844043,
                            -21.04310176047305
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala A1-3",
                section_name: "IMPALA",
                block_id: "A1-3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62068537852229,
                            -21.03700918350014
                        ],
                        [
                            31.62161768337019,
                            -21.03740222869292
                        ],
                        [
                            31.62183722371899,
                            -21.03696930138132
                        ],
                        [
                            31.62089863442133,
                            -21.0365641274536
                        ],
                        [
                            31.62068537852229,
                            -21.03700918350014
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala A4-7",
                section_name: "IMPALA",
                block_id: "A4-7"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62090233488343,
                            -21.03656422260726
                        ],
                        [
                            31.62183557465806,
                            -21.03696774540887
                        ],
                        [
                            31.62214816028947,
                            -21.0363691118216
                        ],
                        [
                            31.62120498003373,
                            -21.03598424324911
                        ],
                        [
                            31.62090233488343,
                            -21.03656422260726
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala A8-11",
                section_name: "IMPALA",
                block_id: "A8-11"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62123370381552,
                            -21.03593350338566
                        ],
                        [
                            31.6221516571338,
                            -21.03636744252044
                        ],
                        [
                            31.62245322869488,
                            -21.03578219774591
                        ],
                        [
                            31.62151770094306,
                            -21.03533434058865
                        ],
                        [
                            31.62123370381552,
                            -21.03593350338566
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala B1-12",
                section_name: "IMPALA",
                block_id: "B1-12"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62145967286961,
                            -21.03526737382983
                        ],
                        [
                            31.62250097032116,
                            -21.03571964580843
                        ],
                        [
                            31.62286274825606,
                            -21.03487632485644
                        ],
                        [
                            31.62190774578786,
                            -21.03445661804858
                        ],
                        [
                            31.62145967286961,
                            -21.03526737382983
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala B13-18",
                section_name: "IMPALA",
                block_id: "B13-18"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62194085197713,
                            -21.03441560770163
                        ],
                        [
                            31.62286823814111,
                            -21.03487795432217
                        ],
                        [
                            31.62331737365075,
                            -21.03415734434517
                        ],
                        [
                            31.62228558333157,
                            -21.03370072687734
                        ],
                        [
                            31.62194085197713,
                            -21.03441560770163
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala C1-5",
                section_name: "IMPALA",
                block_id: "C1-5"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62171939783784,
                            -21.03745336166029
                        ],
                        [
                            31.62268344939535,
                            -21.03786740804974
                        ],
                        [
                            31.62307126981229,
                            -21.03715248747752
                        ],
                        [
                            31.62211927316519,
                            -21.03671736036523
                        ],
                        [
                            31.62171939783784,
                            -21.03745336166029
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala C6-9",
                section_name: "IMPALA",
                block_id: "C6-9"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62211936732239,
                            -21.03672020359208
                        ],
                        [
                            31.62306744395557,
                            -21.03714720669317
                        ],
                        [
                            31.62332571892573,
                            -21.0366197209089
                        ],
                        [
                            31.62238367296769,
                            -21.03613405020887
                        ],
                        [
                            31.62211936732239,
                            -21.03672020359208
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala C10-11",
                section_name: "IMPALA",
                block_id: "C10-11"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62238352852295,
                            -21.03613606493955
                        ],
                        [
                            31.62333503648289,
                            -21.03661836380124
                        ],
                        [
                            31.62348349716184,
                            -21.03626850100623
                        ],
                        [
                            31.62254987317096,
                            -21.03583435248633
                        ],
                        [
                            31.62238352852295,
                            -21.03613606493955
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala D1-12",
                section_name: "IMPALA",
                block_id: "D1-12"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62261561997726,
                            -21.03578358240128
                        ],
                        [
                            31.62357177013072,
                            -21.03616941527298
                        ],
                        [
                            31.62403610727435,
                            -21.03516618170332
                        ],
                        [
                            31.62311812203708,
                            -21.0348011340717
                        ],
                        [
                            31.62261561997726,
                            -21.03578358240128
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala D15-16",
                section_name: "IMPALA",
                block_id: "D15-16"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62341868188787,
                            -21.03488367530285
                        ],
                        [
                            31.62373420948825,
                            -21.03504454247194
                        ],
                        [
                            31.62401773035846,
                            -21.03453455724836
                        ],
                        [
                            31.62375123388056,
                            -21.03434984990914
                        ],
                        [
                            31.62341868188787,
                            -21.03488367530285
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala D17-18",
                section_name: "IMPALA",
                block_id: "D17-18"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62373603097337,
                            -21.03504997037258
                        ],
                        [
                            31.62403336794693,
                            -21.03516722835965
                        ],
                        [
                            31.62433423532534,
                            -21.03463601597104
                        ],
                        [
                            31.62401697950634,
                            -21.03453341078937
                        ],
                        [
                            31.62373603097337,
                            -21.03504997037258
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala D13-14",
                section_name: "IMPALA",
                block_id: "D13-14"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.6231082642735,
                            -21.0347644736253
                        ],
                        [
                            31.6234171462751,
                            -21.03488639738206
                        ],
                        [
                            31.62374961264247,
                            -21.03434970202332
                        ],
                        [
                            31.62339868023456,
                            -21.03424526070062
                        ],
                        [
                            31.6231082642735,
                            -21.0347644736253
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala 1-3",
                section_name: "IMPALA",
                block_id: "1-3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62296538063674,
                            -21.03768144925041
                        ],
                        [
                            31.62341594538239,
                            -21.03786750785808
                        ],
                        [
                            31.6238680484711,
                            -21.03697167666855
                        ],
                        [
                            31.62338379094802,
                            -21.03676846650735
                        ],
                        [
                            31.62296538063674,
                            -21.03768144925041
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala E4",
                section_name: "IMPALA",
                block_id: "E4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62341875002313,
                            -21.03788966443238
                        ],
                        [
                            31.62356747873562,
                            -21.03793359917476
                        ],
                        [
                            31.62403482301833,
                            -21.03706659956379
                        ],
                        [
                            31.62386766597189,
                            -21.03698230256285
                        ],
                        [
                            31.62341875002313,
                            -21.03788966443238
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala E5-6",
                section_name: "IMPALA",
                block_id: "E5-6"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62356727424513,
                            -21.03793364296149
                        ],
                        [
                            31.62386952512614,
                            -21.0380838930889
                        ],
                        [
                            31.62434568128476,
                            -21.03719634818247
                        ],
                        [
                            31.62403378771711,
                            -21.0370658666267
                        ],
                        [
                            31.62356727424513,
                            -21.03793364296149
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala E7-8",
                section_name: "IMPALA",
                block_id: "E7-8"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62387061770158,
                            -21.03808400720193
                        ],
                        [
                            31.62420147728833,
                            -21.03820066671211
                        ],
                        [
                            31.62467234656974,
                            -21.03733599328002
                        ],
                        [
                            31.6243486596977,
                            -21.03720208509382
                        ],
                        [
                            31.62387061770158,
                            -21.03808400720193
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala E9-10",
                section_name: "IMPALA",
                block_id: "E9-10"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62420274298424,
                            -21.03823545690017
                        ],
                        [
                            31.62455253069584,
                            -21.03835110966618
                        ],
                        [
                            31.62500143963178,
                            -21.03748450808513
                        ],
                        [
                            31.62466884656531,
                            -21.03733557729377
                        ],
                        [
                            31.62420274298424,
                            -21.03823545690017
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala E11",
                section_name: "IMPALA",
                block_id: "E11"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62455360622247,
                            -21.03835139110543
                        ],
                        [
                            31.62463643103785,
                            -21.0383601734144
                        ],
                        [
                            31.62474082178308,
                            -21.03830857367206
                        ],
                        [
                            31.6248207371085,
                            -21.03822234220658
                        ],
                        [
                            31.62515108012024,
                            -21.0375520034338
                        ],
                        [
                            31.62500486414523,
                            -21.03748323791201
                        ],
                        [
                            31.62455360622247,
                            -21.03835139110543
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F1",
                section_name: "IMPALA",
                block_id: "F1"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62343259634512,
                            -21.03673432713271
                        ],
                        [
                            31.62360512350822,
                            -21.03678518976662
                        ],
                        [
                            31.62407161047557,
                            -21.03588993948571
                        ],
                        [
                            31.6239001904666,
                            -21.03579891437341
                        ],
                        [
                            31.62343259634512,
                            -21.03673432713271
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F2-3",
                section_name: "IMPALA",
                block_id: "F2-3"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62360512350822,
                            -21.03678518976662
                        ],
                        [
                            31.62386768439321,
                            -21.03691425143594
                        ],
                        [
                            31.62436754261277,
                            -21.03605107618212
                        ],
                        [
                            31.62406999202636,
                            -21.03588583947043
                        ],
                        [
                            31.62360512350822,
                            -21.03678518976662
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F7-8",
                section_name: "IMPALA",
                block_id: "F7-8"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62438174943736,
                            -21.03715137878618
                        ],
                        [
                            31.62470200321594,
                            -21.0372701294408
                        ],
                        [
                            31.62517184470112,
                            -21.0364015504739
                        ],
                        [
                            31.6248516541044,
                            -21.03623457583877
                        ],
                        [
                            31.62438174943736,
                            -21.03715137878618
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F9",
                section_name: "IMPALA",
                block_id: "F9"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62470245100295,
                            -21.03727034340452
                        ],
                        [
                            31.62486867704068,
                            -21.03736760331035
                        ],
                        [
                            31.62533450503588,
                            -21.03646991611333
                        ],
                        [
                            31.62517077986949,
                            -21.0364044078437
                        ],
                        [
                            31.62470245100295,
                            -21.03727034340452
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F10",
                section_name: "IMPALA",
                block_id: "F10"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62487163263631,
                            -21.03736845355581
                        ],
                        [
                            31.62502560715554,
                            -21.03744123282755
                        ],
                        [
                            31.62548590936247,
                            -21.03651630227276
                        ],
                        [
                            31.62533489485364,
                            -21.03646828662426
                        ],
                        [
                            31.62487163263631,
                            -21.03736845355581
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F11",
                section_name: "IMPALA",
                block_id: "F11"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62502204650645,
                            -21.03743434032062
                        ],
                        [
                            31.62516969281573,
                            -21.03752004458378
                        ],
                        [
                            31.62563698489937,
                            -21.03657912521371
                        ],
                        [
                            31.62548590936247,
                            -21.03651630227276
                        ],
                        [
                            31.62502204650645,
                            -21.03743434032062
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F4",
                section_name: "IMPALA",
                block_id: "F4"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62386798248102,
                            -21.03691690693563
                        ],
                        [
                            31.62403643666285,
                            -21.0370018118249
                        ],
                        [
                            31.62451879228191,
                            -21.03611708632729
                        ],
                        [
                            31.62436904767058,
                            -21.0360495340624
                        ],
                        [
                            31.62386798248102,
                            -21.03691690693563
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "Impala F5-6",
                section_name: "IMPALA",
                block_id: "F5-6"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.62403540129204,
                            -21.03700294389525
                        ],
                        [
                            31.62437907493713,
                            -21.03715569944755
                        ],
                        [
                            31.62485034592999,
                            -21.03623400796358
                        ],
                        [
                            31.62451732394051,
                            -21.03612022873203
                        ],
                        [
                            31.62403540129204,
                            -21.03700294389525
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "CP trial A",
                section_name: "CP",
                block_id: "TRIAL A"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61873230952992,
                            -21.03403538456761
                        ],
                        [
                            31.61907277002955,
                            -21.03404229434796
                        ],
                        [
                            31.61939583381433,
                            -21.03411499821476
                        ],
                        [
                            31.61973954554943,
                            -21.03430836391031
                        ],
                        [
                            31.61999905301948,
                            -21.03454393655691
                        ],
                        [
                            31.62021416873702,
                            -21.03480195679978
                        ],
                        [
                            31.62034499848761,
                            -21.03515279890908
                        ],
                        [
                            31.62035494407946,
                            -21.03570038084493
                        ],
                        [
                            31.62036961134596,
                            -21.03576896211884
                        ],
                        [
                            31.62064647325628,
                            -21.03527394809942
                        ],
                        [
                            31.6207627712272,
                            -21.03500231586585
                        ],
                        [
                            31.62082972693268,
                            -21.03474598322973
                        ],
                        [
                            31.6208748815426,
                            -21.03453900432347
                        ],
                        [
                            31.62081176145669,
                            -21.03439161421288
                        ],
                        [
                            31.62062461022829,
                            -21.03426198027729
                        ],
                        [
                            31.61996907909244,
                            -21.03398103912835
                        ],
                        [
                            31.6195440767059,
                            -21.0338586680476
                        ],
                        [
                            31.6191154833655,
                            -21.03381072508662
                        ],
                        [
                            31.61902839300264,
                            -21.03382402676677
                        ],
                        [
                            31.61873230952992,
                            -21.03403538456761
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "CP trial B",
                section_name: "CP",
                block_id: "TRIAL B"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61901501954571,
                            -21.03535247885003
                        ],
                        [
                            31.61978013365674,
                            -21.03644664647051
                        ],
                        [
                            31.61997120993975,
                            -21.03631244559616
                        ],
                        [
                            31.62018224205728,
                            -21.03610702148603
                        ],
                        [
                            31.62031042418561,
                            -21.03583640500266
                        ],
                        [
                            31.62034945529905,
                            -21.03557204101159
                        ],
                        [
                            31.62032693770217,
                            -21.03510714989193
                        ],
                        [
                            31.62017407403878,
                            -21.03475298473103
                        ],
                        [
                            31.62008474963277,
                            -21.03463102427824
                        ],
                        [
                            31.61901501954571,
                            -21.03535247885003
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "CP trial C",
                section_name: "CP",
                block_id: "TRIAL C"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61887954816704,
                            -21.03521147991195
                        ],
                        [
                            31.61901866856506,
                            -21.03535405652553
                        ],
                        [
                            31.62008605210563,
                            -21.03463570822873
                        ],
                        [
                            31.61995166271916,
                            -21.03452055652762
                        ],
                        [
                            31.61887954816704,
                            -21.03521147991195
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "CP trial D",
                section_name: "CP",
                block_id: "TRIAL D"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61853473493691,
                            -21.03478565776743
                        ],
                        [
                            31.61887444609304,
                            -21.03521270524577
                        ],
                        [
                            31.61996124882197,
                            -21.0345104757134
                        ],
                        [
                            31.61944987949756,
                            -21.03411688025118
                        ],
                        [
                            31.61853473493691,
                            -21.03478565776743
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "CP trial E",
                section_name: "CP",
                block_id: "TRIAL E"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61826710663781,
                            -21.03438885109216
                        ],
                        [
                            31.61853110524155,
                            -21.03477923730241
                        ],
                        [
                            31.61944604802772,
                            -21.03411360898402
                        ],
                        [
                            31.61873059768554,
                            -21.03403349515876
                        ],
                        [
                            31.61826710663781,
                            -21.03438885109216
                        ]
                    ]
                ]
            }
        },
        {
            type: "Feature",
            properties: {
                field_name: "CP trial F",
                section_name: "CP",
                block_id: "TRIAL F"
            },
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            31.61804443989249,
                            -21.03629703318842
                        ],
                        [
                            31.61830708326941,
                            -21.03657979343149
                        ],
                        [
                            31.61868179032312,
                            -21.03670871404994
                        ],
                        [
                            31.6191617113246,
                            -21.03670259835171
                        ],
                        [
                            31.61964225959396,
                            -21.03657525705023
                        ],
                        [
                            31.61976762763251,
                            -21.03647152336701
                        ],
                        [
                            31.61822195936377,
                            -21.03446924596754
                        ],
                        [
                            31.61755988345479,
                            -21.03513128319681
                        ],
                        [
                            31.61755331228319,
                            -21.03544983284946
                        ],
                        [
                            31.61761805121163,
                            -21.03575674439054
                        ],
                        [
                            31.61772293029354,
                            -21.0359776184805
                        ],
                        [
                            31.61787338583175,
                            -21.03616233070366
                        ],
                        [
                            31.61804443989249,
                            -21.03629703318842
                        ]
                    ]
                ]
            }
        }
    ]
}

function firstRing(geometry: FieldGeometry): number[][] {
    if (geometry.type === 'Polygon') return geometry.coordinates[0] ?? []
    return geometry.coordinates[0]?.[0] ?? []
}

function centroidFromGeometry(geometry: FieldGeometry): { latitude: number; longitude: number } {
    const ring = firstRing(geometry)
    if (ring.length === 0) {
        return { latitude: 0, longitude: 0 }
    }

    const totals = ring.reduce(
        (acc, [lng, lat]) => {
            acc.lng += lng
            acc.lat += lat
            return acc
        },
        { lng: 0, lat: 0 }
    )

    return {
        latitude: totals.lat / ring.length,
        longitude: totals.lng / ring.length,
    }
}

export const HARDCODED_FIELDS: HardcodedFieldRecord[] = HARDCODED_FIELD_SHAPEFILE.features.map((feature) => {
    const center = centroidFromGeometry(feature.geometry)
    return {
        field_name: feature.properties.field_name,
        section_name: feature.properties.section_name,
        block_id: feature.properties.block_id,
        latitude: center.latitude,
        longitude: center.longitude,
        crop_type: feature.properties.crop_type,
        latest_stress: feature.properties.latest_stress,
        latest_moisture: feature.properties.latest_moisture,
        observation_count: feature.properties.observation_count ?? 0,
        is_sprayed: feature.properties.is_sprayed,
        last_spray_date: feature.properties.last_spray_date,
        latest_observation_date: feature.properties.latest_observation_date,
        updated_at: feature.properties.updated_at,
    }
})
