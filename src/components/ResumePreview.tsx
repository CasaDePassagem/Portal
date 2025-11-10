import React from 'react';

type Experience = {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
};

type Education = {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
};

type Skill = {
  name: string;
  level: number; // 0-100
};

type Project = {
  title: string;
  description: string;
  link?: string;
  type?: 'Pessoal' | 'Social' | 'Outro';
};

type Language = {
  name: string;
  level: 'Básico' | 'Intermediário' | 'Avançado' | 'Fluente' | 'Nativo';
  certification?: string;
  notes?: string;
};

type Data = {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects?: Project[];
  languages?: Language[];
  certifications?: { title: string; link?: string }[];
};

type SectionKey = 'skills' | 'languages' | 'experience' | 'education' | 'projects' | 'certifications';

type Props = {
  data: Data;
  colors: { primary: string; accent: string; headerText: string };
  photoSrc?: string;
  photoShape?: 'quadrado' | 'redondo';
  fontFamily?: 'sans' | 'serif' | 'humanist';
  density?: 'compact' | 'comfortable';
  headerLayout?: 'left' | 'right';
  showHeaderDivider?: boolean;
  showSectionDividers?: boolean;
  bulletizeDescriptions?: boolean;
  leftOrder?: SectionKey[];
  rightOrder?: SectionKey[];
} & React.HTMLAttributes<HTMLDivElement>;

const formatMonth = (value: string | undefined) => {
  if (!value) return '';
  // expected YYYY-MM or YYYY-MM-DD; return MM/YYYY
  const [y, m] = value.split('-');
  if (!y || !m) return value;
  const mm = (m.length === 1 ? `0${m}` : m).slice(0, 2);
  return `${mm}/${y}`;
};

export const ResumePreview = React.forwardRef<HTMLDivElement, Props>(({ data, colors, photoSrc, photoShape = 'quadrado', fontFamily = 'sans', density = 'comfortable', headerLayout = 'right', showHeaderDivider = false, showSectionDividers = true, bulletizeDescriptions = false, leftOrder = ['skills', 'languages'], rightOrder = ['experience', 'education', 'projects', 'certifications'], ...rest }, ref) => {
  const p = colors.primary;
  const a = colors.accent;
  const ht = colors.headerText || '#ffffff';
  const skillLabel = (level?: number) => (level ?? 0) < 35 ? 'Iniciante' : (level ?? 0) < 70 ? 'Intermediário' : 'Avançado';

  const fontStacks: Record<NonNullable<Props['fontFamily']>, string> = {
    sans: "Inter, 'IBM Plex Sans', system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif",
    humanist: "'Helvetica Neue', Helvetica, Calibri, 'Segoe UI', Arial, sans-serif",
    // Serif mais conservadora e próxima das sans (menos cursiva)
    serif: "'IBM Plex Serif', 'Source Serif Pro', 'Noto Serif', Georgia, 'Times New Roman', serif",
  };

  const gaps = density === 'compact' ? { headerPad: 18, sectionTop: 14, gridGap: 12 } : { headerPad: 24, sectionTop: 20, gridGap: 20 };

  const Title = ({ children }: { children: React.ReactNode }) => (
    <h3 style={{ color: p, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{children}</h3>
  );

  const Divider = () => (
    showSectionDividers ? <div style={{ height: 3, width: 40, background: p, borderRadius: 4, marginBottom: 12 }} /> : null
  );

  return (
    <div ref={ref} {...rest} style={{ width: 794, minHeight: 1123, background: '#fff', color: '#0f172a', fontFamily: fontStacks[fontFamily] }}>
      <div style={{ padding: 28 }}>
        <div style={{ background: p, color: ht, borderRadius: 16, padding: gaps.headerPad, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: headerLayout === 'left' ? 'row-reverse' : 'row' }}>
          <div style={{ textAlign: headerLayout === 'left' ? 'right' : 'left' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: ht }}>{data.personalInfo.name || 'Seu Nome'}</div>
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.95, color: ht }}>
              {[data.personalInfo.email, data.personalInfo.phone, data.personalInfo.location]
                .filter(Boolean)
                .join(' • ')}
            </div>
          </div>
          <div style={{ width: 84, height: 84, borderRadius: photoShape === 'redondo' ? 9999 : 12, overflow: 'hidden', background: 'transparent', border: `2px solid rgba(255,255,255,0.55)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photoSrc ? (
              // square-cropped image with rounded corners
              <img src={photoSrc} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '70%', height: '70%', borderRadius: 9999, background: 'rgba(255,255,255,0.35)' }} />
            )}
          </div>
        </div>
        {showHeaderDivider && <div style={{ height: 1, background: '#e2e8f0', marginTop: 10 }} />}

        {data.personalInfo.summary && (
          <section style={{ marginTop: gaps.sectionTop + 4, breakInside: 'avoid' as React.CSSProperties['breakInside'] }}>
            <Title>Resumo</Title>
            <Divider />
            <p style={{ fontSize: 12, lineHeight: '18px', color: '#334155' }}>{data.personalInfo.summary}</p>
          </section>
        )}
        {/* Content grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: gaps.gridGap, alignItems: 'start', marginTop: 16 }}>
          {/* Left column: Skills + Languages */}
          <div>
            {leftOrder.map((section, idx) => (
              section === 'skills' && data.skills?.length > 0 ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Habilidades</Title>
                  <Divider />
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginRight: -6, marginBottom: -6 }}>
                    {data.skills.map((s, i) => (
                      s?.name ? (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, padding: '6px 10px', borderRadius: 999, background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', marginRight: 6, marginBottom: 6 }}>
                          {s.name}{typeof s.level === 'number' ? ` • ${skillLabel(s.level)}` : ''}
                        </span>
                      ) : null
                    ))}
                  </div>
                </section>
              ) : section === 'languages' && data.languages && data.languages.length > 0 && data.languages.some(l => l.name) ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Idiomas</Title>
                  <Divider />
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginRight: -6, marginBottom: -6 }}>
                    {data.languages.map((l, i) => (
                      l.name ? (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, padding: '6px 10px', borderRadius: 999, background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', marginRight: 6, marginBottom: 6 }}>
                          {l.name} • {l.level}{l.certification ? ` • ${l.certification}` : ''}
                        </span>
                      ) : null
                    ))}
                  </div>
                </section>
              ) : section === 'experience' && data.experience?.length > 0 && data.experience.some(e => e.company || e.position) ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Experiência</Title>
                  <Divider />
                  <div style={{ display: 'grid', gap: 10 }}>
                    {data.experience.map((e, i) => (
                      (e.company || e.position) && (
                        <div key={i}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{e.position || 'Cargo'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{e.company}</div>
                          {(e.startDate || e.endDate || e.current) && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              {(formatMonth(e.startDate) || 'Início')} — {e.current ? 'Atual' : (formatMonth(e.endDate) || 'Fim')}
                            </div>
                          )}
                          {e.description && (
                            bulletizeDescriptions ? (
                              <ul style={{ fontSize: 12, color: '#334155', marginTop: 6, paddingLeft: 16 }}>
                                {e.description.split(/\n|\u2022|-/).map(s => s.trim()).filter(Boolean).map((line, j) => (
                                  <li key={j} style={{ marginBottom: 4 }}>{line}</li>
                                ))}
                              </ul>
                            ) : (
                              <div style={{ fontSize: 12, color: '#334155', marginTop: 6, whiteSpace: 'pre-wrap' }}>{e.description}</div>
                            )
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </section>
              ) : section === 'education' && data.education?.length > 0 && data.education.some(e => e.institution || e.degree) ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Educação</Title>
                  <Divider />
                  <div style={{ display: 'grid', gap: 10 }}>
                    {data.education.map((e, i) => (
                      (e.institution || e.degree) && (
                        <div key={i}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{e.degree || 'Curso'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{e.institution}</div>
                          {e.field && <div style={{ fontSize: 12, color: '#334155' }}>Área: {e.field}</div>}
                          {(e.startDate || e.endDate || e.current) && (
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                              {(formatMonth(e.startDate) || 'Início')} — {e.current ? 'Em andamento' : (formatMonth(e.endDate) || 'Fim')}
                            </div>
                          )}
                        </div>
                      )
                    ))}
                  </div>
                </section>
              ) : section === 'projects' && data.projects && data.projects.length > 0 && data.projects.some(pj => pj.title || pj.description) ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Projetos</Title>
                  <Divider />
                  <div style={{ display: 'grid', gap: 10 }}>
                    {data.projects.map((proj, i) => (
                      (proj.title || proj.description) ? (
                        <div key={i}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{proj.title || 'Projeto'}</div>
                            {proj.type && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#334155', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 999 }}>
                                {proj.type}
                              </span>
                            )}
                            {proj.link && (
                              <a href={proj.link} style={{ fontSize: 10, color: a, textDecoration: 'underline' }}>{proj.link}</a>
                            )}
                          </div>
                          {proj.description && (
                            <div style={{ fontSize: 12, color: '#334155', marginTop: 6, whiteSpace: 'pre-wrap' }}>{proj.description}</div>
                          )}
                        </div>
                      ) : null
                    ))}
                  </div>
                </section>
              ) : section === 'certifications' && data.certifications && data.certifications.length > 0 && data.certifications.some(c => c.title) ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Certificações</Title>
                  <Divider />
                  <div style={{ display: 'grid', gap: 8 }}>
                    {data.certifications.map((c, i) => (
                      c.title ? (
                        <div key={i}>
                          {c.link ? (
                            <a href={c.link} style={{ fontSize: 12, color: a, textDecoration: 'underline' }}>{c.title}</a>
                          ) : (
                            <span style={{ fontSize: 12, color: '#0f172a' }}>{c.title}</span>
                          )}
                        </div>
                      ) : null
                    ))}
                  </div>
                </section>
              ) : null
            ))}
          </div>

          {/* Right column: All sections (symmetric to left) */}
          <div>
            {rightOrder.map((section, idx) => (
              section === 'skills' && data.skills?.length > 0 ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Habilidades</Title>
                  <Divider />
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginRight: -6, marginBottom: -6 }}>
                    {data.skills.map((s, i) => (
                      s?.name ? (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, padding: '6px 10px', borderRadius: 999, background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', marginRight: 6, marginBottom: 6 }}>
                          {s.name}{typeof s.level === 'number' ? ` • ${skillLabel(s.level)}` : ''}
                        </span>
                      ) : null
                    ))}
                  </div>
                </section>
              ) : section === 'languages' && data.languages && data.languages.length > 0 && data.languages.some(l => l.name) ? (
                <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                  <Title>Idiomas</Title>
                  <Divider />
                  <div style={{ display: 'flex', flexWrap: 'wrap', marginRight: -6, marginBottom: -6 }}>
                    {data.languages.map((l, i) => (
                      l.name ? (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, padding: '6px 10px', borderRadius: 999, background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', marginRight: 6, marginBottom: 6 }}>
                          {l.name} • {l.level}{l.certification ? ` • ${l.certification}` : ''}
                        </span>
                      ) : null
                    ))}
                  </div>
                </section>
              ) :
                section === 'experience' && data.experience?.length > 0 && data.experience.some(e => e.company || e.position) ? (
                  <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                    <Title>Experiência</Title>
                    <Divider />
                    <div style={{ display: 'grid', gap: 10 }}>
                      {data.experience.map((e, i) => (
                        (e.company || e.position) && (
                          <div key={i}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{e.position || 'Cargo'}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{e.company}</div>
                            {(e.startDate || e.endDate || e.current) && (
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {(formatMonth(e.startDate) || 'Início')} — {e.current ? 'Atual' : (formatMonth(e.endDate) || 'Fim')}
                              </div>
                            )}
                            {e.description && (
                              bulletizeDescriptions ? (
                                <ul style={{ fontSize: 12, color: '#334155', marginTop: 6, paddingLeft: 16 }}>
                                  {e.description.split(/\n|\u2022|-/).map(s => s.trim()).filter(Boolean).map((line, j) => (
                                    <li key={j} style={{ marginBottom: 4 }}>{line}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div style={{ fontSize: 12, color: '#334155', marginTop: 6, whiteSpace: 'pre-wrap' }}>{e.description}</div>
                              )
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </section>
                ) : section === 'education' && data.education?.length > 0 && data.education.some(e => e.institution || e.degree) ? (
                  <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                    <Title>Educação</Title>
                    <Divider />
                    <div style={{ display: 'grid', gap: 10 }}>
                      {data.education.map((e, i) => (
                        (e.institution || e.degree) && (
                          <div key={i}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{e.degree || 'Curso'}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{e.institution}</div>
                            {e.field && <div style={{ fontSize: 12, color: '#334155' }}>Área: {e.field}</div>}
                            {(e.startDate || e.endDate || e.current) && (
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                {(formatMonth(e.startDate) || 'Início')} — {e.current ? 'Em andamento' : (formatMonth(e.endDate) || 'Fim')}
                              </div>
                            )}
                          </div>
                        )
                      ))}
                    </div>
                  </section>
                ) : section === 'projects' && data.projects && data.projects.length > 0 && data.projects.some(pj => pj.title || pj.description) ? (
                  <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                    <Title>Projetos</Title>
                    <Divider />
                    <div style={{ display: 'grid', gap: 10 }}>
                      {data.projects.map((proj, i) => (
                        (proj.title || proj.description) ? (
                          <div key={i}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{proj.title || 'Projeto'}</div>
                              {proj.type && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#334155', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 6px', borderRadius: 999 }}>
                                  {proj.type}
                                </span>
                              )}
                              {proj.link && (
                                <a href={proj.link} style={{ fontSize: 10, color: a, textDecoration: 'underline' }}>{proj.link}</a>
                              )}
                            </div>
                            {proj.description && (
                              <div style={{ fontSize: 12, color: '#334155', marginTop: 6, whiteSpace: 'pre-wrap' }}>{proj.description}</div>
                            )}
                          </div>
                        ) : null
                      ))}
                    </div>
                  </section>
                ) : section === 'certifications' && data.certifications && data.certifications.length > 0 && data.certifications.some(c => c.title) ? (
                  <section key={section} style={{ marginTop: idx === 0 ? 0 : gaps.sectionTop, breakInside: 'avoid' }}>
                    <Title>Certificações</Title>
                    <Divider />
                    <div style={{ display: 'grid', gap: 8 }}>
                      {data.certifications.map((c, i) => (
                        c.title ? (
                          <div key={i}>
                            {c.link ? (
                              <a href={c.link} style={{ fontSize: 12, color: a, textDecoration: 'underline' }}>{c.title}</a>
                            ) : (
                              <span style={{ fontSize: 12, color: '#0f172a' }}>{c.title}</span>
                            )}
                          </div>
                        ) : null
                      ))}
                    </div>
                  </section>
                ) : null
            ))}
          </div>
        </div>


      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
