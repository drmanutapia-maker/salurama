-- HEMA Módulo: Seed CIE-10 – catálogo hematología oncológica (~180 códigos)
-- Afecta schema: hema
-- Reversión: DELETE FROM hema.diagnoses;

INSERT INTO hema.diagnoses (code, description_es, description_en, category) VALUES

-- ══════════════════════════════════════════
-- MIELOMA / PLASMOCITARIO / AMILOIDOSIS
-- ══════════════════════════════════════════
('C90.0',  'Mieloma múltiple',                                        'Multiple myeloma',                         'mieloma'),
('C90.1',  'Leucemia de células plasmáticas',                         'Plasma cell leukemia',                     'mieloma'),
('C90.2',  'Plasmacitoma extramedular',                               'Extramedullary plasmacytoma',              'mieloma'),
('C90.3',  'Plasmacitoma solitario',                                  'Solitary plasmacytoma',                    'mieloma'),
('C88.0',  'Macroglobulinemia de Waldenström',                        'Waldenström macroglobulinemia',            'mieloma'),
('C88.2',  'Enfermedad de cadenas pesadas alfa',                      'Heavy chain disease, alpha',               'mieloma'),
('C88.3',  'Enfermedad de cadenas pesadas gamma',                     'Heavy chain disease, gamma',               'mieloma'),
('C88.4',  'Enfermedad maligna inmunoproliferativa del intestino delgado', 'Immunoproliferative small intestinal disease', 'mieloma'),
('C88.8',  'Otras enfermedades malignas inmunoproliferativas',        'Other malignant immunoproliferative diseases', 'mieloma'),
('C88.9',  'Enfermedad maligna inmunoproliferativa no especificada',  'Malignant immunoproliferative disease, unspecified', 'mieloma'),
('D47.2',  'Gammapatía monoclonal de significado incierto (GMSI)',    'Monoclonal gammopathy of undetermined significance (MGUS)', 'mieloma'),
('E85.0',  'Amiloidosis hereditaria familiar',                        'Hereditary familial amyloidosis',          'mieloma'),
('E85.1',  'Amiloidosis sistémica neuropática',                       'Neuropathic heredofamilial amyloidosis',   'mieloma'),
('E85.2',  'Amiloidosis hereditaria familiar no especificada',        'Heredofamilial amyloidosis, unspecified',  'mieloma'),
('E85.3',  'Amiloidosis sistémica secundaria',                        'Secondary systemic amyloidosis',           'mieloma'),
('E85.4',  'Amiloidosis limitada a órgano',                           'Organ-limited amyloidosis',                'mieloma'),
('E85.8',  'Otras amiloidosis',                                       'Other amyloidosis',                        'mieloma'),
('E85.9',  'Amiloidosis no especificada',                             'Amyloidosis, unspecified',                 'mieloma'),

-- ══════════════════════════════════════════
-- LINFOMA DE HODGKIN
-- ══════════════════════════════════════════
('C81.0',  'Linfoma de Hodgkin, predominio linfocítico nodular',      'Nodular lymphocyte predominant Hodgkin lymphoma', 'linfoma'),
('C81.1',  'Linfoma de Hodgkin, esclerosis nodular',                  'Nodular sclerosis classical Hodgkin lymphoma', 'linfoma'),
('C81.2',  'Linfoma de Hodgkin, celularidad mixta',                   'Mixed cellularity classical Hodgkin lymphoma', 'linfoma'),
('C81.3',  'Linfoma de Hodgkin, depleción linfocítica',               'Lymphocyte depleted classical Hodgkin lymphoma', 'linfoma'),
('C81.4',  'Linfoma de Hodgkin clásico rico en linfocitos',           'Lymphocyte-rich classical Hodgkin lymphoma', 'linfoma'),
('C81.7',  'Otro linfoma de Hodgkin',                                 'Other classical Hodgkin lymphoma',         'linfoma'),
('C81.9',  'Linfoma de Hodgkin no especificado',                      'Hodgkin lymphoma, unspecified',            'linfoma'),

-- ══════════════════════════════════════════
-- LINFOMA FOLICULAR
-- ══════════════════════════════════════════
('C82.0',  'Linfoma folicular grado I',                               'Follicular lymphoma grade I',              'linfoma'),
('C82.1',  'Linfoma folicular grado II',                              'Follicular lymphoma grade II',             'linfoma'),
('C82.2',  'Linfoma folicular grado III',                             'Follicular lymphoma grade III',            'linfoma'),
('C82.3',  'Linfoma folicular grado IIIa',                            'Follicular lymphoma grade IIIa',           'linfoma'),
('C82.4',  'Linfoma folicular grado IIIb',                            'Follicular lymphoma grade IIIb',           'linfoma'),
('C82.5',  'Linfoma folicular difuso',                                'Diffuse follicle center lymphoma',         'linfoma'),
('C82.6',  'Linfoma del centro folicular cutáneo',                    'Cutaneous follicle center lymphoma',       'linfoma'),
('C82.8',  'Otros tipos de linfoma folicular',                        'Other types of follicular lymphoma',       'linfoma'),
('C82.9',  'Linfoma folicular no especificado',                       'Follicular lymphoma, unspecified',         'linfoma'),

-- ══════════════════════════════════════════
-- LINFOMA NO HODGKIN B NO FOLICULAR
-- ══════════════════════════════════════════
('C83.0',  'Linfoma B de células pequeñas (LLC/SLL)',                 'Small B-cell lymphoma',                    'linfoma'),
('C83.1',  'Linfoma de células del manto',                            'Mantle cell lymphoma',                     'linfoma'),
('C83.3',  'Linfoma difuso de células B grandes (LDCBG)',             'Diffuse large B-cell lymphoma (DLBCL)',    'linfoma'),
('C83.5',  'Linfoma linfoblástico de precursores B',                  'Lymphoblastic (diffuse) lymphoma',         'linfoma'),
('C83.7',  'Linfoma de Burkitt',                                      'Burkitt lymphoma',                         'linfoma'),
('C83.8',  'Otros linfomas B no foliculares',                         'Other non-follicular lymphoma',            'linfoma'),
('C83.9',  'Linfoma B no folicular no especificado',                  'Non-follicular lymphoma, unspecified',     'linfoma'),

-- ══════════════════════════════════════════
-- LINFOMA T / NK MADURO
-- ══════════════════════════════════════════
('C84.0',  'Micosis fungoide',                                        'Mycosis fungoides',                        'linfoma'),
('C84.1',  'Síndrome de Sézary',                                      'Sézary disease',                           'linfoma'),
('C84.4',  'Linfoma T periférico no especificado',                    'Peripheral T-cell lymphoma, not classified', 'linfoma'),
('C84.5',  'Otros linfomas T periféricos y NK',                       'Other mature T/NK-cell lymphomas',         'linfoma'),
('C84.6',  'Linfoma anaplásico de células grandes ALK negativo',      'Anaplastic large cell lymphoma, ALK-negative', 'linfoma'),
('C84.7',  'Linfoma anaplásico de células grandes primario cutáneo',  'Primary cutaneous CD30+ T-cell lymphoproliferative disorder', 'linfoma'),
('C84.8',  'Otros linfomas T maduros y NK especificados',             'Other mature T/NK-cell lymphomas, specified', 'linfoma'),
('C84.9',  'Linfoma T maduro / NK no especificado',                   'Mature T/NK-cell lymphomas, unspecified',  'linfoma'),

-- ══════════════════════════════════════════
-- LINFOMA NO HODGKIN OTROS / MEDIASTINAL / SNC
-- ══════════════════════════════════════════
('C85.1',  'Linfoma B no especificado',                               'Unspecified B-cell lymphoma',              'linfoma'),
('C85.2',  'Linfoma B de células grandes mediastinal primario (tímico)', 'Mediastinal (thymic) large B-cell lymphoma', 'linfoma'),
('C85.7',  'Linfoma primario del sistema nervioso central (LSNC)',    'Primary central nervous system lymphoma',  'linfoma'),
('C85.8',  'Otros tipos especificados de linfoma no Hodgkin',         'Other specified types of non-Hodgkin lymphoma', 'linfoma'),
('C85.9',  'Linfoma no Hodgkin no especificado',                      'Non-Hodgkin lymphoma, unspecified',        'linfoma'),

-- ══════════════════════════════════════════
-- LINFOMA T EXTRANODAL / NK
-- ══════════════════════════════════════════
('C86.0',  'Linfoma extranodal NK/T células tipo nasal',              'Extranodal NK/T-cell lymphoma, nasal type', 'linfoma'),
('C86.1',  'Linfoma hepatoesplénico de células T',                    'Hepatosplenic T-cell lymphoma',            'linfoma'),
('C86.2',  'Linfoma T subcutáneo parecido a paniculitis',             'Subcutaneous panniculitis-like T-cell lymphoma', 'linfoma'),
('C86.3',  'Reticulosis pagetoide',                                   'Reticulosis pagetoid',                     'linfoma'),
('C86.4',  'Linfoma blástico de células NK',                          'Blastic NK-cell lymphoma',                 'linfoma'),
('C86.5',  'Linfoma angioinmunoblástico de células T',                'Angioimmunoblastic T-cell lymphoma',       'linfoma'),
('C86.6',  'Linfoma anaplásico de células grandes ALK positivo',      'Primary cutaneous anaplastic large cell lymphoma, ALK-positive', 'linfoma'),
('C71.9',  'Neoplasia maligna del encéfalo no especificada (LSNC)',   'Malignant neoplasm of brain, unspecified (primary CNS lymphoma)', 'linfoma'),

-- ══════════════════════════════════════════
-- LEUCEMIA LINFOCÍTICA
-- ══════════════════════════════════════════
('C91.0',  'Leucemia linfoblástica aguda (LLA)',                      'Acute lymphoblastic leukemia (ALL)',        'leucemia'),
('C91.1',  'Leucemia linfocítica crónica de células B (LLC)',         'Chronic lymphocytic leukemia of B-cell type (CLL)', 'leucemia'),
('C91.3',  'Leucemia prolinfocítica de células B',                    'Prolymphocytic leukemia of B-cell type',   'leucemia'),
('C91.4',  'Tricoleucemia (leucemia de células peludas)',              'Hairy cell leukemia',                      'leucemia'),
('C91.5',  'Leucemia/linfoma de células T del adulto (HTLV-1)',       'Adult T-cell lymphoma/leukemia (HTLV-1 associated)', 'leucemia'),
('C91.6',  'Leucemia prolinfocítica de células T',                    'Prolymphocytic leukemia of T-cell type',   'leucemia'),
('C91.7',  'Otras leucemias linfocíticas',                            'Other lymphoid leukemia',                  'leucemia'),
('C91.9',  'Leucemia linfocítica no especificada',                    'Lymphoid leukemia, unspecified',           'leucemia'),

-- ══════════════════════════════════════════
-- LEUCEMIA MIELOIDE
-- ══════════════════════════════════════════
('C92.0',  'Leucemia mieloblástica aguda (LMA)',                      'Acute myeloblastic leukemia (AML)',         'leucemia'),
('C92.1',  'Leucemia mieloide crónica (LMC, BCR-ABL1 positiva)',      'Chronic myeloid leukemia, BCR-ABL1-positive (CML)', 'leucemia'),
('C92.2',  'Leucemia mieloide crónica atípica, BCR-ABL1 negativa',    'Atypical chronic myeloid leukemia, BCR-ABL1-negative', 'leucemia'),
('C92.3',  'Sarcoma mieloide',                                        'Myeloid sarcoma',                          'leucemia'),
('C92.4',  'Leucemia promielocítica aguda (LPA, PML-RARA)',           'Acute promyelocytic leukemia (APL, PML-RARA)', 'leucemia'),
('C92.5',  'Leucemia mielomonocítica aguda',                          'Acute myelomonocytic leukemia',            'leucemia'),
('C92.6',  'LMA con anomalía del cromosoma 11q23 (reordenamiento KMT2A)', 'Acute myeloid leukemia with 11q23-abnormality', 'leucemia'),
('C92.7',  'Otras leucemias mieloides',                               'Other myeloid leukemia',                   'leucemia'),
('C92.8',  'LMA con displasia multilinaje',                           'Acute myeloid leukemia with multilineage dysplasia', 'leucemia'),
('C92.9',  'LMA no especificada',                                     'Myeloid leukemia, unspecified',            'leucemia'),

-- ══════════════════════════════════════════
-- LEUCEMIA MONOCÍTICA Y OTRAS
-- ══════════════════════════════════════════
('C93.0',  'Leucemia monocítica aguda (LMoA)',                        'Acute monoblastic/monocytic leukemia',     'leucemia'),
('C93.1',  'Leucemia mielomonocítica crónica (LMMC / CMML)',          'Chronic myelomonocytic leukemia (CMML)',   'leucemia'),
('C93.3',  'Leucemia de células dendríticas plasmocitoides blásticas','Blastic plasmacytoid dendritic cell neoplasm', 'leucemia'),
('C93.7',  'Otras leucemias monocíticas',                             'Other monocytic leukemia',                 'leucemia'),
('C93.9',  'Leucemia monocítica no especificada',                     'Monocytic leukemia, unspecified',          'leucemia'),
('C94.0',  'Eritroleucemia aguda',                                    'Acute erythroleukemia',                    'leucemia'),
('C94.2',  'Leucemia megacarioblástica aguda',                        'Acute megakaryoblastic leukemia',          'leucemia'),
('C94.3',  'Leucemia de mastocitos',                                  'Mast cell leukemia',                       'leucemia'),
('C94.4',  'Panmielosis aguda con mielofibrosis',                     'Acute panmyelosis with myelofibrosis',     'leucemia'),
('C94.5',  'Mielofibrosis aguda',                                     'Acute myelofibrosis',                      'leucemia'),
('C95.0',  'Leucemia aguda, tipo celular no especificado',            'Acute leukemia of unspecified cell type',  'leucemia'),
('C95.1',  'Leucemia crónica, tipo celular no especificado',          'Chronic leukemia of unspecified cell type', 'leucemia'),
('C95.9',  'Leucemia no especificada',                                'Leukemia, unspecified',                    'leucemia'),

-- ══════════════════════════════════════════
-- SÍNDROME MIELODISPLÁSICO (SMD / MDS)
-- ══════════════════════════════════════════
('D46.0',  'Anemia refractaria sin sideroblastos en anillo',          'Refractory anemia without ring sideroblasts', 'mds'),
('D46.1',  'Anemia refractaria con sideroblastos en anillo',          'Refractory anemia with ring sideroblasts', 'mds'),
('D46.2',  'Anemia refractaria con exceso de blastos (AREB / RAEB)',  'Refractory anemia with excess of blasts (RAEB)', 'mds'),
('D46.4',  'Anemia refractaria no especificada',                      'Refractory anemia, unspecified',           'mds'),
('D46.7',  'Otros síndromes mielodisplásicos',                        'Other myelodysplastic syndromes',          'mds'),
('D46.9',  'Síndrome mielodisplásico no especificado',                'Myelodysplastic syndrome, unspecified',    'mds'),
('D46.A',  'SMD con deleción 5q aislada [del(5q)]',                   'Myelodysplastic syndrome with isolated del(5q)', 'mds'),
('D46.B',  'SMD con displasia multilinaje',                           'Myelodysplastic syndrome with multilineage dysplasia', 'mds'),
('D46.C',  'SMD con exceso de blastos-1 (MDS-EB1)',                   'Myelodysplastic syndrome with excess blasts-1', 'mds'),
('D46.Z',  'SMD, otros especificados',                                'Other myelodysplastic syndromes, specified', 'mds'),

-- ══════════════════════════════════════════
-- NEOPLASIAS MIELOPROLIFERATIVAS (NMP / MPN)
-- ══════════════════════════════════════════
('D45',    'Policitemia vera',                                         'Polycythemia vera',                        'mpn'),
('D47.0',  'Histiocitosis y mastocitosis de comportamiento incierto', 'Histiocytic and mast cell tumors of uncertain behavior', 'mpn'),
('D47.1',  'Enfermedad mieloproliferativa crónica no clasificada',    'Chronic myeloproliferative disease',       'mpn'),
('D47.3',  'Trombocitemia esencial',                                  'Essential thrombocythemia (ET)',            'mpn'),
('D47.4',  'Osteomielofibrosis / Mielofibrosis primaria',             'Osteomyelofibrosis / Primary myelofibrosis (PMF)', 'mpn'),
('D47.5',  'Mastocitosis sistémica crónica',                          'Chronic eosinophilic leukemia / Systemic mastocytosis', 'mpn'),
('D47.7',  'Otras neoplasias hematológicas de comportamiento incierto','Other specified neoplasms of uncertain behavior of lymphoid, hematopoietic and related tissue', 'mpn'),
('D47.9',  'Neoplasia de comportamiento incierto no especificada',    'Neoplasm of uncertain behavior of lymphoid, hematopoietic and related tissue, unspecified', 'mpn'),

-- ══════════════════════════════════════════
-- OTRAS NEOPLASIAS HEMATOLÓGICAS
-- ══════════════════════════════════════════
('C96.0',  'Histiocitosis de células de Langerhans multifocal y multisistémica', 'Multifocal and multisystemic (disseminated) Langerhans-cell histiocytosis', 'otro'),
('C96.2',  'Tumor maligno de mastocitos',                             'Malignant mast cell tumor',                'otro'),
('C96.3',  'Linfoma histiocítico verdadero',                          'Histiocytic sarcoma',                      'otro'),
('C96.4',  'Sarcoma de células dendríticas',                          'Sarcoma of dendritic cells (accessory cells)', 'otro'),
('C96.5',  'Neoplasia de células dendríticas plasmocitoides blásticas','Malignant histiocytosis',                 'otro'),
('C96.9',  'Neoplasia maligna hematológica y de tejido linfoide no especificada', 'Malignant neoplasm of lymphoid, hematopoietic and related tissue, unspecified', 'otro'),

-- ══════════════════════════════════════════
-- ANEMIA APLÁSICA
-- ══════════════════════════════════════════
('D61.0',  'Anemia aplásica constitucional',                          'Constitutional aplastic anemia',           'otro'),
('D61.1',  'Anemia aplásica inducida por fármacos',                   'Drug-induced aplastic anemia',             'otro'),
('D61.2',  'Anemia aplásica por otros agentes externos',              'Aplastic anemia due to other external agents', 'otro'),
('D61.3',  'Anemia aplásica idiopática',                              'Idiopathic aplastic anemia',               'otro'),
('D61.8',  'Otras anemias aplásicas especificadas',                   'Other specified aplastic anemias',         'otro'),
('D61.9',  'Anemia aplásica no especificada',                         'Aplastic anemia, unspecified',             'otro'),

-- ══════════════════════════════════════════
-- LINFOHISTIOCITOSIS / HISTIOCITOSIS
-- ══════════════════════════════════════════
('D76.1',  'Linfohistiocitosis hemofagocítica (LHH / HLH)',           'Hemophagocytic lymphohistiocytosis (HLH)', 'otro'),
('D76.2',  'Síndrome hemofagocítico asociado a infección',            'Hemophagocytic syndrome, infection-associated', 'otro'),
('D76.3',  'Otros síndromes histiocíticos',                           'Other histiocytic syndromes',              'otro'),

-- ══════════════════════════════════════════
-- GAMMAPATÍAS / INMUNODEFICIENCIAS
-- ══════════════════════════════════════════
('D80.1',  'Hipogammaglobulinemia no familiar',                       'Nonfamilial hypogammaglobulinemia',        'otro'),
('D80.6',  'Deficiencia de anticuerpos con inmunoglobulinas casi normales', 'Antibody deficiency with near-normal immunoglobulins', 'otro'),
('D89.0',  'Hipergammaglobulinemia policlonal',                       'Polyclonal hypergammaglobulinaemia',       'otro'),
('D89.1',  'Crioglobulinemia',                                        'Cryoglobulinaemia',                        'otro'),
('D89.2',  'Hipergammaglobulinemia no especificada',                  'Hypergammaglobulinaemia, unspecified',     'otro'),

-- ══════════════════════════════════════════
-- ANTECEDENTES / SEGUIMIENTO / TRASPLANTE
-- ══════════════════════════════════════════
('Z85.71', 'Antecedente personal de linfoma de Hodgkin',              'Personal history of Hodgkin lymphoma',     'otro'),
('Z85.72', 'Antecedente personal de linfoma no Hodgkin',              'Personal history of non-Hodgkin lymphomas', 'otro'),
('Z85.79', 'Antecedente personal de otras neoplasias malignas hematológicas', 'Personal history of other malignant neoplasms of lymphoid, hematopoietic and related tissues', 'otro'),
('Z94.81', 'Trasplante de médula ósea / células madre hematopoyéticas', 'Bone marrow transplant status',          'otro'),
('T86.00', 'Complicación de trasplante de médula ósea no especificada', 'Unspecified complication of bone marrow transplant', 'otro'),
('T86.09', 'Otras complicaciones de trasplante de médula ósea',       'Other complications of bone marrow transplant', 'otro'),

-- ══════════════════════════════════════════
-- COMPLICACIONES CLÍNICAS FRECUENTES EN ONCOHEMATOLOGÍA
-- ══════════════════════════════════════════
('D70.0',  'Agranulocitosis congénita',                               'Congenital agranulocytosis',               'otro'),
('D70.1',  'Agranulocitosis secundaria a quimioterapia',              'Agranulocytosis secondary to cancer chemotherapy', 'otro'),
('D70.2',  'Otras agranulocitosis por fármacos',                      'Other drug-induced agranulocytosis',       'otro'),
('D70.3',  'Neutropenia por otras causas',                            'Neutropenia due to infection',             'otro'),
('D70.8',  'Otras neutropenias',                                      'Other neutropenia',                        'otro'),
('D70.9',  'Neutropenia no especificada',                             'Neutropenia, unspecified',                 'otro'),
('D72.810','Linfocitosis',                                            'Lymphocytosis',                            'otro'),
('D72.820','Linfocitopenia',                                          'Lymphocytopenia',                          'otro'),
('D75.81', 'Mielofibrosis',                                           'Myelofibrosis',                            'otro'),
('D75.89', 'Otras enfermedades de la sangre especificadas',           'Other specified diseases of blood and blood-forming organs', 'otro')

ON CONFLICT (code) DO NOTHING;
