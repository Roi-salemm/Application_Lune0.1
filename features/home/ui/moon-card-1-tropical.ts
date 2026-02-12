// Type de la carte lunaire tropicale pour la home.
// Pourquoi : partager un contrat clair entre le domaine de calcul et l'affichage debug.
export type MoonCard1Tropical = {
  ts_utc: string;

  // Phase (fournie par ms_mapping)
  phase_key: string;
  phase_change_ts_utc: string | null;
  illumination_frac: number | null;

  // Signe tropical
  sign_index: number;
  sign_name_fr: string;
  sign_name_en: string;

  // Longitude / degre dans le signe
  lon_tropical_deg: number;
  deg_in_sign: number;
  deg_in_sign_dms: string;

  // Entree / sortie du signe (UTC)
  sign_ingress_ts_utc: string;
  sign_egress_ts_utc: string;

  // Lune vide de course (pas calculee ici)
  voc_status: 'unavailable';
  is_void_of_course: false;
  voc_start_ts_utc: null;
  voc_end_ts_utc: null;

  // Qualite des heures ingress/egress
  precision: 'minute' | 'day';
};
