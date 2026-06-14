import type { Diagnosis, DiagnosisCategory } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo CIE-10 oncohematológico
// Fuente: migraciones 20260611000015 (154 códigos) + 20260611000016 (7 hierro)
// ─────────────────────────────────────────────────────────────────────────────

export const CIE10_CATALOG: Diagnosis[] = [
  // ── MIELOMA / PLASMOCITARIO / AMILOIDOSIS ─────────────────────────────────
  { code: 'C90.0', description_es: 'Mieloma múltiple', description_en: 'Multiple myeloma', category: 'mieloma' },
  { code: 'C90.1', description_es: 'Leucemia de células plasmáticas', description_en: 'Plasma cell leukemia', category: 'mieloma' },
  { code: 'C90.2', description_es: 'Plasmacitoma extramedular', description_en: 'Extramedullary plasmacytoma', category: 'mieloma' },
  { code: 'C90.3', description_es: 'Plasmacitoma solitario', description_en: 'Solitary plasmacytoma', category: 'mieloma' },
  { code: 'C88.0', description_es: 'Macroglobulinemia de Waldenström', description_en: 'Waldenström macroglobulinemia', category: 'mieloma' },
  { code: 'C88.2', description_es: 'Enfermedad de cadenas pesadas alfa', description_en: 'Heavy chain disease, alpha', category: 'mieloma' },
  { code: 'C88.3', description_es: 'Enfermedad de cadenas pesadas gamma', description_en: 'Heavy chain disease, gamma', category: 'mieloma' },
  { code: 'C88.4', description_es: 'Enfermedad maligna inmunoproliferativa del intestino delgado', description_en: 'Immunoproliferative small intestinal disease', category: 'mieloma' },
  { code: 'C88.8', description_es: 'Otras enfermedades malignas inmunoproliferativas', description_en: 'Other malignant immunoproliferative diseases', category: 'mieloma' },
  { code: 'C88.9', description_es: 'Enfermedad maligna inmunoproliferativa no especificada', description_en: 'Malignant immunoproliferative disease, unspecified', category: 'mieloma' },
  { code: 'D47.2', description_es: 'Gammapatía monoclonal de significado incierto (GMSI)', description_en: 'Monoclonal gammopathy of undetermined significance (MGUS)', category: 'mieloma' },
  { code: 'E85.0', description_es: 'Amiloidosis hereditaria familiar', description_en: 'Hereditary familial amyloidosis', category: 'mieloma' },
  { code: 'E85.1', description_es: 'Amiloidosis sistémica neuropática', description_en: 'Neuropathic heredofamilial amyloidosis', category: 'mieloma' },
  { code: 'E85.2', description_es: 'Amiloidosis hereditaria familiar no especificada', description_en: 'Heredofamilial amyloidosis, unspecified', category: 'mieloma' },
  { code: 'E85.3', description_es: 'Amiloidosis sistémica secundaria', description_en: 'Secondary systemic amyloidosis', category: 'mieloma' },
  { code: 'E85.4', description_es: 'Amiloidosis limitada a órgano', description_en: 'Organ-limited amyloidosis', category: 'mieloma' },
  { code: 'E85.8', description_es: 'Otras amiloidosis', description_en: 'Other amyloidosis', category: 'mieloma' },
  { code: 'E85.9', description_es: 'Amiloidosis no especificada', description_en: 'Amyloidosis, unspecified', category: 'mieloma' },

  // ── LINFOMA DE HODGKIN ────────────────────────────────────────────────────
  { code: 'C81.0', description_es: 'Linfoma de Hodgkin, predominio linfocítico nodular', description_en: 'Nodular lymphocyte predominant Hodgkin lymphoma', category: 'linfoma' },
  { code: 'C81.1', description_es: 'Linfoma de Hodgkin, esclerosis nodular', description_en: 'Nodular sclerosis classical Hodgkin lymphoma', category: 'linfoma' },
  { code: 'C81.2', description_es: 'Linfoma de Hodgkin, celularidad mixta', description_en: 'Mixed cellularity classical Hodgkin lymphoma', category: 'linfoma' },
  { code: 'C81.3', description_es: 'Linfoma de Hodgkin, depleción linfocítica', description_en: 'Lymphocyte depleted classical Hodgkin lymphoma', category: 'linfoma' },
  { code: 'C81.4', description_es: 'Linfoma de Hodgkin clásico rico en linfocitos', description_en: 'Lymphocyte-rich classical Hodgkin lymphoma', category: 'linfoma' },
  { code: 'C81.7', description_es: 'Otro linfoma de Hodgkin', description_en: 'Other classical Hodgkin lymphoma', category: 'linfoma' },
  { code: 'C81.9', description_es: 'Linfoma de Hodgkin no especificado', description_en: 'Hodgkin lymphoma, unspecified', category: 'linfoma' },

  // ── LINFOMA FOLICULAR ─────────────────────────────────────────────────────
  { code: 'C82.0', description_es: 'Linfoma folicular grado I', description_en: 'Follicular lymphoma grade I', category: 'linfoma' },
  { code: 'C82.1', description_es: 'Linfoma folicular grado II', description_en: 'Follicular lymphoma grade II', category: 'linfoma' },
  { code: 'C82.2', description_es: 'Linfoma folicular grado III', description_en: 'Follicular lymphoma grade III', category: 'linfoma' },
  { code: 'C82.3', description_es: 'Linfoma folicular grado IIIa', description_en: 'Follicular lymphoma grade IIIa', category: 'linfoma' },
  { code: 'C82.4', description_es: 'Linfoma folicular grado IIIb', description_en: 'Follicular lymphoma grade IIIb', category: 'linfoma' },
  { code: 'C82.5', description_es: 'Linfoma folicular difuso', description_en: 'Diffuse follicle center lymphoma', category: 'linfoma' },
  { code: 'C82.6', description_es: 'Linfoma del centro folicular cutáneo', description_en: 'Cutaneous follicle center lymphoma', category: 'linfoma' },
  { code: 'C82.8', description_es: 'Otros tipos de linfoma folicular', description_en: 'Other types of follicular lymphoma', category: 'linfoma' },
  { code: 'C82.9', description_es: 'Linfoma folicular no especificado', description_en: 'Follicular lymphoma, unspecified', category: 'linfoma' },

  // ── LINFOMA NO HODGKIN B NO FOLICULAR ────────────────────────────────────
  { code: 'C83.0', description_es: 'Linfoma B de células pequeñas (LLC/SLL)', description_en: 'Small B-cell lymphoma', category: 'linfoma' },
  { code: 'C83.1', description_es: 'Linfoma de células del manto', description_en: 'Mantle cell lymphoma', category: 'linfoma' },
  { code: 'C83.3', description_es: 'Linfoma difuso de células B grandes (LDCBG)', description_en: 'Diffuse large B-cell lymphoma (DLBCL)', category: 'linfoma' },
  { code: 'C83.5', description_es: 'Linfoma linfoblástico de precursores B', description_en: 'Lymphoblastic (diffuse) lymphoma', category: 'linfoma' },
  { code: 'C83.7', description_es: 'Linfoma de Burkitt', description_en: 'Burkitt lymphoma', category: 'linfoma' },
  { code: 'C83.8', description_es: 'Otros linfomas B no foliculares', description_en: 'Other non-follicular lymphoma', category: 'linfoma' },
  { code: 'C83.9', description_es: 'Linfoma B no folicular no especificado', description_en: 'Non-follicular lymphoma, unspecified', category: 'linfoma' },

  // ── LINFOMA T / NK MADURO ─────────────────────────────────────────────────
  { code: 'C84.0', description_es: 'Micosis fungoide', description_en: 'Mycosis fungoides', category: 'linfoma' },
  { code: 'C84.1', description_es: 'Síndrome de Sézary', description_en: 'Sézary disease', category: 'linfoma' },
  { code: 'C84.4', description_es: 'Linfoma T periférico no especificado', description_en: 'Peripheral T-cell lymphoma, not classified', category: 'linfoma' },
  { code: 'C84.5', description_es: 'Otros linfomas T periféricos y NK', description_en: 'Other mature T/NK-cell lymphomas', category: 'linfoma' },
  { code: 'C84.6', description_es: 'Linfoma anaplásico de células grandes ALK negativo', description_en: 'Anaplastic large cell lymphoma, ALK-negative', category: 'linfoma' },
  { code: 'C84.7', description_es: 'Linfoma anaplásico de células grandes primario cutáneo', description_en: 'Primary cutaneous CD30+ T-cell lymphoproliferative disorder', category: 'linfoma' },
  { code: 'C84.8', description_es: 'Otros linfomas T maduros y NK especificados', description_en: 'Other mature T/NK-cell lymphomas, specified', category: 'linfoma' },
  { code: 'C84.9', description_es: 'Linfoma T maduro / NK no especificado', description_en: 'Mature T/NK-cell lymphomas, unspecified', category: 'linfoma' },

  // ── LINFOMA NO HODGKIN OTROS ──────────────────────────────────────────────
  { code: 'C85.1', description_es: 'Linfoma B no especificado', description_en: 'Unspecified B-cell lymphoma', category: 'linfoma' },
  { code: 'C85.2', description_es: 'Linfoma B de células grandes mediastinal primario (tímico)', description_en: 'Mediastinal (thymic) large B-cell lymphoma', category: 'linfoma' },
  { code: 'C85.7', description_es: 'Linfoma primario del sistema nervioso central (LSNC)', description_en: 'Primary central nervous system lymphoma', category: 'linfoma' },
  { code: 'C85.8', description_es: 'Otros tipos especificados de linfoma no Hodgkin', description_en: 'Other specified types of non-Hodgkin lymphoma', category: 'linfoma' },
  { code: 'C85.9', description_es: 'Linfoma no Hodgkin no especificado', description_en: 'Non-Hodgkin lymphoma, unspecified', category: 'linfoma' },

  // ── LINFOMA T EXTRANODAL / NK ─────────────────────────────────────────────
  { code: 'C86.0', description_es: 'Linfoma extranodal NK/T células tipo nasal', description_en: 'Extranodal NK/T-cell lymphoma, nasal type', category: 'linfoma' },
  { code: 'C86.1', description_es: 'Linfoma hepatoesplénico de células T', description_en: 'Hepatosplenic T-cell lymphoma', category: 'linfoma' },
  { code: 'C86.2', description_es: 'Linfoma T subcutáneo parecido a paniculitis', description_en: 'Subcutaneous panniculitis-like T-cell lymphoma', category: 'linfoma' },
  { code: 'C86.3', description_es: 'Reticulosis pagetoide', description_en: 'Reticulosis pagetoid', category: 'linfoma' },
  { code: 'C86.4', description_es: 'Linfoma blástico de células NK', description_en: 'Blastic NK-cell lymphoma', category: 'linfoma' },
  { code: 'C86.5', description_es: 'Linfoma angioinmunoblástico de células T', description_en: 'Angioimmunoblastic T-cell lymphoma', category: 'linfoma' },
  { code: 'C86.6', description_es: 'Linfoma anaplásico de células grandes ALK positivo', description_en: 'Primary cutaneous anaplastic large cell lymphoma, ALK-positive', category: 'linfoma' },
  { code: 'C71.9', description_es: 'Neoplasia maligna del encéfalo no especificada (LSNC)', description_en: 'Malignant neoplasm of brain, unspecified (primary CNS lymphoma)', category: 'linfoma' },

  // ── LEUCEMIA LINFOCÍTICA ──────────────────────────────────────────────────
  { code: 'C91.0', description_es: 'Leucemia linfoblástica aguda (LLA)', description_en: 'Acute lymphoblastic leukemia (ALL)', category: 'leucemia' },
  { code: 'C91.1', description_es: 'Leucemia linfocítica crónica de células B (LLC)', description_en: 'Chronic lymphocytic leukemia of B-cell type (CLL)', category: 'leucemia' },
  { code: 'C91.3', description_es: 'Leucemia prolinfocítica de células B', description_en: 'Prolymphocytic leukemia of B-cell type', category: 'leucemia' },
  { code: 'C91.4', description_es: 'Tricoleucemia (leucemia de células peludas)', description_en: 'Hairy cell leukemia', category: 'leucemia' },
  { code: 'C91.5', description_es: 'Leucemia/linfoma de células T del adulto (HTLV-1)', description_en: 'Adult T-cell lymphoma/leukemia (HTLV-1 associated)', category: 'leucemia' },
  { code: 'C91.6', description_es: 'Leucemia prolinfocítica de células T', description_en: 'Prolymphocytic leukemia of T-cell type', category: 'leucemia' },
  { code: 'C91.7', description_es: 'Otras leucemias linfocíticas', description_en: 'Other lymphoid leukemia', category: 'leucemia' },
  { code: 'C91.9', description_es: 'Leucemia linfocítica no especificada', description_en: 'Lymphoid leukemia, unspecified', category: 'leucemia' },

  // ── LEUCEMIA MIELOIDE ─────────────────────────────────────────────────────
  { code: 'C92.0', description_es: 'Leucemia mieloblástica aguda (LMA)', description_en: 'Acute myeloblastic leukemia (AML)', category: 'leucemia' },
  { code: 'C92.1', description_es: 'Leucemia mieloide crónica (LMC, BCR-ABL1 positiva)', description_en: 'Chronic myeloid leukemia, BCR-ABL1-positive (CML)', category: 'leucemia' },
  { code: 'C92.2', description_es: 'Leucemia mieloide crónica atípica, BCR-ABL1 negativa', description_en: 'Atypical chronic myeloid leukemia, BCR-ABL1-negative', category: 'leucemia' },
  { code: 'C92.3', description_es: 'Sarcoma mieloide', description_en: 'Myeloid sarcoma', category: 'leucemia' },
  { code: 'C92.4', description_es: 'Leucemia promielocítica aguda (LPA, PML-RARA)', description_en: 'Acute promyelocytic leukemia (APL, PML-RARA)', category: 'leucemia' },
  { code: 'C92.5', description_es: 'Leucemia mielomonocítica aguda', description_en: 'Acute myelomonocytic leukemia', category: 'leucemia' },
  { code: 'C92.6', description_es: 'LMA con anomalía del cromosoma 11q23 (reordenamiento KMT2A)', description_en: 'Acute myeloid leukemia with 11q23-abnormality', category: 'leucemia' },
  { code: 'C92.7', description_es: 'Otras leucemias mieloides', description_en: 'Other myeloid leukemia', category: 'leucemia' },
  { code: 'C92.8', description_es: 'LMA con displasia multilinaje', description_en: 'Acute myeloid leukemia with multilineage dysplasia', category: 'leucemia' },
  { code: 'C92.9', description_es: 'LMA no especificada', description_en: 'Myeloid leukemia, unspecified', category: 'leucemia' },

  // ── LEUCEMIA MONOCÍTICA Y OTRAS ───────────────────────────────────────────
  { code: 'C93.0', description_es: 'Leucemia monocítica aguda (LMoA)', description_en: 'Acute monoblastic/monocytic leukemia', category: 'leucemia' },
  { code: 'C93.1', description_es: 'Leucemia mielomonocítica crónica (LMMC / CMML)', description_en: 'Chronic myelomonocytic leukemia (CMML)', category: 'leucemia' },
  { code: 'C93.3', description_es: 'Leucemia de células dendríticas plasmocitoides blásticas', description_en: 'Blastic plasmacytoid dendritic cell neoplasm', category: 'leucemia' },
  { code: 'C93.7', description_es: 'Otras leucemias monocíticas', description_en: 'Other monocytic leukemia', category: 'leucemia' },
  { code: 'C93.9', description_es: 'Leucemia monocítica no especificada', description_en: 'Monocytic leukemia, unspecified', category: 'leucemia' },
  { code: 'C94.0', description_es: 'Eritroleucemia aguda', description_en: 'Acute erythroleukemia', category: 'leucemia' },
  { code: 'C94.2', description_es: 'Leucemia megacarioblástica aguda', description_en: 'Acute megakaryoblastic leukemia', category: 'leucemia' },
  { code: 'C94.3', description_es: 'Leucemia de mastocitos', description_en: 'Mast cell leukemia', category: 'leucemia' },
  { code: 'C94.4', description_es: 'Panmielosis aguda con mielofibrosis', description_en: 'Acute panmyelosis with myelofibrosis', category: 'leucemia' },
  { code: 'C94.5', description_es: 'Mielofibrosis aguda', description_en: 'Acute myelofibrosis', category: 'leucemia' },
  { code: 'C95.0', description_es: 'Leucemia aguda, tipo celular no especificado', description_en: 'Acute leukemia of unspecified cell type', category: 'leucemia' },
  { code: 'C95.1', description_es: 'Leucemia crónica, tipo celular no especificado', description_en: 'Chronic leukemia of unspecified cell type', category: 'leucemia' },
  { code: 'C95.9', description_es: 'Leucemia no especificada', description_en: 'Leukemia, unspecified', category: 'leucemia' },

  // ── SÍNDROME MIELODISPLÁSICO (SMD / MDS) ─────────────────────────────────
  { code: 'D46.0', description_es: 'Anemia refractaria sin sideroblastos en anillo', description_en: 'Refractory anemia without ring sideroblasts', category: 'mds' },
  { code: 'D46.1', description_es: 'Anemia refractaria con sideroblastos en anillo', description_en: 'Refractory anemia with ring sideroblasts', category: 'mds' },
  { code: 'D46.2', description_es: 'Anemia refractaria con exceso de blastos (AREB / RAEB)', description_en: 'Refractory anemia with excess of blasts (RAEB)', category: 'mds' },
  { code: 'D46.4', description_es: 'Anemia refractaria no especificada', description_en: 'Refractory anemia, unspecified', category: 'mds' },
  { code: 'D46.7', description_es: 'Otros síndromes mielodisplásicos', description_en: 'Other myelodysplastic syndromes', category: 'mds' },
  { code: 'D46.9', description_es: 'Síndrome mielodisplásico no especificado', description_en: 'Myelodysplastic syndrome, unspecified', category: 'mds' },
  { code: 'D46.A', description_es: 'SMD con deleción 5q aislada [del(5q)]', description_en: 'Myelodysplastic syndrome with isolated del(5q)', category: 'mds' },
  { code: 'D46.B', description_es: 'SMD con displasia multilinaje', description_en: 'Myelodysplastic syndrome with multilineage dysplasia', category: 'mds' },
  { code: 'D46.C', description_es: 'SMD con exceso de blastos-1 (MDS-EB1)', description_en: 'Myelodysplastic syndrome with excess blasts-1', category: 'mds' },
  { code: 'D46.Z', description_es: 'SMD, otros especificados', description_en: 'Other myelodysplastic syndromes, specified', category: 'mds' },

  // ── NEOPLASIAS MIELOPROLIFERATIVAS (NMP / MPN) ────────────────────────────
  { code: 'D45',   description_es: 'Policitemia vera', description_en: 'Polycythemia vera', category: 'mpn' },
  { code: 'D47.0', description_es: 'Histiocitosis y mastocitosis de comportamiento incierto', description_en: 'Histiocytic and mast cell tumors of uncertain behavior', category: 'mpn' },
  { code: 'D47.1', description_es: 'Enfermedad mieloproliferativa crónica no clasificada', description_en: 'Chronic myeloproliferative disease', category: 'mpn' },
  { code: 'D47.3', description_es: 'Trombocitemia esencial', description_en: 'Essential thrombocythemia (ET)', category: 'mpn' },
  { code: 'D47.4', description_es: 'Osteomielofibrosis / Mielofibrosis primaria', description_en: 'Osteomyelofibrosis / Primary myelofibrosis (PMF)', category: 'mpn' },
  { code: 'D47.5', description_es: 'Mastocitosis sistémica crónica', description_en: 'Chronic eosinophilic leukemia / Systemic mastocytosis', category: 'mpn' },
  { code: 'D47.7', description_es: 'Otras neoplasias hematológicas de comportamiento incierto', description_en: 'Other specified neoplasms of uncertain behavior of lymphoid, hematopoietic and related tissue', category: 'mpn' },
  { code: 'D47.9', description_es: 'Neoplasia de comportamiento incierto no especificada', description_en: 'Neoplasm of uncertain behavior of lymphoid, hematopoietic and related tissue, unspecified', category: 'mpn' },

  // ── OTRAS NEOPLASIAS HEMATOLÓGICAS ───────────────────────────────────────
  { code: 'C96.0', description_es: 'Histiocitosis de células de Langerhans multifocal y multisistémica', description_en: 'Multifocal and multisystemic (disseminated) Langerhans-cell histiocytosis', category: 'otro' },
  { code: 'C96.2', description_es: 'Tumor maligno de mastocitos', description_en: 'Malignant mast cell tumor', category: 'otro' },
  { code: 'C96.3', description_es: 'Linfoma histiocítico verdadero', description_en: 'Histiocytic sarcoma', category: 'otro' },
  { code: 'C96.4', description_es: 'Sarcoma de células dendríticas', description_en: 'Sarcoma of dendritic cells (accessory cells)', category: 'otro' },
  { code: 'C96.5', description_es: 'Neoplasia de células dendríticas plasmocitoides blásticas', description_en: 'Malignant histiocytosis', category: 'otro' },
  { code: 'C96.9', description_es: 'Neoplasia maligna hematológica y de tejido linfoide no especificada', description_en: 'Malignant neoplasm of lymphoid, hematopoietic and related tissue, unspecified', category: 'otro' },

  // ── ANEMIA APLÁSICA ───────────────────────────────────────────────────────
  { code: 'D61.0', description_es: 'Anemia aplásica constitucional', description_en: 'Constitutional aplastic anemia', category: 'otro' },
  { code: 'D61.1', description_es: 'Anemia aplásica inducida por fármacos', description_en: 'Drug-induced aplastic anemia', category: 'otro' },
  { code: 'D61.2', description_es: 'Anemia aplásica por otros agentes externos', description_en: 'Aplastic anemia due to other external agents', category: 'otro' },
  { code: 'D61.3', description_es: 'Anemia aplásica idiopática', description_en: 'Idiopathic aplastic anemia', category: 'otro' },
  { code: 'D61.8', description_es: 'Otras anemias aplásicas especificadas', description_en: 'Other specified aplastic anemias', category: 'otro' },
  { code: 'D61.9', description_es: 'Anemia aplásica no especificada', description_en: 'Aplastic anemia, unspecified', category: 'otro' },

  // ── LINFOHISTIOCITOSIS / HISTIOCITOSIS ────────────────────────────────────
  { code: 'D76.1', description_es: 'Linfohistiocitosis hemofagocítica (LHH / HLH)', description_en: 'Hemophagocytic lymphohistiocytosis (HLH)', category: 'otro' },
  { code: 'D76.2', description_es: 'Síndrome hemofagocítico asociado a infección', description_en: 'Hemophagocytic syndrome, infection-associated', category: 'otro' },
  { code: 'D76.3', description_es: 'Otros síndromes histiocíticos', description_en: 'Other histiocytic syndromes', category: 'otro' },

  // ── GAMMAPATÍAS / INMUNODEFICIENCIAS ─────────────────────────────────────
  { code: 'D80.1', description_es: 'Hipogammaglobulinemia no familiar', description_en: 'Nonfamilial hypogammaglobulinemia', category: 'otro' },
  { code: 'D80.6', description_es: 'Deficiencia de anticuerpos con inmunoglobulinas casi normales', description_en: 'Antibody deficiency with near-normal immunoglobulins', category: 'otro' },
  { code: 'D89.0', description_es: 'Hipergammaglobulinemia policlonal', description_en: 'Polyclonal hypergammaglobulinaemia', category: 'otro' },
  { code: 'D89.1', description_es: 'Crioglobulinemia', description_en: 'Cryoglobulinaemia', category: 'otro' },
  { code: 'D89.2', description_es: 'Hipergammaglobulinemia no especificada', description_en: 'Hypergammaglobulinaemia, unspecified', category: 'otro' },

  // ── ANTECEDENTES / SEGUIMIENTO / TRASPLANTE ──────────────────────────────
  { code: 'Z85.71', description_es: 'Antecedente personal de linfoma de Hodgkin', description_en: 'Personal history of Hodgkin lymphoma', category: 'otro' },
  { code: 'Z85.72', description_es: 'Antecedente personal de linfoma no Hodgkin', description_en: 'Personal history of non-Hodgkin lymphomas', category: 'otro' },
  { code: 'Z85.79', description_es: 'Antecedente personal de otras neoplasias malignas hematológicas', description_en: 'Personal history of other malignant neoplasms of lymphoid, hematopoietic and related tissues', category: 'otro' },
  { code: 'Z94.81', description_es: 'Trasplante de médula ósea / células madre hematopoyéticas', description_en: 'Bone marrow transplant status', category: 'otro' },
  { code: 'T86.00', description_es: 'Complicación de trasplante de médula ósea no especificada', description_en: 'Unspecified complication of bone marrow transplant', category: 'otro' },
  { code: 'T86.09', description_es: 'Otras complicaciones de trasplante de médula ósea', description_en: 'Other complications of bone marrow transplant', category: 'otro' },

  // ── COMPLICACIONES CLÍNICAS FRECUENTES EN ONCOHEMATOLOGÍA ─────────────────
  { code: 'D70.0',   description_es: 'Agranulocitosis congénita', description_en: 'Congenital agranulocytosis', category: 'otro' },
  { code: 'D70.1',   description_es: 'Agranulocitosis secundaria a quimioterapia', description_en: 'Agranulocytosis secondary to cancer chemotherapy', category: 'otro' },
  { code: 'D70.2',   description_es: 'Otras agranulocitosis por fármacos', description_en: 'Other drug-induced agranulocytosis', category: 'otro' },
  { code: 'D70.3',   description_es: 'Neutropenia por otras causas', description_en: 'Neutropenia due to infection', category: 'otro' },
  { code: 'D70.8',   description_es: 'Otras neutropenias', description_en: 'Other neutropenia', category: 'otro' },
  { code: 'D70.9',   description_es: 'Neutropenia no especificada', description_en: 'Neutropenia, unspecified', category: 'otro' },
  { code: 'D72.810', description_es: 'Linfocitosis', description_en: 'Lymphocytosis', category: 'otro' },
  { code: 'D72.820', description_es: 'Linfocitopenia', description_en: 'Lymphocytopenia', category: 'otro' },
  { code: 'D75.81',  description_es: 'Mielofibrosis', description_en: 'Myelofibrosis', category: 'otro' },
  { code: 'D75.89',  description_es: 'Otras enfermedades de la sangre especificadas', description_en: 'Other specified diseases of blood and blood-forming organs', category: 'otro' },

  // ── ANEMIAS POR DEFICIENCIA DE HIERRO (migración 016) ────────────────────
  { code: 'D50.0', description_es: 'Anemia por deficiencia de hierro secundaria a pérdida de sangre crónica', description_en: 'Iron deficiency anemia secondary to blood loss (chronic)', category: 'otro' },
  { code: 'D50.1', description_es: 'Anemia sideropénica disfágica (síndrome de Plummer-Vinson)', description_en: 'Sideropenic dysphagia', category: 'otro' },
  { code: 'D50.8', description_es: 'Otras anemias por deficiencia de hierro', description_en: 'Other iron deficiency anemias', category: 'otro' },
  { code: 'D50.9', description_es: 'Anemia por deficiencia de hierro no especificada', description_en: 'Iron deficiency anemia, unspecified', category: 'otro' },
  { code: 'D63.0', description_es: 'Anemia en neoplasia maligna', description_en: 'Anemia in neoplastic disease', category: 'otro' },
  { code: 'D63.1', description_es: 'Anemia en enfermedad renal crónica', description_en: 'Anemia in chronic kidney disease', category: 'otro' },
  { code: 'D63.8', description_es: 'Anemia en otras enfermedades crónicas clasificadas en otra parte', description_en: 'Anemia in other chronic diseases classified elsewhere', category: 'otro' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de normalización
// ─────────────────────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // eliminar diacríticos (tildes, diéresis)
    .trim()
}

function scoreMatch(normalized_query: string, entry: Diagnosis): number {
  const code = entry.code.toLowerCase()
  const desc_es = normalize(entry.description_es)
  const desc_en = normalize(entry.description_en ?? '')

  // Coincidencia exacta de código → máxima prioridad
  if (code === normalized_query) return 100

  // Código empieza con la query
  if (code.startsWith(normalized_query)) return 90

  // Todas las palabras de la query aparecen en la descripción ES
  const words = normalized_query.split(/\s+/).filter(Boolean)
  if (words.length > 0 && words.every(w => desc_es.includes(w))) return 80

  // Todas las palabras aparecen en la descripción EN
  if (words.length > 0 && words.every(w => desc_en.includes(w))) return 70

  // Al menos una palabra clave (≥4 chars) está en descripción ES
  const keyWords = words.filter(w => w.length >= 4)
  if (keyWords.length > 0 && keyWords.some(w => desc_es.includes(w))) return 40

  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Función de búsqueda pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca diagnósticos CIE-10 del catálogo oncohematológico.
 *
 * @param query    Código CIE-10 exacto ("C90.0") o texto libre en español/inglés ("mieloma múltiple").
 * @param category Filtra por categoría: 'mieloma' | 'linfoma' | 'leucemia' | 'mds' | 'mpn' | 'otro'.
 * @param catalog  Catálogo personalizado; por defecto usa CIE10_CATALOG (161 códigos del módulo HEMA).
 * @returns        Diagnósticos ordenados por relevancia, máximo 20 resultados.
 */
export function searchDiagnosis(
  query: string,
  category?: DiagnosisCategory,
  catalog: Diagnosis[] = CIE10_CATALOG,
): Diagnosis[] {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []

  const normalized = normalize(trimmed)

  const filtered = category
    ? catalog.filter(d => d.category === category)
    : catalog

  const scored = filtered
    .map(d => ({ d, score: scoreMatch(normalized, d) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, 20).map(({ d }) => d)
}
