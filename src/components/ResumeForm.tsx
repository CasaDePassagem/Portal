import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, User, Briefcase, GraduationCap, Upload, Download, BadgeCheck, FolderGit2, Eye, Languages as LanguagesIcon, Medal } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ResumePreview } from './ResumePreview';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import ReactDOM from 'react-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('pt-BR', ptBR);

interface Skill {
    name: string;
    level: number; // 0-100
}

interface Project {
    title: string;
    description: string;
    link?: string;
    type?: 'Pessoal' | 'Social' | 'Outro';
}

interface Language {
    name: string;
    level: 'Básico' | 'Intermediário' | 'Avançado' | 'Fluente' | 'Nativo';
    certification?: string;
    notes?: string;
}

interface Certification {
    title: string;
    link?: string;
}

interface FormData {
    personalInfo: {
        name: string;
        email: string;
        phone: string;
        location: string;
        photo?: File;
        summary: string;
    };
    experience: Array<{
        company: string;
        position: string;
        startDate: string;
        endDate: string;
        current: boolean;
        description: string;
    }>;
    education: Array<{
        institution: string;
        degree: string;
        field: string;
        startDate: string;
        endDate: string;
        current: boolean;
    }>;
    skills: Skill[];
    achievements: string[];
    projects: Project[];
    languages: Language[];
    certifications: Certification[];
}

export const ResumeForm = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<FormData>({
        personalInfo: {
            name: '',
            email: '',
            phone: '',
            location: '',
            summary: ''
        },
        experience: [{ company: '', position: '', startDate: '', endDate: '', current: false, description: '' }],
        education: [{ institution: '', degree: '', field: '', startDate: '', endDate: '', current: false }],
        skills: [{ name: '', level: 60 }],
        achievements: [],
        projects: [{ title: '', description: '', type: 'Pessoal', link: '' }],
        languages: [{ name: '', level: 'Intermediário', certification: '', notes: '' }],
        certifications: [{ title: '', link: '' }]
    });

    const [themeColors, setThemeColors] = useState({ primary: '#7c3aed', accent: '#06b6d4', headerText: '#ffffff' });
    const [photoShape, setPhotoShape] = useState<'quadrado' | 'redondo'>('quadrado');
    const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'humanist'>('sans');
    const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
    const [headerLayout, setHeaderLayout] = useState<'left' | 'right'>('right');
    const [showHeaderDivider, setShowHeaderDivider] = useState(false);
    const [showSectionDividers, setShowSectionDividers] = useState(true);
    const [bulletizeDescriptions, setBulletizeDescriptions] = useState(false);
    type SectionKey = 'skills' | 'languages' | 'experience' | 'education' | 'projects' | 'certifications';
    const [leftOrder, setLeftOrder] = useState<SectionKey[]>(['skills', 'languages']);
    const [rightOrder, setRightOrder] = useState<SectionKey[]>([
        'experience', 'education', 'projects', 'certifications'
    ]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const reorder = <T,>(arr: T[], start: number, end: number) => {
            const cp = arr.slice();
            const [removed] = cp.splice(start, 1);
            cp.splice(end, 0, removed);
            return cp;
        };

        if (source.droppableId === 'left' && destination.droppableId === 'left') {
            setLeftOrder(prev => reorder(prev, source.index, destination.index));
        } else if (source.droppableId === 'right' && destination.droppableId === 'right') {
            setRightOrder(prev => reorder(prev, source.index, destination.index));
        } else if (
            source.droppableId !== destination.droppableId
        ) {
            // move item between columns: remove from source, insert into destination
            if (source.droppableId === 'left' && destination.droppableId === 'right') {
                const item = leftOrder[source.index];
                const newLeft = leftOrder.filter((_, i) => i !== source.index);
                const newRight = rightOrder.slice();
                newRight.splice(Math.min(destination.index, newRight.length), 0, item);
                setLeftOrder(newLeft);
                setRightOrder(newRight);
            } else if (source.droppableId === 'right' && destination.droppableId === 'left') {
                const item = rightOrder[source.index];
                const newRight = rightOrder.filter((_, i) => i !== source.index);
                const newLeft = leftOrder.slice();
                newLeft.splice(Math.min(destination.index, newLeft.length), 0, item);
                setRightOrder(newRight);
                setLeftOrder(newLeft);
            }
        }
    };
    const previewRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

    // Helpers
    const formatPhoneBr = (raw: string) => {
        const digits = raw.replace(/\D/g, '').slice(0, 11);
        const d1 = digits.slice(0, 2);
        const d2 = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
        const d3 = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);
        if (digits.length <= 2) return digits ? `(${digits}` : '';
        if (digits.length <= 6) return `(${d1}) ${digits.slice(2)}`;
        if (digits.length <= 10) return `(${d1}) ${d2}-${d3}`;
        return `(${d1}) ${d2}-${d3}`;
    };

    const parseMonth = (value: string | undefined): Date | null => {
        if (!value) return null;
        const [y, m] = value.split('-');
        const yy = Number(y);
        const mm = Number(m);
        if (!yy || !mm) return null;
        return new Date(yy, mm - 1, 1);
    };

    const storeMonth = (date: Date | null): string => {
        if (!date) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    };

    useEffect(() => {
        const node = viewportRef.current;
        if (!node) return;
        const compute = () => {
            const w = node.clientWidth - 16;
            const s = Math.min(1, Math.max(0.3, w / 794));
            setScale(s);
        };
        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(node);
        return () => ro.disconnect();
    }, []);

    const generatePDF = async () => {
        const target = printRef.current || previewRef.current;
        if (!target) return;
        const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const usedHeight = Math.min(imgHeight, pageHeight);
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, usedHeight);

        // Add clickable link annotations over the image using DOM positions
        try {
            const containerRect = target.getBoundingClientRect();
            const ratioX = pageWidth / containerRect.width;
            const ratioY = usedHeight / containerRect.height;
            const anchors = Array.from(target.querySelectorAll('a[href]')) as HTMLAnchorElement[];
            anchors.forEach((a) => {
                const href = a.getAttribute('href');
                if (!href || href.startsWith('#')) return;
                const r = a.getBoundingClientRect();
                const x = (r.left - containerRect.left) * ratioX;
                const y = (r.top - containerRect.top) * ratioY;
                const w = r.width * ratioX;
                const h = r.height * ratioY;
                (pdf as unknown as { link: (x: number, y: number, w: number, h: number, options: { url: string }) => void }).link(x, y, w, h, { url: href });
            });
        } catch {
            // Silently ignore PDF link errors
        }
        pdf.save(`${formData.personalInfo.name || 'cv'}-preview.pdf`);
    };

    const steps = [
        { icon: User, title: 'Informações Pessoais', description: 'Dados básicos e foto' },
        { icon: Briefcase, title: 'Experiência', description: 'Histórico profissional' },
        { icon: GraduationCap, title: 'Educação', description: 'Formação acadêmica' },
        { icon: BadgeCheck, title: 'Habilidades', description: 'Competências e validações' },
        { icon: LanguagesIcon, title: 'Idiomas', description: 'Nível e certificações' },
        { icon: Medal, title: 'Certificações', description: 'Títulos e links' },
        { icon: FolderGit2, title: 'Projetos', description: 'Projetos pessoais ou sociais' },
        { icon: Eye, title: 'Pré-visualização', description: 'Visualize e baixe seu currículo' }
    ];

    const progressPercent = Math.max(0, Math.min(100, (currentStep / (steps.length - 1)) * 100));

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, photo: file }
            });
            const url = URL.createObjectURL(file);
            setPhotoUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return url;
            });
        }
    };

    return (
        <section className="py-20 relative overflow-hidden bg-theme-base">

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                {/* Progress Steps */}
                <div className="mb-12 pt-16">
                    <div className="relative mb-8">
                        <div className="absolute left-0 right-0 top-6 h-0.5 bg-theme-surface-hover z-0" />
                        <div
                            className="absolute left-0 top-6 h-0.5 z-0"
                            style={{ width: progressPercent + '%', backgroundColor: 'var(--color-primary)' }}
                        />
                        <div className="flex items-center justify-between relative z-10">
                            {steps.map((step, index) => (
                                <div key={index} className="flex flex-col items-center relative z-10">
                                    <motion.div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${index <= currentStep
                                            ? 'border-theme text-theme-inverted'
                                            : 'border-theme-muted text-theme-muted'
                                            }`}
                                        style={{
                                            backgroundColor: index <= currentStep ? 'var(--color-primary)' : 'transparent'
                                        }}
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <step.icon className="w-5 h-5" />
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-theme-primary mb-2">
                            {steps[currentStep].title}
                        </h3>
                        <p className="text-theme-secondary">
                            {steps[currentStep].description}
                        </p>
                    </div>
                </div>

                {/* Form Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-theme-surface/90 rounded-2xl p-8 backdrop-blur-sm border border-theme min-h-96"
                    >
                        {/* Step 0: Personal Info */}
                        {currentStep === 0 && (
                            <div className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.name}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                personalInfo: { ...formData.personalInfo, name: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.email}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                personalInfo: { ...formData.personalInfo, email: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Telefone
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder="(11) 91234-5678"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.phone}
                                            onChange={(e) => {
                                                const masked = formatPhoneBr(e.target.value);
                                                setFormData({
                                                    ...formData,
                                                    personalInfo: { ...formData.personalInfo, phone: masked }
                                                });
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-theme-secondary mb-2">
                                            Localização
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Cidade, Estado"
                                            className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                            value={formData.personalInfo.location}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                personalInfo: { ...formData.personalInfo, location: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                                        Foto Profissional
                                    </label>
                                    <div className="border-2 border-dashed border-theme rounded-lg p-6 text-center hover:border-opacity-80 transition-colors cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="photo-upload"
                                        />
                                        <label htmlFor="photo-upload" className="cursor-pointer">
                                            <Upload className="w-8 h-8 text-theme-muted mx-auto mb-2" />
                                            <p className="text-theme-muted">
                                                {formData.personalInfo.photo
                                                    ? `Arquivo: ${formData.personalInfo.photo.name}`
                                                    : 'Clique para fazer upload da sua foto'
                                                }
                                            </p>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-theme-secondary mb-2">
                                        Resumo Profissional
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Descreva brevemente sua trajetória e objetivos profissionais..."
                                        className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary resize-none"
                                        value={formData.personalInfo.summary}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            personalInfo: { ...formData.personalInfo, summary: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 1: Experiência */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">
                                    Experiência Profissional
                                </h3>

                                {formData.experience.map((exp, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme">
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Empresa
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={exp.company}
                                                    onChange={(e) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].company = e.target.value;
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Cargo
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={exp.position}
                                                    onChange={(e) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].position = e.target.value;
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-[auto_auto_1fr] items-end gap-3 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Início
                                                </label>
                                                <DatePicker
                                                    selected={parseMonth(exp.startDate)}
                                                    onChange={(date) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].startDate = storeMonth(date as Date | null);
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                    dateFormat="MM/yyyy"
                                                    showMonthYearPicker
                                                    locale="pt-BR"
                                                    maxDate={new Date()}
                                                    className="w-full md:w-[220px] px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    placeholderText="MM/AAAA"
                                                    calendarClassName="themed-datepicker"
                                                    popperClassName="themed-datepicker-popper"
                                                    showYearDropdown
                                                    dropdownMode='select'
                                                    yearDropdownItemNumber={50}
                                                    scrollableYearDropdown
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Fim
                                                </label>
                                                <DatePicker
                                                    selected={parseMonth(exp.endDate)}
                                                    onChange={(date) => {
                                                        const newExperience = [...formData.experience];
                                                        newExperience[index].endDate = storeMonth(date as Date | null);
                                                        setFormData({ ...formData, experience: newExperience });
                                                    }}
                                                    dateFormat="MM/yyyy"
                                                    showMonthYearPicker
                                                    locale="pt-BR"
                                                    maxDate={new Date()}
                                                    className="w-full md:w-[220px] px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary disabled:opacity-50"
                                                    placeholderText="MM/AAAA"
                                                    disabled={exp.current}
                                                    calendarClassName="themed-datepicker"
                                                    popperClassName="themed-datepicker-popper"
                                                    showYearDropdown
                                                    dropdownMode='select'
                                                    yearDropdownItemNumber={50}
                                                    scrollableYearDropdown
                                                />
                                            </div>
                                            <div className="flex items-center md:items-end md:pl-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-theme"
                                                        checked={exp.current}
                                                        onChange={(e) => {
                                                            const newExperience = [...formData.experience];
                                                            newExperience[index].current = e.target.checked;
                                                            if (e.target.checked) {
                                                                newExperience[index].endDate = '';
                                                            }
                                                            setFormData({ ...formData, experience: newExperience });
                                                        }}
                                                    />
                                                    <span className="text-sm text-theme-secondary">Trabalho atual</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                Descrição
                                            </label>
                                            <textarea
                                                rows={3}
                                                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary resize-none"
                                                value={exp.description}
                                                onChange={(e) => {
                                                    const newExperience = [...formData.experience];
                                                    newExperience[index].description = e.target.value;
                                                    setFormData({ ...formData, experience: newExperience });
                                                }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => {
                                                const newExperience = formData.experience.filter((_, i) => i !== index);
                                                setFormData({ ...formData, experience: newExperience });
                                            }}
                                            className="mt-4 text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover experiência
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const newExperience = [...formData.experience, {
                                            company: '',
                                            position: '',
                                            startDate: '',
                                            endDate: '',
                                            current: false,
                                            description: ''
                                        }];
                                        setFormData({ ...formData, experience: newExperience });
                                    }}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Experiência
                                </button>
                            </div>
                        )}

                        {/* Step 2: Educação */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">
                                    Educação
                                </h3>

                                {formData.education.map((edu, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme">
                                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Instituição
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={edu.institution}
                                                    onChange={(e) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].institution = e.target.value;
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Curso/Diploma
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={edu.degree}
                                                    onChange={(e) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].degree = e.target.value;
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                Área de Estudo
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                value={edu.field}
                                                onChange={(e) => {
                                                    const newEducation = [...formData.education];
                                                    newEducation[index].field = e.target.value;
                                                    setFormData({ ...formData, education: newEducation });
                                                }}
                                            />
                                        </div>

                                        <div className="grid md:grid-cols-[auto_auto_1fr] items-end gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Início
                                                </label>
                                                <DatePicker
                                                    selected={parseMonth(edu.startDate)}
                                                    onChange={(date) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].startDate = storeMonth(date as Date | null);
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                    dateFormat="MM/yyyy"
                                                    showMonthYearPicker
                                                    locale="pt-BR"
                                                    maxDate={new Date()}
                                                    className="w-full md:w-[220px] px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    placeholderText="MM/AAAA"
                                                    calendarClassName="themed-datepicker"
                                                    popperClassName="themed-datepicker-popper"
                                                    showYearDropdown
                                                    dropdownMode='select'
                                                    yearDropdownItemNumber={50}
                                                    scrollableYearDropdown
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">
                                                    Data de Conclusão
                                                </label>
                                                <DatePicker
                                                    selected={parseMonth(edu.endDate)}
                                                    onChange={(date) => {
                                                        const newEducation = [...formData.education];
                                                        newEducation[index].endDate = storeMonth(date as Date | null);
                                                        setFormData({ ...formData, education: newEducation });
                                                    }}
                                                    dateFormat="MM/yyyy"
                                                    showMonthYearPicker
                                                    locale="pt-BR"
                                                    maxDate={new Date()}
                                                    className="w-full md:w-[220px] px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary disabled:opacity-50"
                                                    placeholderText="MM/AAAA"
                                                    disabled={edu.current}
                                                    calendarClassName="themed-datepicker"
                                                    popperClassName="themed-datepicker-popper"
                                                    showYearDropdown
                                                    dropdownMode='select'
                                                    yearDropdownItemNumber={50}
                                                    scrollableYearDropdown
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-theme"
                                                        checked={edu.current}
                                                        onChange={(e) => {
                                                            const newEducation = [...formData.education];
                                                            newEducation[index].current = e.target.checked;
                                                            if (e.target.checked) {
                                                                newEducation[index].endDate = '';
                                                            }
                                                            setFormData({ ...formData, education: newEducation });
                                                        }}
                                                    />
                                                    <span className="text-sm text-theme-secondary">Em andamento</span>
                                                </label>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const newEducation = formData.education.filter((_, i) => i !== index);
                                                setFormData({ ...formData, education: newEducation });
                                            }}
                                            className="mt-4 text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover formação
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => {
                                        const newEducation = [...formData.education, {
                                            institution: '',
                                            degree: '',
                                            field: '',
                                            startDate: '',
                                            endDate: '',
                                            current: false
                                        }];
                                        setFormData({ ...formData, education: newEducation });
                                    }}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Formação
                                </button>
                            </div>
                        )}

                        {/* Step 3: Habilidades */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">Habilidades</h3>
                                {formData.skills.map((skill, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Habilidade</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={skill.name}
                                                    onChange={(e) => {
                                                        const skills = [...formData.skills];
                                                        skills[index].name = e.target.value;
                                                        setFormData({ ...formData, skills });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Nível</label>
                                                <div className="flex gap-2">
                                                    {[
                                                        { label: 'Iniciante', value: 25 },
                                                        { label: 'Intermediário', value: 60 },
                                                        { label: 'Avançado', value: 90 },
                                                    ].map((opt) => (
                                                        <button
                                                            key={opt.label}
                                                            type="button"
                                                            onClick={() => {
                                                                const skills = [...formData.skills];
                                                                skills[index].level = opt.value;
                                                                setFormData({ ...formData, skills });
                                                            }}
                                                            className={`px-3 py-2 rounded-lg text-sm border transition-colors ${skill.level === opt.value
                                                                ? 'btn-primary'
                                                                : 'bg-theme-surface text-theme-secondary border-theme hover:bg-theme-surface/60'
                                                                }`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, skills: formData.skills.filter((_, i) => i !== index) })}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover habilidade
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setFormData({ ...formData, skills: [...formData.skills, { name: '', level: 60 }] })}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Habilidade
                                </button>
                            </div>
                        )}

                        {/* Step 4: Idiomas */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">Idiomas</h3>
                                {formData.languages.map((lang, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme space-y-4">
                                        <div className="grid md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Idioma</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Inglês, Espanhol"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={lang.name}
                                                    onChange={(e) => {
                                                        const languages = [...formData.languages];
                                                        languages[index].name = e.target.value;
                                                        setFormData({ ...formData, languages });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Nível</label>
                                                <select
                                                    className="w-full px-4 py-3 border border-theme rounded-lg bg-theme-surface text-theme-primary"
                                                    value={lang.level}
                                                    onChange={(e) => {
                                                        const languages = [...formData.languages];
                                                        languages[index].level = e.target.value as Language['level'];
                                                        setFormData({ ...formData, languages });
                                                    }}
                                                >
                                                    <option value="Básico">Básico</option>
                                                    <option value="Intermediário">Intermediário</option>
                                                    <option value="Avançado">Avançado</option>
                                                    <option value="Fluente">Fluente</option>
                                                    <option value="Nativo">Nativo</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Certificação (opcional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: TOEFL 110, IELTS 7.5, DELE B2"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={lang.certification || ''}
                                                    onChange={(e) => {
                                                        const languages = [...formData.languages];
                                                        languages[index].certification = e.target.value;
                                                        setFormData({ ...formData, languages });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Observações (opcional)</label>
                                            <input
                                                type="text"
                                                placeholder="Contexto de uso: trabalho, intercâmbio, conversação diária..."
                                                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                value={lang.notes || ''}
                                                onChange={(e) => {
                                                    const languages = [...formData.languages];
                                                    languages[index].notes = e.target.value;
                                                    setFormData({ ...formData, languages });
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, languages: formData.languages.filter((_, i) => i !== index) })}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover idioma
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setFormData({ ...formData, languages: [...formData.languages, { name: '', level: 'Intermediário', certification: '', notes: '' }] })}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Idioma
                                </button>
                            </div>
                        )}

                        {/* Step 5: Certificações */}
                        {currentStep === 5 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">Certificações</h3>
                                {formData.certifications.map((cert, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Título</label>
                                                <input
                                                    type="text"
                                                    placeholder="Nome da certificação"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={cert.title}
                                                    onChange={(e) => {
                                                        const certifications = [...formData.certifications];
                                                        certifications[index].title = e.target.value;
                                                        setFormData({ ...formData, certifications });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Link (opcional)</label>
                                                <input
                                                    type="url"
                                                    placeholder="https://..."
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={cert.link || ''}
                                                    onChange={(e) => {
                                                        const certifications = [...formData.certifications];
                                                        certifications[index].link = e.target.value;
                                                        setFormData({ ...formData, certifications });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, certifications: formData.certifications.filter((_, i) => i !== index) })}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover certificação
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setFormData({ ...formData, certifications: [...formData.certifications, { title: '', link: '' }] })}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Certificação
                                </button>
                            </div>
                        )}

                        {/* Step 6: Projetos */}
                        {currentStep === 6 && (
                            <div className="space-y-6">
                                <h3 className="text-2xl font-bold text-theme-primary mb-6">Projetos</h3>
                                {formData.projects.map((proj, index) => (
                                    <div key={index} className="bg-theme-surface/50 p-6 rounded-lg border border-theme space-y-4">
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Título</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                    value={proj.title}
                                                    onChange={(e) => {
                                                        const projects = [...formData.projects];
                                                        projects[index].title = e.target.value;
                                                        setFormData({ ...formData, projects });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-theme-secondary mb-2">Tipo</label>
                                                <select
                                                    className="w-full px-4 py-3 border border-theme rounded-lg bg-theme-surface text-theme-primary"
                                                    value={proj.type || 'Pessoal'}
                                                    onChange={(e) => {
                                                        const projects = [...formData.projects];
                                                        projects[index].type = e.target.value as Project['type'];
                                                        setFormData({ ...formData, projects });
                                                    }}
                                                >
                                                    <option value="Pessoal">Pessoal</option>
                                                    <option value="Social">Social</option>
                                                    <option value="Outro">Outro</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Descrição</label>
                                            <textarea
                                                rows={3}
                                                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary resize-none"
                                                value={proj.description}
                                                onChange={(e) => {
                                                    const projects = [...formData.projects];
                                                    projects[index].description = e.target.value;
                                                    setFormData({ ...formData, projects });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Link (opcional)</label>
                                            <input
                                                type="url"
                                                placeholder="https://..."
                                                className="w-full px-4 py-3 border border-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-theme-surface text-theme-primary"
                                                value={proj.link || ''}
                                                onChange={(e) => {
                                                    const projects = [...formData.projects];
                                                    projects[index].link = e.target.value;
                                                    setFormData({ ...formData, projects });
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setFormData({ ...formData, projects: formData.projects.filter((_, i) => i !== index) })}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover projeto
                                        </button>
                                    </div>
                                ))}

                                <button
                                    onClick={() => setFormData({ ...formData, projects: [...formData.projects, { title: '', description: '', type: 'Pessoal', link: '' }] })}
                                    className="w-full py-3 border-2 border-dashed border-theme rounded-lg text-theme-secondary hover:bg-theme-surface/50 transition-colors"
                                >
                                    + Adicionar Projeto
                                </button>
                            </div>
                        )}

                        {/* Step 7: Pré-visualização */}
                        {currentStep === 7 && (
                            <div className="py-6">
                                <div className="grid gap-8 lg:grid-cols-[320px_1fr] items-start">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Cor primária</label>
                                            <input type="color" value={themeColors.primary} onChange={(e) => setThemeColors({ ...themeColors, primary: e.target.value })} className="h-10 w-20 p-0 bg-transparent border border-theme rounded" />
                                        </div>
                                        {/* Removido seletor de cor de destaque da foto para simplificar */}
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Cor do texto do cabeçalho</label>
                                            <input type="color" value={themeColors.headerText} onChange={(e) => setThemeColors({ ...themeColors, headerText: e.target.value })} className="h-10 w-20 p-0 bg-transparent border border-theme rounded" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Formato da foto</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { label: 'Quadrado', value: 'quadrado' },
                                                    { label: 'Redondo', value: 'redondo' },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setPhotoShape(opt.value as 'quadrado' | 'redondo')}
                                                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${photoShape === opt.value
                                                            ? 'btn-primary'
                                                            : 'bg-theme-surface text-theme-secondary border-theme hover:bg-theme-surface/60'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Fonte do Currículo</label>
                                            <select
                                                className="w-full px-4 py-3 border border-theme rounded-lg bg-theme-surface text-theme-primary"
                                                value={fontFamily}
                                                onChange={(e) => setFontFamily(e.target.value as typeof fontFamily)}
                                            >
                                                <option value="sans">Moderna (Inter / IBM Plex Sans)</option>
                                                <option value="humanist">Sans clássica (Helvetica / Calibri)</option>
                                                <option value="serif">Serif profissional (Cambria / Garamond)</option>
                                            </select>
                                            <p className="text-xs text-theme-muted mt-2">Dica: prefira cores moderadas e fontes simples para manter um tom profissional. Evite contrastes baixos e saturações muito fortes.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Densidade</label>
                                            <div className="flex gap-2">
                                                {['comfortable', 'compact'].map(v => (
                                                    <button key={v} type="button" onClick={() => setDensity(v as typeof density)}
                                                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${density === v ? 'btn-primary' : 'bg-theme-surface text-theme-secondary border-theme hover:bg-theme-surface/60'}`}
                                                    >{v === 'comfortable' ? 'Confortável' : 'Compacto'}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Layout do cabeçalho</label>
                                            <div className="flex gap-2">
                                                {[
                                                    { label: 'Foto à esquerda', value: 'left' },
                                                    { label: 'Foto à direita', value: 'right' },
                                                ].map(opt => (
                                                    <button key={opt.value} type="button" onClick={() => setHeaderLayout(opt.value as 'left' | 'right')}
                                                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${headerLayout === opt.value ? 'btn-primary' : 'bg-theme-surface text-theme-secondary border-theme hover:bg-theme-surface/60'}`}
                                                    >{opt.label}</button>
                                                ))}
                                            </div>
                                            <label className="mt-3 inline-flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
                                                <input type="checkbox" className="rounded border-theme" checked={showHeaderDivider} onChange={(e) => setShowHeaderDivider(e.target.checked)} />
                                                Linha divisória sob o cabeçalho
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Divisores e bullets</label>
                                            <label className="flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
                                                <input type="checkbox" className="rounded border-theme" checked={showSectionDividers} onChange={(e) => setShowSectionDividers(e.target.checked)} />
                                                Mostrar divisores finos nas seções
                                            </label>
                                            <label className="mt-2 flex items-center gap-2 text-sm text-theme-secondary cursor-pointer">
                                                <input type="checkbox" className="rounded border-theme" checked={bulletizeDescriptions} onChange={(e) => setBulletizeDescriptions(e.target.checked)} />
                                                Descrição da experiência como bullets
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-theme-secondary mb-2">Ordem das seções</label>
                                            <DragDropContext onDragEnd={onDragEnd}>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Droppable droppableId="left">
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...provided.droppableProps} className="border border-theme rounded-lg p-2 bg-theme-surface">
                                                                <div className="text-xs text-theme-muted mb-2">Coluna esquerda</div>
                                                                {leftOrder.map((k, idx) => (
                                                                    <Draggable key={k} draggableId={`left-${k}`} index={idx}>
                                                                        {(p, snapshot) => {
                                                                            const node = (
                                                                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                                                                    className="px-3 py-2 mb-2 last:mb-0 rounded border border-theme bg-theme-surface-hover text-sm text-theme-primary">
                                                                                    {k === 'skills' ? 'Habilidades' : k === 'languages' ? 'Idiomas' : k === 'experience' ? 'Experiência' : k === 'education' ? 'Educação' : k === 'projects' ? 'Projetos' : 'Certificações'}
                                                                                </div>
                                                                            );
                                                                            return snapshot.isDragging ? ReactDOM.createPortal(node, document.body) : node;
                                                                        }}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                    <Droppable droppableId="right">
                                                        {(provided) => (
                                                            <div ref={provided.innerRef} {...provided.droppableProps} className="border border-theme rounded-lg p-2 bg-theme-surface">
                                                                <div className="text-xs text-theme-muted mb-2">Coluna direita</div>
                                                                {rightOrder.map((k, idx) => (
                                                                    <Draggable key={k} draggableId={`right-${k}`} index={idx}>
                                                                        {(p, snapshot) => {
                                                                            const node = (
                                                                                <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                                                                                    className="px-3 py-2 mb-2 last:mb-0 rounded border border-theme bg-theme-surface-hover text-sm text-theme-primary">
                                                                                    {k === 'skills' ? 'Habilidades' : k === 'languages' ? 'Idiomas' : k === 'experience' ? 'Experiência' : k === 'education' ? 'Educação' : k === 'projects' ? 'Projetos' : 'Certificações'}
                                                                                </div>
                                                                            );
                                                                            return snapshot.isDragging ? ReactDOM.createPortal(node, document.body) : node;
                                                                        }}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </div>
                                            </DragDropContext>
                                        </div>
                                        <p className="text-sm text-theme-muted">Pré-visualize as cores antes de baixar o PDF.</p>
                                        <button onClick={generatePDF} className="btn-primary px-6 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2">
                                            <Download className="w-4 h-4" /> Baixar PDF
                                        </button>
                                    </div>
                                    <div className="bg-white rounded-xl border border-theme overflow-hidden">
                                        <div className="bg-theme-surface px-4 py-2 text-sm text-theme-secondary border-b border-theme">Pré-visualização</div>
                                        <div ref={viewportRef} className="overflow-auto p-2 relative">
                                            <div style={{ width: 794 * scale, height: 1123 * scale, position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                                    <ResumePreview
                                                        ref={previewRef}
                                                        data={{
                                                            personalInfo: {
                                                                name: formData.personalInfo.name,
                                                                email: formData.personalInfo.email,
                                                                phone: formData.personalInfo.phone,
                                                                location: formData.personalInfo.location,
                                                                summary: formData.personalInfo.summary,
                                                            },
                                                            experience: formData.experience,
                                                            education: formData.education,
                                                            skills: formData.skills,
                                                            languages: formData.languages,
                                                            certifications: formData.certifications,
                                                            projects: formData.projects,
                                                        }}
                                                        colors={themeColors}
                                                        photoSrc={photoUrl}
                                                        photoShape={photoShape}
                                                        fontFamily={fontFamily}
                                                        density={density}
                                                        headerLayout={headerLayout}
                                                        showHeaderDivider={showHeaderDivider}
                                                        showSectionDividers={showSectionDividers}
                                                        bulletizeDescriptions={bulletizeDescriptions}
                                                        leftOrder={leftOrder}
                                                        rightOrder={rightOrder}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ position: 'absolute', left: -10000, top: 0 }}>
                                                <ResumePreview
                                                    ref={printRef}
                                                    data={{
                                                        personalInfo: {
                                                            name: formData.personalInfo.name,
                                                            email: formData.personalInfo.email,
                                                            phone: formData.personalInfo.phone,
                                                            location: formData.personalInfo.location,
                                                            summary: formData.personalInfo.summary,
                                                        },
                                                        experience: formData.experience,
                                                        education: formData.education,
                                                        skills: formData.skills,
                                                        languages: formData.languages,
                                                        certifications: formData.certifications,
                                                        projects: formData.projects,
                                                    }}
                                                    colors={themeColors}
                                                    photoSrc={photoUrl}
                                                    photoShape={photoShape}
                                                    fontFamily={fontFamily}
                                                    density={density}
                                                    headerLayout={headerLayout}
                                                    showHeaderDivider={showHeaderDivider}
                                                    showSectionDividers={showSectionDividers}
                                                    bulletizeDescriptions={bulletizeDescriptions}
                                                    leftOrder={leftOrder}
                                                    rightOrder={rightOrder}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold ${currentStep === 0
                            ? 'bg-theme-muted/20 text-theme-muted cursor-not-allowed'
                            : 'bg-theme-surface text-theme-primary border border-theme hover:bg-theme-surface/80'
                            } transition-all duration-300`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={currentStep === steps.length - 1}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold ${currentStep === steps.length - 1
                            ? 'bg-theme-muted/20 text-theme-muted cursor-not-allowed'
                            : 'btn-primary hover:shadow-lg'
                            } transition-all duration-300`}
                    >
                        Próximo
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </section>
    );
};
