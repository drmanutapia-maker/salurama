-- ============================================================
-- Subfase 1c (parte restrictiva): REVOKE y GRANT por columna sobre doctors.
-- Aplicar SOLO después de 20261005000003 Y después de desplegar el código
-- que ya no lee columnas privadas con la clave anónima ni de sesión.
-- Reversión: supabase/pendientes/reversion_000004_restaurar_permisos_doctors.sql
-- UBICACIÓN: se mantiene fuera de supabase/migrations/ a propósito, porque
-- `supabase db push` aplicaría TODAS las migraciones pendientes juntas. En la
-- Fase E se mueve a supabase/migrations/ con:
--   mv supabase/pendientes/20261005000004_doctors_column_grants.sql supabase/migrations/
-- ============================================================

-- 6. REVOKE y GRANT por columna
REVOKE ALL ON TABLE public.doctors FROM anon;
REVOKE ALL ON TABLE public.doctors FROM authenticated;

GRANT SELECT (
  id, created_at, updated_at, full_name, specialty, professional_license,
  license_verified, consultation_price, description, photo_url, is_active,
  gender, languages, hospital_affiliation, years_experience, education,
  schedule, rating_avg, rating_count, profile_views, slug, verification_status,
  symptoms, insurance_accepted, availability, specialty_council_url,
  license_issue_date, sub_specialty, license_visible, review_status,
  atiende_ninos, about_me, clinic_name, clinic_address, website_url,
  price_list, payment_methods, office_materials, patient_age_range,
  access_info, additional_info, consultation_price_general,
  consultation_price_followup, consultation_price_first_time,
  accepts_insurance, insurance_names, available_days, schedule_start,
  schedule_end, first_visit_requirements, wheelchair_accessible,
  has_elevator, has_parking, public_transport_nearby, min_patient_age,
  max_patient_age, best_contact_time, whatsapp_available, clinic_phone_visible,
  cancellation_policy, next_available_date, availability_status,
  availability_hours, availability_schedule, clinic_addresses, location_city_id,
  cp, horario, duracion_cita_minutos, user_id, license_not_current,
  clinic_lat, clinic_lng, clinic_formatted_address, display_name,
  professional_title, facebook_url, instagram_url, tiktok_url, x_url,
  linkedin_url, clinic_type, floor, estado, ciudad, colonia, street,
  ext_number, int_number, latitude, longitude, pricing_tier,
  cofepris_aviso_numero, cofepris_acuse_url, cofepris_aviso_fecha,
  has_aviso_funcionamiento, factura_disponible
) ON public.doctors TO anon;

GRANT SELECT (
  id, created_at, updated_at, full_name, specialty, professional_license,
  license_verified, consultation_price, description, photo_url, is_active,
  gender, languages, hospital_affiliation, years_experience, education,
  schedule, rating_avg, rating_count, profile_views, slug, verification_status,
  symptoms, insurance_accepted, availability, specialty_council_url,
  license_issue_date, sub_specialty, license_visible, review_status,
  atiende_ninos, about_me, clinic_name, clinic_address, website_url,
  price_list, payment_methods, office_materials, patient_age_range,
  access_info, additional_info, consultation_price_general,
  consultation_price_followup, consultation_price_first_time,
  accepts_insurance, insurance_names, available_days, schedule_start,
  schedule_end, first_visit_requirements, wheelchair_accessible,
  has_elevator, has_parking, public_transport_nearby, min_patient_age,
  max_patient_age, best_contact_time, whatsapp_available, clinic_phone_visible,
  cancellation_policy, next_available_date, availability_status,
  availability_hours, availability_schedule, clinic_addresses, location_city_id,
  cp, horario, duracion_cita_minutos, user_id, license_not_current,
  clinic_lat, clinic_lng, clinic_formatted_address, display_name,
  professional_title, facebook_url, instagram_url, tiktok_url, x_url,
  linkedin_url, clinic_type, floor, estado, ciudad, colonia, street,
  ext_number, int_number, latitude, longitude, pricing_tier,
  cofepris_aviso_numero, cofepris_acuse_url, cofepris_aviso_fecha,
  has_aviso_funcionamiento, factura_disponible,
  webauthn_banner_declined, webauthn_migrado_dispositivo,
  pwa_banner_shown, cofepris_banner_declined
) ON public.doctors TO authenticated;

-- UPDATE solo sobre columnas que el médico puede editar
-- Las columnas de control (pricing_tier, verification_status, etc.) quedan fuera
GRANT UPDATE (
  full_name, specialty, professional_license, description, photo_url,
  gender, languages, hospital_affiliation, years_experience, education,
  schedule, slug, symptoms, insurance_accepted, availability,
  specialty_council_url, license_issue_date, sub_specialty,
  license_visible, atiende_ninos, about_me, clinic_name, clinic_address,
  website_url, price_list, payment_methods, office_materials,
  patient_age_range, access_info, additional_info,
  consultation_price_general, consultation_price_followup,
  consultation_price_first_time, consultation_price,
  accepts_insurance, insurance_names, available_days, schedule_start,
  schedule_end, first_visit_requirements, wheelchair_accessible,
  has_elevator, has_parking, public_transport_nearby, min_patient_age,
  max_patient_age, best_contact_time, whatsapp_available,
  clinic_phone_visible, cancellation_policy, next_available_date,
  availability_status, availability_hours, availability_schedule,
  clinic_addresses, location_city_id, cp, horario, duracion_cita_minutos,
  clinic_lat, clinic_lng, clinic_formatted_address, display_name,
  professional_title, facebook_url, instagram_url, tiktok_url, x_url,
  linkedin_url, clinic_type, floor, estado, ciudad, colonia, street,
  ext_number, int_number, latitude, longitude,
  cofepris_aviso_numero, cofepris_acuse_url, cofepris_aviso_fecha,
  has_aviso_funcionamiento, factura_disponible, license_not_current,
  webauthn_banner_declined, webauthn_migrado_dispositivo,
  pwa_banner_shown, cofepris_banner_declined,
  clinic_phone, whatsapp_phone
) ON public.doctors TO authenticated;
