import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PhotoUpload from '../components/PhotoUpload';
import { createProfile, updateProfile, fetchProfile } from '../api/profiles';

const FIELD_CONFIG = [
  { key: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Ej: Juan Carlos Espinoza', icon: 'user', required: true },
  { key: 'position', label: 'Cargo', type: 'text', placeholder: 'Ej: Director de Operaciones', icon: 'briefcase', required: true },
  { key: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'correo@gecelca.com', icon: 'mail', required: true },
  { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: '+57 300 123 4567', icon: 'phone', required: false },
] as const;

function FieldIcon({ name }: { name: string }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: '#94a3b8', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'user': return <svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case 'briefcase': return <svg {...props}><rect width="20" height="14" x="2" y="7" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
    case 'mail': return <svg {...props}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
    case 'phone': return <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
    default: return null;
  }
}

export default function ProfileForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [fields, setFields] = useState({ name: '', position: '', email: '', phone: '' });
  const [photo, setPhoto] = useState<File | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(isEdit);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [successAnim, setSuccessAnim] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (id) {
      fetchProfile(id).then((p) => {
        setFields({ name: p.name, position: p.position, email: p.email, phone: p.phone || '' });
        setCurrentPhotoUrl(p.photoUrl);
      }).catch(() => setError('No se pudo cargar el perfil'))
        .finally(() => setLoadingProfile(false));
    }
  }, [id]);

  function updateField(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!isEdit && !photo) {
      setError('La foto es requerida para crear un perfil');
      return;
    }

    const formData = new FormData();
    formData.append('name', fields.name);
    formData.append('position', fields.position);
    formData.append('email', fields.email);
    if (fields.phone) formData.append('phone', fields.phone);
    if (photo) formData.append('photo', photo);

    setLoading(true);
    try {
      if (isEdit && id) {
        await updateProfile(id, formData);
      } else {
        await createProfile(formData);
      }
      setSuccessAnim(true);
      setTimeout(() => navigate('/'), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  if (loadingProfile) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Cargando perfil...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.wrapper,
      ...(successAnim ? { opacity: 0, transform: 'scale(0.96)' } : {}),
    }}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn} aria-label="Volver">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div style={styles.headerCenter}>
          <h1 style={styles.headerTitle}>
            {isEdit ? 'Editar Perfil' : 'Nuevo Perfil'}
          </h1>
          <p style={styles.headerSubtitle}>
            {isEdit ? 'Actualiza la información del perfil' : 'Completa los datos del nuevo perfil'}
          </p>
        </div>
        <div style={{ width: '44px' }} />
      </div>

      {/* Card */}
      <div style={styles.card}>
        <form id="profile-form" ref={formRef} onSubmit={handleSubmit} style={styles.form}>
          {/* Photo Section */}
          <div style={styles.photoSection}>
            <PhotoUpload currentPhotoUrl={currentPhotoUrl} onFileSelect={setPhoto} />
            <p style={styles.photoHint}>
              {photo ? '✓ Foto seleccionada' : 'Toca para agregar una foto'}
            </p>
          </div>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>Información del perfil</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <div style={styles.errorIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </div>
              <span>{error}</span>
            </div>
          )}

          {/* Fields */}
          <div style={styles.fieldGroup}>
            {FIELD_CONFIG.map(({ key, label, type, placeholder, icon, required }) => (
              <div key={key} style={styles.field}>
                <label style={styles.label}>
                  {label}
                  {required && <span style={styles.required}>*</span>}
                </label>
                <div style={{
                  ...styles.inputWrap,
                  ...(focusedField === key ? styles.inputWrapFocused : {}),
                }}>
                  <div style={{
                    ...styles.inputIcon,
                    ...(focusedField === key ? styles.inputIconFocused : {}),
                  }}>
                    <FieldIcon name={icon} />
                  </div>
                  <input
                    style={styles.input}
                    type={type}
                    value={fields[key as keyof typeof fields]}
                    onChange={(e) => updateField(key, e.target.value)}
                    onFocus={() => setFocusedField(key)}
                    onBlur={() => setFocusedField(null)}
                    placeholder={placeholder}
                    required={required}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              ...(loading ? styles.submitBtnLoading : {}),
            }}
          >
            {loading ? (
              <div style={styles.submitBtnContent}>
                <div style={styles.spinnerSmall} />
                <span>Guardando...</span>
              </div>
            ) : (
              <div style={styles.submitBtnContent}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {isEdit
                    ? <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>
                    : <><polyline points="20 6 9 17 4 12" /></>
                  }
                </svg>
                <span>{isEdit ? 'Actualizar Perfil' : 'Crear Perfil'}</span>
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Bottom spacing */}
      <div style={{ height: '32px' }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: '520px',
    margin: '0 auto',
    minHeight: '100%',
    padding: '0 4px',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    transition: 'opacity 0.4s ease, transform 0.4s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '8px 0 20px',
    gap: '8px',
  },
  backBtn: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '14px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    color: '#023f86',
    transition: 'all 200ms ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    flexShrink: 0,
  },
  headerCenter: {
    flex: 1,
    textAlign: 'center',
    paddingTop: '4px',
  },
  headerTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  headerSubtitle: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '4px',
    fontWeight: 400,
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    boxShadow: '0 1px 3px rgba(2, 63, 134, 0.04), 0 8px 32px rgba(2, 63, 134, 0.06)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    overflow: 'hidden',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    padding: '28px 24px 24px',
  },
  photoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    paddingBottom: '4px',
  },
  photoHint: {
    fontSize: '0.78rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'linear-gradient(to right, transparent, #e2e8f0, transparent)',
  },
  dividerText: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 500,
    border: '1px solid rgba(220, 38, 38, 0.1)',
    animation: 'fadeIn 0.3s ease',
  },
  errorIcon: {
    flexShrink: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#334155',
    paddingLeft: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },
  required: {
    color: '#dc2626',
    fontSize: '0.9em',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e2e8f0',
    borderRadius: '14px',
    background: '#f8fafc',
    transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'hidden',
  },
  inputWrapFocused: {
    borderColor: '#2178bd',
    background: '#ffffff',
    boxShadow: '0 0 0 3px rgba(33, 120, 189, 0.1)',
  },
  inputIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '14px',
    paddingRight: '2px',
    transition: 'all 200ms ease',
    flexShrink: 0,
  },
  inputIconFocused: {
    color: '#023f86',
  },
  input: {
    flex: 1,
    padding: '13px 14px 13px 10px',
    border: 'none',
    background: 'transparent',
    fontSize: '0.95rem',
    color: '#1e293b',
    outline: 'none',
    width: '100%',
  },
  submitBtn: {
    width: '100%',
    padding: '15px 24px',
    background: 'linear-gradient(135deg, #023f86 0%, #2178bd 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 4px 16px rgba(2, 63, 134, 0.25)',
    marginTop: '4px',
    letterSpacing: '0.01em',
  },
  submitBtnLoading: {
    background: '#94a3b8',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  submitBtnContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  loadingWrap: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    animation: 'fadeIn 0.3s ease',
  },
  loadingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    background: '#ffffff',
    padding: '40px 48px',
    borderRadius: '20px',
    boxShadow: '0 4px 24px rgba(2, 63, 134, 0.08)',
  },
  loadingText: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: 500,
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#023f86',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerSmall: {
    width: '20px',
    height: '20px',
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
