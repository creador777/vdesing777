'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';

const G = '#39FF8B';
const P = '#A855F7';
const BG = '#08080d';
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Inter', system-ui, sans-serif";

const DEADLINE = new Date('2026-05-30T23:59:59');

function useCountdown() {
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, DEADLINE.getTime() - Date.now());
      setLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function ModelViewer({ src, style, ...props }: { src: string; style?: React.CSSProperties; [k: string]: unknown }) {
  useEffect(() => {
    if (document.querySelector('script[data-mvs]')) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';
    s.dataset.mvs = '1';
    document.head.appendChild(s);
  }, []);
  // @ts-ignore
  return <model-viewer src={src} style={style} suppressHydrationWarning {...props} />;
}

// ─── road canvas: perspective path toward viewer ──────────────────────────────
function RoadCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const dashes = Array.from({ length: 8 }, (_, i) => ({ p: 1 - i / 8 }));
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      const vpX = W / 2;
      const vpY = H * 0.30;
      const halfRoad = W * 0.32;

      ctx.beginPath();
      ctx.moveTo(vpX, vpY);
      ctx.lineTo(vpX - halfRoad, H);
      ctx.lineTo(vpX + halfRoad, H);
      ctx.closePath();
      ctx.fillStyle = 'rgba(4, 12, 8, 0.45)';
      ctx.fill();

      for (const sign of [-1, 1]) {
        const grd = ctx.createLinearGradient(vpX, vpY, vpX + sign * halfRoad, H);
        grd.addColorStop(0,   'rgba(57,255,139,0)');
        grd.addColorStop(0.5, 'rgba(57,255,139,0.14)');
        grd.addColorStop(1,   'rgba(57,255,139,0.30)');
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(vpX + sign * halfRoad, H);
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      for (const d of dashes) {
        d.p -= dt * (0.05 + d.p * 0.38);
        if (d.p < 0.02) d.p = 1.0;
        if (d.p < 0.06) continue;

        const y     = vpY + (H - vpY) * d.p;
        const dashH = (H - vpY) * 0.05 * d.p;
        const lw    = d.p * 2.5;
        const alpha = Math.min(d.p * 0.55, 0.45);
        const sideX = halfRoad * d.p * 0.78;

        ctx.strokeStyle = `rgba(57,255,139,${alpha})`;
        ctx.lineWidth   = lw;
        ctx.lineCap     = 'round';

        for (const sign of [-1, 1]) {
          const x = vpX + sign * sideX;
          ctx.beginPath();
          ctx.moveTo(x, y - dashH * 0.5);
          ctx.lineTo(x, y + dashH * 0.5);
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    />
  );
}

function AvatarWalkScene() {
  return (
    <div id="avatar-scene" style={{
      width: 'clamp(280px, 50vw, 620px)',
      height: 'clamp(360px, 62vw, 740px)',
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
      marginLeft: 'auto',
      marginRight: 'auto',
    }}>
      <RoadCanvas />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: 'linear-gradient(transparent, #08080d)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #08080d 0%, transparent 20%, transparent 80%, #08080d 100%)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 40% at 50% 60%, ${G}0d 0%, transparent 70%)`, pointerEvents: 'none', zIndex: 1 }} />
      <ModelViewer
        src="/models/chibi-animated.glb"
        autoplay
        animation-name="Idle_9"
        camera-orbit="0deg 88deg 5m"
        camera-target="0m 0.5m 0m"
        style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }}
        disable-zoom
        interaction-prompt="none"
      />
    </div>
  );
}

function PageLoader() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    const hide = () => {
      setPhase('fading');
      setTimeout(() => setPhase('gone'), 600);
    };
    if (document.readyState === 'complete') {
      setTimeout(hide, 300);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 300), { once: true });
    }
  }, []);

  if (phase === 'gone') return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: BG,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 32,
      opacity: phase === 'fading' ? 0 : 1,
      transition: 'opacity 0.6s ease',
      pointerEvents: phase === 'fading' ? 'none' : 'all',
    }}>
      <style>{`
        @keyframes bar-fill { from { width: 0% } to { width: 100% } }
        @keyframes dot-blink {
          0%,100% { opacity: 0.2; transform: scaleY(0.5); }
          50%      { opacity: 1;   transform: scaleY(1); }
        }
      `}</style>
      <div style={{ fontFamily: SERIF, fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#e6e6ee', letterSpacing: '-0.01em' }}>
        V<span style={{ color: G }}>Desing</span>
      </div>
      <div style={{ width: 180, height: 1.5, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          background: `linear-gradient(90deg, ${G}, ${P})`,
          boxShadow: `0 0 10px ${G}`,
          animation: 'bar-fill 1.4s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 4, height: 12, borderRadius: 2,
            background: G,
            animation: `dot-blink 0.9s ${i * 0.15}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── translations ─────────────────────────────────────────────────────────────
const T = {
  es: {
    nav:        'VDesing — Webs 3D PR',
    quote:      'COTIZAR →',
    badge:      'PUERTO RICO · LATAM · DESDE\n$100/MES O $680 PAGO ÚNICO',
    h1a:        'Tu negocio en una',
    h1b:        'web profesional',
    h1c:        'que vende',
    sub:        'Diseño, desarrollo, logo, video, fotos — todo bajo un mismo techo. Tu competencia tiene un template de Wix. Tú tienes una experiencia que convierte.',
    pkgBtn:     'VER PAQUETES ↓',
    demoBtn:    'Demo 3D en vivo',
    why1t:      'Precios reales',          why1b: 'Basados en el mercado de PR 2026. El básico ($680) entra fácil para un negocio que está empezando, sin sacrificar calidad.',
    why2t:      'Solo tú haces 3D en PR',  why2b: 'Ningún freelancer local ofrece experiencias en Three.js / WebGL. Es tu diferenciador único en la isla.',
    why3t:      'Un equipo, todo cubierto',why3b: 'Logo, fotos, video, web, WhatsApp — coordinado por una sola persona. Sin subcontratos, sin mensajes perdidos.',
    pkgTitle:   'Escoge tu punto de entrada',
    basicName:  'Básico',                  basicDesc: 'Todo lo esencial para arrancar',
    proName:    'Pro',                     proDesc:   'Para negocios que quieren escalar',
    monthTitle: 'O paga mensual sin estrés',
    calcTitle:  'Calcula según tus necesidades',
    calcSub:    'Selecciona lo que necesitas — el total se actualiza en tiempo real',
    consultBadge: 'PRIMERA CONSULTA GRATIS',
    consultH:   '20 minutos. Sin compromiso.',
    consultSub: 'Hablamos, veo tu negocio, y te digo honestamente si una página web es una buena inversión para ti ahora mismo.',
    consultBtn: 'WHATSAPP → CONSULTA GRATIS',
    worksTitle: 'Proyectos que ya están funcionando',
    worksBadge: 'Trabajos reales',
    viewSite:   'Ver sitio →',
    privateDemo:'Demo privada',
    footerDesc: 'Diseño y desarrollo web en Puerto Rico.\nExperiencias digitales que venden.',
    footerSvc:  'Servicios',
    footerContact: 'Contacto',
    privacy:    'Privacidad',
    terms:      'Términos',
    rights:     'Todos los derechos reservados',
    // urgency bar
    urgencyLabel: 'Oferta limitada',
    urgencyOffer: 'Tu página web — $60/mes',
    urgencyDays: 'días', urgencyHrs: 'hrs', urgencyMin: 'min', urgencySec: 'seg',
    urgencyCTA: 'Quiero esto →',
    urgencyWA: 'Hola%20Victor,%20vi%20la%20oferta%20de%20$60/mes%20y%20quiero%20aprovecharla',
    // packages section
    pkgsBadge:   'Paquetes — pago único',
    pkgsNote:    'Dale clic para seleccionar — luego personaliza abajo con el calculador',
    pkgsPayment: 'Pago 50% al inicio · 50% en entrega · Precios en USD',
    popular:     'Más popular',
    // monthly plans
    monthBadge:  '¿Prefieres pagar mensual?',
    monthHeadline:'Tu sitio desde',
    monthDesc:   'Pagas mensual, nosotros mantenemos todo activo — hosting, soporte, updates incluidos. Cancelas cuando quieras, sin contratos largos.',
    monthCTA:    'Empezar →',
    monthNote:   'Sin contrato mínimo · Si cancelas, el dominio es tuyo · Setup inicial incluido',
    // plan names & items
    planStarter: 'Starter',
    planNegocio: 'Negocio',
    planProfesional: 'Profesional',
    starterItems: ['Landing page (1 página)', 'Hosting incluido', 'Botón WhatsApp', 'Soporte por WhatsApp'],
    negocioItems: ['Hasta 3 páginas', 'Formulario + citas básicas', 'Updates mensuales', 'Soporte prioritario'],
    profesionalItems: ['Hasta 5 páginas', 'Logo incluido', 'SEO básico activo', 'Video corto (30s)', 'Reportes mensuales'],
    // calculator
    calcBadge:   'Calculadora en tiempo real',
    calcHeadline:'Calcula según lo que necesitas',
    calcLongDesc:'Selecciona los servicios que necesitas. El total se actualiza al instante.\nDesde un negocio pequeño hasta una empresa con presupuesto completo.',
    quoteLabel:  'Cotización estimada',
    quoteEmpty:  '— elegí un paquete para empezar',
    quoteSend:   'Enviar cotización →',
    forSmall:    'Para cualquier negocio',
    forPro:      'Para empresas con presupuesto',
    forProNote:  'Estos servicios son para proyectos más grandes. Si estás empezando, no los necesitas ahora.',
    // addon categories
    catDiseno:   'Diseño',
    catVideo:    'Video & Contenido',
    catFunc:     'Funcionalidad',
    catPremium:  'Premium',
    // floating chat
    chatAvailable: 'Disponible ahora',
    chatMessage:   'Hola, soy Victor. ¿En qué puedo ayudarte hoy? Escríbeme directo por WhatsApp y te respondo en minutos.',
    chatOpen:      'Abrir WhatsApp →',
    chatWA:        'Hola%20Victor,%20tengo%20una%20pregunta%20sobre%20tus%20servicios',
    // portfolio projects
    projects: [
      { name: 'Corta-Pelo',     cat: 'Barbería · Reservas · WhatsApp Bot',  desc: 'Sistema de citas automatizado por WhatsApp para barbería. El cliente reserva, recibe confirmación y recordatorio sin intervención humana.' },
      { name: 'IslaValora',     cat: 'Bienes Raíces · Tours 360°',           desc: 'Plataforma inmobiliaria con tours virtuales 360° integrados. Los compradores recorren las propiedades desde el celular.' },
      { name: 'Samuray Tattoo', cat: 'Estudio de Tatuajes · Galería',        desc: 'Sitio premium para estudio de tatuajes con galería de trabajos, sistema de citas y presencia en Google.' },
      { name: 'Reyes Gas',      cat: 'Delivery · Propano · Caguas',          desc: 'Sitio web para empresa de entrega de gas propano. Pedidos en línea, zonas de cobertura y contacto directo.' },
      { name: 'IglesIA',        cat: 'Iglesia · App · Comunidad',            desc: 'Plataforma digital para comunidad de fe — transmisiones, anuncios, directorio y app móvil integrada.' },
      { name: 'Ymusic',         cat: 'Música · Streaming · Artista',         desc: 'Sitio web para artista musical con integración de plataformas de streaming, galería y agenda de eventos.' },
      { name: 'ARCScribe',      cat: 'Herramienta · Símbolos · Tipografía',  desc: 'Acceso a símbolos Unicode oscuros y premium. Glifos aesthetic para bio y redes sociales, con copiado instantáneo.' },
    ],
    // footer services list
    footerServices: ['Página web', 'Diseño de logo', 'Tienda online', 'WhatsApp Bot', 'Escena 3D'],
  },
  en: {
    nav:        'VDesing — 3D Webs PR',
    quote:      'GET A QUOTE →',
    badge:      'PUERTO RICO · LATAM · FROM\n$100/MO OR $680 ONE-TIME',
    h1a:        'Your business on a',
    h1b:        'professional web',
    h1c:        'that sells',
    sub:        'Design, development, logo, video, photos — all under one roof. Your competition has a Wix template. You get an experience that converts.',
    pkgBtn:     'SEE PACKAGES ↓',
    demoBtn:    'Live 3D Demo',
    why1t:      'Real prices',                   why1b: 'Based on the PR 2026 market. The basic plan ($680) is accessible for a starting business without sacrificing quality.',
    why2t:      'Only you do 3D in PR',          why2b: 'No local freelancer offers Three.js / WebGL experiences. That is your unique differentiator on the island.',
    why3t:      'One team, everything covered',  why3b: 'Logo, photos, video, web, WhatsApp — coordinated by one person. No subcontracting, no lost messages.',
    pkgTitle:   'Choose your starting point',
    basicName:  'Basic',                         basicDesc: 'Everything essential to get started',
    proName:    'Pro',                           proDesc:   'For businesses that want to scale',
    monthTitle: 'Or pay monthly, stress-free',
    calcTitle:  'Calculate for your needs',
    calcSub:    'Select what you need — the total updates in real time',
    consultBadge: 'FIRST CONSULTATION FREE',
    consultH:   '20 minutes. No commitment.',
    consultSub: 'We talk, I look at your business, and I honestly tell you if a website is a good investment for you right now.',
    consultBtn: 'WHATSAPP → FREE CONSULTATION',
    worksTitle: 'Projects already live',
    worksBadge: 'Real work',
    viewSite:   'View site →',
    privateDemo:'Private demo',
    footerDesc: 'Web design and development in Puerto Rico.\nDigital experiences that sell.',
    footerSvc:  'Services',
    footerContact: 'Contact',
    privacy:    'Privacy',
    terms:      'Terms',
    rights:     'All rights reserved',
    // urgency bar
    urgencyLabel: 'Limited offer',
    urgencyOffer: 'Your website — $60/mo',
    urgencyDays: 'days', urgencyHrs: 'hrs', urgencyMin: 'min', urgencySec: 'sec',
    urgencyCTA: 'I want this →',
    urgencyWA: 'Hi%20Victor,%20I%20saw%20the%20%2460/mo%20offer%20and%20want%20to%20take%20it',
    // packages section
    pkgsBadge:   'Packages — one-time payment',
    pkgsNote:    'Click to select — then customize below with the calculator',
    pkgsPayment: '50% upfront · 50% on delivery · Prices in USD',
    popular:     'Most popular',
    // monthly plans
    monthBadge:  'Prefer to pay monthly?',
    monthHeadline:'Your site from',
    monthDesc:   'Pay monthly, we keep everything running — hosting, support, updates included. Cancel anytime, no long contracts.',
    monthCTA:    'Get started →',
    monthNote:   'No minimum contract · If you cancel, the domain is yours · Setup included',
    // plan names & items
    planStarter: 'Starter',
    planNegocio: 'Business',
    planProfesional: 'Professional',
    starterItems: ['Landing page (1 page)', 'Hosting included', 'WhatsApp button', 'WhatsApp support'],
    negocioItems: ['Up to 3 pages', 'Contact form + basic booking', 'Monthly updates', 'Priority support'],
    profesionalItems: ['Up to 5 pages', 'Logo included', 'Basic SEO active', 'Short video (30s)', 'Monthly reports'],
    // calculator
    calcBadge:   'Real-time calculator',
    calcHeadline:'Calculate for your needs',
    calcLongDesc:'Select the services you need. The total updates instantly.\nFrom a small business to a company with a full budget.',
    quoteLabel:  'Estimated quote',
    quoteEmpty:  '— choose a package to start',
    quoteSend:   'Send quote →',
    forSmall:    'For any business',
    forPro:      'For businesses with budget',
    forProNote:  'These services are for larger projects. If you are just starting out, you do not need them yet.',
    // addon categories
    catDiseno:   'Design',
    catVideo:    'Video & Content',
    catFunc:     'Functionality',
    catPremium:  'Premium',
    // floating chat
    chatAvailable: 'Available now',
    chatMessage:   'Hi, I am Victor. How can I help you today? Write to me directly on WhatsApp and I will reply in minutes.',
    chatOpen:      'Open WhatsApp →',
    chatWA:        'Hi%20Victor,%20I%20have%20a%20question%20about%20your%20services',
    // portfolio projects
    projects: [
      { name: 'Corta-Pelo',     cat: 'Barbershop · Booking · WhatsApp Bot',  desc: 'Automated WhatsApp booking system for a barbershop. Clients book, receive confirmation and reminders without any human intervention.' },
      { name: 'IslaValora',     cat: 'Real Estate · 360° Tours',             desc: 'Real estate platform with integrated 360° virtual tours. Buyers explore properties from their phone.' },
      { name: 'Samuray Tattoo', cat: 'Tattoo Studio · Gallery',              desc: 'Premium tattoo studio site with a work gallery, booking system, and Google presence.' },
      { name: 'Reyes Gas',      cat: 'Delivery · Propane · Caguas',          desc: 'Website for a propane delivery company. Online orders, coverage zones, and direct contact.' },
      { name: 'IglesIA',        cat: 'Church · App · Community',             desc: 'Digital platform for a faith community — live streams, announcements, directory, and integrated mobile app.' },
      { name: 'Ymusic',         cat: 'Music · Streaming · Artist',           desc: 'Website for a music artist with streaming platform integration, gallery, and event schedule.' },
      { name: 'ARCScribe',      cat: 'Tool · Symbols · Typography',          desc: 'Access to obscure and premium Unicode symbols. Aesthetic glyphs for bios and social media, with instant copy.' },
    ],
    // footer services list
    footerServices: ['Website', 'Logo design', 'Online store', 'WhatsApp Bot', '3D Scene'],
  },
} as const;
type Lang = keyof typeof T;
type TType = typeof T[Lang];

// ─── packages ─────────────────────────────────────────────────────────────────
const BASIC_PRICE = 680;
const PRO_PRICE = 1280;

const BASIC_ITEMS_ES = [
  'Diseño web de una página (landing page)',
  'Responsive — funciona en celular y tablet',
  'Formulario de contacto + botón WhatsApp',
  'Dominio + hosting primer año incluido',
  'SSL + velocidad optimizada',
  '1 ronda de revisiones',
  'Entrega en 5-7 días',
];
const BASIC_ITEMS_EN = [
  'Single-page web design (landing page)',
  'Responsive — works on mobile and tablet',
  'Contact form + WhatsApp button',
  'Domain + hosting first year included',
  'SSL + speed optimized',
  '1 revision round',
  'Delivered in 5-7 days',
];

const PRO_ITEMS_ES = [
  'Todo lo del paquete básico',
  '2 páginas adicionales (total 3 páginas)',
  'Diseño de logo (2 conceptos + revisiones)',
  'Edición profesional de hasta 10 fotos',
  'Video promo de 60s (calidad de estudio, AI-enhanced)',
  'Integración WhatsApp Business',
  'SEO básico (Google indexing + metas)',
  '2 rondas de revisiones',
  'Entrega en 10-14 días',
];
const PRO_ITEMS_EN = [
  'Everything in the Basic package',
  '2 additional pages (3 total)',
  'Logo design (2 concepts + revisions)',
  'Professional editing of up to 10 photos',
  '60s promo video (studio quality, AI-enhanced)',
  'WhatsApp Business integration',
  'Basic SEO (Google indexing + meta tags)',
  '2 revision rounds',
  'Delivered in 10-14 days',
];

// ─── calculator add-ons ───────────────────────────────────────────────────────
type Addon = {
  id: string;
  label: string;
  sublabel: string;
  price: number;
  monthly?: boolean;
  category: string;
};

const ADDONS_ES: Addon[] = [
  { id: 'logo',        label: 'Identidad visual lista para usar',   sublabel: 'Logo en todos los formatos (SVG, PNG, fondo transparente)', price: 120, category: 'Diseño' },
  { id: 'brand-kit',  label: 'Marca completa lista para usar',      sublabel: 'Logo + paleta de colores + tipografía + guía de marca',    price: 320, category: 'Diseño' },
  { id: 'photos-10',  label: 'Fotos optimizadas para web — 10',     sublabel: 'Retoque, color, formato correcto para web y redes',         price: 60,  category: 'Diseño' },
  { id: 'photos-30',  label: 'Fotos optimizadas para web — 30',     sublabel: 'Retoque completo, consistencia visual en todo el set',      price: 80,  category: 'Diseño' },
  { id: 'social-kit', label: 'Kit visual para redes sociales',      sublabel: '10 templates de tu marca, editables, listos para publicar', price: 180, category: 'Diseño' },
  { id: 'video-30',   label: 'Video de tu negocio — 30s',           sublabel: 'Listo para Instagram, TikTok, WhatsApp',                   price: 150, category: 'Video & Contenido' },
  { id: 'video-60',   label: 'Video de tu negocio — 60s',           sublabel: 'Con música, subtítulos y tu marca integrada',              price: 280, category: 'Video & Contenido' },
  { id: 'video-90',   label: 'Video de tu negocio — 90s',           sublabel: 'Calidad de estudio, listo para cualquier plataforma',      price: 360, category: 'Video & Contenido' },
  { id: 'wa-bot',     label: 'WhatsApp Business bot',               sublabel: 'Respuestas auto + flujos de conversación',                 price: 680, category: 'Funcionalidad' },
  { id: 'citas',      label: 'Sistema de citas/reservas',           sublabel: 'Calendario + confirmación automática',                     price: 420, category: 'Funcionalidad' },
  { id: 'pagos',      label: 'Pagos en línea',                      sublabel: 'Stripe + PayPal + checkout completo',                      price: 480, category: 'Funcionalidad' },
  { id: 'ecom-basic', label: 'Tienda online — hasta 40 prod.',      sublabel: 'Catálogo + carrito + checkout',                            price: 950, category: 'Funcionalidad' },
  { id: 'ecom-pro',   label: 'Tienda online ilimitada',             sublabel: 'Sin límite de productos + filtros + admin',                price: 1450,category: 'Funcionalidad' },
  { id: 'blog',       label: 'Blog / CMS',                          sublabel: 'Panel propio para publicar artículos',                     price: 400, category: 'Funcionalidad' },
  { id: 'chat',       label: 'Chat en vivo',                        sublabel: 'Widget + notificaciones al celular',                       price: 240, category: 'Funcionalidad' },
  { id: '3d',         label: 'Escena 3D interactiva',               sublabel: 'Hero section inmersivo en Three.js',                       price: 1500,category: 'Premium' },
  { id: 'tour360',    label: 'Tour virtual 360°',                   sublabel: 'Recorrido del local desde el sitio',                       price: 750, category: 'Premium' },
  { id: 'extra-page', label: 'Página adicional',                    sublabel: 'Por cada página extra al paquete',                         price: 160, category: 'Premium' },
  { id: 'email',      label: 'Email profesional',                   sublabel: 'info@tudominio.com configurado',                           price: 100, category: 'Premium' },
  { id: 'mant',       label: 'Mantenimiento mensual',               sublabel: 'Para paquete único — hosting + updates + soporte',         price: 100, monthly: true, category: 'Premium' },
];

const ADDONS_EN: Addon[] = [
  { id: 'logo',        label: 'Visual identity ready to use',        sublabel: 'Logo in all formats (SVG, PNG, transparent background)',   price: 120, category: 'Design' },
  { id: 'brand-kit',  label: 'Full brand kit ready to use',          sublabel: 'Logo + color palette + typography + brand guide',          price: 320, category: 'Design' },
  { id: 'photos-10',  label: 'Web-optimized photos — 10',            sublabel: 'Retouching, color correction, correct format for web',     price: 60,  category: 'Design' },
  { id: 'photos-30',  label: 'Web-optimized photos — 30',            sublabel: 'Full retouch, visual consistency across the entire set',   price: 80,  category: 'Design' },
  { id: 'social-kit', label: 'Social media visual kit',              sublabel: '10 branded templates, editable, ready to publish',        price: 180, category: 'Design' },
  { id: 'video-30',   label: 'Business video — 30s',                 sublabel: 'Ready for Instagram, TikTok, WhatsApp',                   price: 150, category: 'Video & Content' },
  { id: 'video-60',   label: 'Business video — 60s',                 sublabel: 'With music, subtitles, and your brand integrated',        price: 280, category: 'Video & Content' },
  { id: 'video-90',   label: 'Business video — 90s',                 sublabel: 'Studio quality, ready for any platform',                  price: 360, category: 'Video & Content' },
  { id: 'wa-bot',     label: 'WhatsApp Business bot',                sublabel: 'Auto replies + conversation flows',                       price: 680, category: 'Functionality' },
  { id: 'citas',      label: 'Booking / appointment system',         sublabel: 'Calendar + automatic confirmation',                       price: 420, category: 'Functionality' },
  { id: 'pagos',      label: 'Online payments',                      sublabel: 'Stripe + PayPal + full checkout',                         price: 480, category: 'Functionality' },
  { id: 'ecom-basic', label: 'Online store — up to 40 products',     sublabel: 'Catalog + cart + checkout',                               price: 950, category: 'Functionality' },
  { id: 'ecom-pro',   label: 'Unlimited online store',               sublabel: 'No product limit + filters + admin panel',                price: 1450,category: 'Functionality' },
  { id: 'blog',       label: 'Blog / CMS',                           sublabel: 'Your own dashboard to publish articles',                  price: 400, category: 'Functionality' },
  { id: 'chat',       label: 'Live chat',                            sublabel: 'Widget + mobile notifications',                           price: 240, category: 'Functionality' },
  { id: '3d',         label: 'Interactive 3D scene',                 sublabel: 'Immersive hero section in Three.js',                      price: 1500,category: 'Premium' },
  { id: 'tour360',    label: '360° virtual tour',                    sublabel: 'Walk-through of your location from the site',             price: 750, category: 'Premium' },
  { id: 'extra-page', label: 'Additional page',                      sublabel: 'For each extra page beyond the package',                  price: 160, category: 'Premium' },
  { id: 'email',      label: 'Professional email',                   sublabel: 'info@yourdomain.com configured',                          price: 100, category: 'Premium' },
  { id: 'mant',       label: 'Monthly maintenance',                  sublabel: 'One-time plan — hosting + updates + support',             price: 100, monthly: true, category: 'Premium' },
];

const fmt = (n: number) => n.toLocaleString('en-US');

// ─── sub-components ───────────────────────────────────────────────────────────
function UrgencyBar({ t }: { t: TType }) {
  const { d, h, m, s } = useCountdown();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.3,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57,255,139,${p.alpha})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(57,255,139,${0.12 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const total = d * 86400 + h * 3600 + m * 60 + s;
  const max = 7 * 86400;
  const pct = Math.min(1, total / max) * 100;

  return (
    <div style={{ position: 'fixed', top: 57, left: 0, right: 0, zIndex: 49, height: 52, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,13,0.82)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: G, boxShadow: `0 0 12px ${G}` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${pct}%`, height: 2, background: `linear-gradient(90deg, ${G}, #A855F7)`, boxShadow: `0 0 8px ${G}`, transition: 'width 1s linear' }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap', padding: '0 20px' }}>
        <div id="urgency-label" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          {t.urgencyLabel}
        </div>
        <div id="urgency-offer" style={{ fontFamily: SERIF, fontSize: 18, color: G, textShadow: `0 0 18px ${G}88`, fontStyle: 'italic' }}>
          {t.urgencyOffer}
        </div>
        <div id="urgency-countdown" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[{ v: pad(d), l: t.urgencyDays }, { v: pad(h), l: t.urgencyHrs }, { v: pad(m), l: t.urgencyMin }, { v: pad(s), l: t.urgencySec }].map(({ v, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '0.05em', textShadow: `0 0 10px rgba(255,255,255,0.4)` }}>{v}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{l}</div>
            </div>
          ))}
        </div>
        <a
          href={`https://wa.me/17879449031?text=${t.urgencyWA}`}
          target="_blank"
          rel="noreferrer"
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: BG, background: G, padding: '7px 18px', borderRadius: 3, textDecoration: 'none', fontWeight: 700, boxShadow: `0 0 14px ${G}66`, whiteSpace: 'nowrap' }}
        >
          {t.urgencyCTA}
        </a>
      </div>
    </div>
  );
}

function PackageCard({
  title, price, items, featured, color, onSelect, selected, popularLabel,
}: {
  title: string; price: number; items: string[]; featured?: boolean;
  color: string; onSelect: () => void; selected: boolean; popularLabel: string;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: `1px solid ${selected ? color : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12,
        padding: '32px 28px',
        background: selected ? `${color}0d` : 'transparent',
        cursor: 'pointer',
        position: 'relative',
        transition: 'border-color 0.2s, background 0.2s',
        boxShadow: selected ? `0 0 28px ${color}22` : 'none',
      }}
    >
      {featured && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: P, color: BG, fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: 20, fontWeight: 700 }}>
          {popularLabel}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color, marginBottom: 6 }}>{title}</div>
          <div style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 400 }}>${fmt(price)}</div>
        </div>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${selected ? color : 'rgba(255,255,255,0.25)'}`, background: selected ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 8, transition: 'all 0.2s' }}>
          {selected && <span style={{ color: BG, fontSize: 13, fontWeight: 700 }}>✓</span>}
        </div>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((item) => (
          <li key={item} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.72)', alignItems: 'flex-start' }}>
            <span style={{ color, flexShrink: 0, marginTop: 1 }}>✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddonToggle({ addon, selected, onToggle }: { addon: Addon; selected: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        border: `1px solid ${selected ? G + '55' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8, cursor: 'pointer',
        background: selected ? `${G}08` : 'transparent',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${selected ? G : 'rgba(255,255,255,0.25)'}`, background: selected ? G : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        {selected && <span style={{ color: BG, fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#e6e6ee', marginBottom: 2 }}>{addon.label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: MONO }}>{addon.sublabel}</div>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 13, color: selected ? G : 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {addon.monthly ? `$${fmt(addon.price)}/mo` : `+$${fmt(addon.price)}`}
      </div>
    </div>
  );
}

function WhatsAppChat({ t }: { t: TType }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
      {open && (
        <div style={{ width: 300, background: '#16161f', border: `1px solid ${G}44`, borderRadius: 16, overflow: 'hidden', boxShadow: `0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(57,255,139,0.1)` }}>
          <div style={{ background: `${G}18`, borderBottom: `1px solid ${G}22`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: 16, color: BG, fontWeight: 700, flexShrink: 0 }}>V</div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#e6e6ee' }}>Victor — VDesing</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: G, boxShadow: `0 0 6px ${G}` }} />
                <span style={{ fontFamily: MONO, fontSize: 9, color: G, letterSpacing: '0.1em' }}>{t.chatAvailable}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 18px 20px' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px 14px 14px 14px', padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.55, marginBottom: 14 }}>
              {t.chatMessage}
            </div>
            <a
              href={`https://wa.me/17879449031?text=${t.chatWA}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', textAlign: 'center', background: G, color: BG, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', padding: '11px 0', borderRadius: 8, boxShadow: `0 0 16px ${G}44` }}
            >
              {t.chatOpen}
            </a>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: 56, height: 56, borderRadius: '50%', background: G, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${G}66, 0 4px 20px rgba(0,0,0,0.4)`, transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
        aria-label="Chat"
      >
        {open
          ? <span style={{ fontSize: 24, color: BG, lineHeight: 1, fontWeight: 300 }}>×</span>
          : <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" fill="#08080d"/></svg>
        }
      </button>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function Servicios3D() {
  const [lang, setLang] = useState<Lang>('es');
  const t = T[lang];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const [base, setBase] = useState<'basic' | 'pro' | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ADDONS = lang === 'es' ? ADDONS_ES : ADDONS_EN;
  const CAT_SMALL = [t.catDiseno, t.catVideo, t.catFunc];
  const CAT_PRO   = [t.catPremium];

  const basicItems = lang === 'es' ? BASIC_ITEMS_ES : BASIC_ITEMS_EN;
  const proItems   = lang === 'es' ? PRO_ITEMS_ES   : PRO_ITEMS_EN;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const { oneTime, monthly } = useMemo(() => {
    const baseAmt = base === 'basic' ? BASIC_PRICE : base === 'pro' ? PRO_PRICE : 0;
    let oneTime = baseAmt;
    let monthly = 0;
    for (const a of ADDONS) {
      if (!selected.has(a.id)) continue;
      if (a.monthly) monthly += a.price;
      else oneTime += a.price;
    }
    return { oneTime, monthly };
  }, [base, selected, ADDONS]);

  const waItems = useMemo(() => {
    const lines: string[] = [];
    if (base) lines.push(`Package: ${base === 'basic' ? `${t.basicName} ($${fmt(BASIC_PRICE)})` : `${t.proName} ($${fmt(PRO_PRICE)})`}`);
    for (const a of ADDONS) {
      if (selected.has(a.id)) lines.push(`+ ${a.label} ($${fmt(a.price)}${a.monthly ? '/mo' : ''})`);
    }
    lines.push(`Estimated total: $${fmt(oneTime)}${monthly > 0 ? ` + $${fmt(monthly)}/mo` : ''}`);
    return lines.join('%0A');
  }, [base, selected, oneTime, monthly, t, ADDONS]);

  const waHref = `https://wa.me/17879449031?text=Hola%20Victor,%20me%20interesa%20cotizar:%0A${waItems}`;

  const monthlyPlans = [
    { name: t.planStarter,    price: 100, items: t.starterItems,    color: G },
    { name: t.planNegocio,    price: 160, items: t.negocioItems,    color: P },
    { name: t.planProfesional,price: 240, items: t.profesionalItems,color: G },
  ];

  const moLabel = lang === 'es' ? 'al mes' : '/mo';

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#e6e6ee', fontFamily: SANS }}>
      <PageLoader />

      {/* Nav */}
      <nav id="main-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 36px', background: `${BG}dd`, backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Link href="/" style={{ fontFamily: MONO, fontSize: 13, letterSpacing: '0.04em', color: '#e6e6ee', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          VDesing<span id="nav-subtitle" style={{ color: G }}> — {lang === 'es' ? 'Webs 3D PR' : '3D Webs PR'}</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden', fontFamily: MONO, fontSize: 11 }}>
            {(['es', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{ padding: '6px 12px', background: lang === l ? G : 'transparent', color: lang === l ? BG : 'rgba(255,255,255,0.45)', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s' }}>
                {l}
              </button>
            ))}
          </div>
          <a href={waHref} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: BG, background: G, padding: '8px 18px', borderRadius: 4, textDecoration: 'none', fontWeight: 700 }}>
            {t.quote}
          </a>
        </div>
      </nav>

      {/* Urgency bar */}
      <UrgencyBar t={t} />

      {/* Hero */}
      <section style={{ minHeight: '92vh', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '32px 0', padding: '140px 24px 80px', position: 'relative', overflow: 'hidden', maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(57,255,139,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,139,0.04) 1px, transparent 1px)`, backgroundSize: '48px 48px', pointerEvents: 'none' }} />

        <div style={{ flex: '1 1 300px', minWidth: 0, zIndex: 1 }}>
          <div id="hero-badge" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: G, marginBottom: 20, whiteSpace: 'pre-line' }}>{t.badge}</div>
          <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(2.2rem, 5vw, 4.2rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: 24, maxWidth: 560 }}>
            {t.h1a} <span style={{ color: G, fontStyle: 'italic' }}>{t.h1b}</span> {t.h1c}
          </h1>
          <p style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.1rem)', color: 'rgba(255,255,255,0.55)', maxWidth: 460, lineHeight: 1.7, marginBottom: 44 }}>
            {t.sub}
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="#paquetes" style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: BG, background: G, padding: '14px 32px', borderRadius: 4, textDecoration: 'none', fontWeight: 700, boxShadow: `0 0 28px ${G}55` }}>
              {t.pkgBtn}
            </a>
            <Link href="/lab/demo-3d" style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: G, border: `1px solid ${G}44`, padding: '14px 32px', borderRadius: 4, textDecoration: 'none' }}>
              {t.demoBtn}
            </Link>
          </div>
        </div>

        <AvatarWalkScene />
      </section>

      {/* Why real */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 28 }}>
          {[
            { n: '01', t: t.why1t, b: t.why1b },
            { n: '02', t: t.why2t, b: t.why2b },
            { n: '03', t: t.why3t, b: t.why3b },
          ].map((w) => (
            <div key={w.n} style={{ borderTop: `2px solid ${G}44`, paddingTop: 22 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', color: G, marginBottom: 8 }}>{w.n}</div>
              <div style={{ fontFamily: SERIF, fontSize: 19, marginBottom: 10 }}>{w.t}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{w.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section id="paquetes" style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 100px' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12, textAlign: 'center' }}>{t.pkgsBadge}</div>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', textAlign: 'center', marginBottom: 8, fontWeight: 400 }}>{t.pkgTitle}</h2>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.38)', fontFamily: MONO, marginBottom: 48 }}>
          {t.pkgsNote}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          <PackageCard title={t.basicName} price={BASIC_PRICE} items={basicItems} color={G} selected={base === 'basic'} onSelect={() => setBase(base === 'basic' ? null : 'basic')} popularLabel={t.popular} />
          <PackageCard title={t.proName} price={PRO_PRICE} items={proItems} featured color={P} selected={base === 'pro'} onSelect={() => setBase(base === 'pro' ? null : 'pro')} popularLabel={t.popular} />
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>
          {t.pkgsPayment}
        </p>

        {/* Monthly plans */}
        <div style={{ marginTop: 72 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12, textAlign: 'center' }}>{t.monthBadge}</div>
          <h3 style={{ fontFamily: SERIF, fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', textAlign: 'center', marginBottom: 8, fontWeight: 400 }}>
            {t.monthHeadline} <span style={{ color: G }}>$100 {moLabel}</span>
          </h3>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.65 }}>
            {t.monthDesc}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {monthlyPlans.map((plan) => (
              <div key={plan.name} style={{ border: `1px solid ${plan.color}33`, borderRadius: 10, padding: '24px 20px', background: `${plan.color}06` }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: plan.color, marginBottom: 6 }}>{plan.name}</div>
                <div style={{ fontFamily: SERIF, fontSize: 32 }}>${plan.price}<span style={{ fontSize: 14, fontFamily: MONO, color: 'rgba(255,255,255,0.4)' }}>/{lang === 'es' ? 'mes' : 'mo'}</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 20px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(plan.items as readonly string[]).map((item) => (
                    <li key={item} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'rgba(255,255,255,0.65)', alignItems: 'flex-start' }}>
                      <span style={{ color: plan.color, flexShrink: 0 }}>✓</span>{item}
                    </li>
                  ))}
                </ul>
                <a
                  href={`https://wa.me/17879449031?text=Hola,%20me%20interesa%20el%20plan%20mensual%20${encodeURIComponent(plan.name)}%20de%20$${plan.price}/${lang === 'es' ? 'mes' : 'mo'}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'block', textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none', padding: '10px 0', borderRadius: 4, border: `1px solid ${plan.color}44`, color: plan.color, fontWeight: 600 }}
                >
                  {t.monthCTA}
                </a>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: MONO }}>
            {t.monthNote}
          </p>
        </div>
      </section>

      {/* Real-time Calculator */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '80px 24px 120px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12, textAlign: 'center' }}>
            {t.calcBadge}
          </div>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', textAlign: 'center', marginBottom: 10, fontWeight: 400 }}>
            {t.calcHeadline}
          </h2>
          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'rgba(255,255,255,0.45)', marginBottom: 56, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {t.calcLongDesc}
          </p>

          {/* Sticky total bar */}
          <div style={{ position: 'sticky', top: 72, zIndex: 40, background: `${BG}ee`, backdropFilter: 'blur(14px)', border: `1px solid ${base ? G + '44' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '16px 24px', marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                {t.quoteLabel}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: SERIF, fontSize: 36, color: G, textShadow: base ? `0 0 20px ${G}66` : 'none' }}>
                  ${fmt(oneTime)}
                </span>
                {monthly > 0 && (
                  <span style={{ fontFamily: MONO, fontSize: 12, color: P }}>
                    + ${fmt(monthly)}/{lang === 'es' ? 'mes' : 'mo'}
                  </span>
                )}
                {!base && <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{t.quoteEmpty}</span>}
              </div>
            </div>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: BG, background: base ? G : 'rgba(255,255,255,0.15)', padding: '12px 24px', borderRadius: 4, textDecoration: 'none', fontWeight: 700, opacity: base ? 1 : 0.5, pointerEvents: base ? 'auto' : 'none' }}
            >
              {t.quoteSend}
            </a>
          </div>

          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 28 }}>
            {t.forSmall}
          </div>
          {CAT_SMALL.map((cat) => {
            const catAddons = ADDONS.filter((a) => a.category === cat);
            return (
              <div key={cat} style={{ marginBottom: 40 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: G, marginBottom: 14 }}>{cat}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {catAddons.map((a) => (
                    <AddonToggle key={a.id} addon={a} selected={selected.has(a.id)} onToggle={() => toggle(a.id)} />
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ borderTop: `1px solid rgba(168,85,247,0.25)`, margin: '20px 0 36px', paddingTop: 32 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: P, marginBottom: 6 }}>
              {t.forPro}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 28, lineHeight: 1.6 }}>
              {t.forProNote}
            </p>
            {CAT_PRO.map((cat) => {
              const catAddons = ADDONS.filter((a) => a.category === cat);
              return (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {catAddons.map((a) => (
                    <AddonToggle key={a.id} addon={a} selected={selected.has(a.id)} onToggle={() => toggle(a.id)} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: G, marginBottom: 16 }}>{t.consultBadge}</div>
        <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 400, marginBottom: 16, maxWidth: 560, margin: '0 auto 16px' }}>
          {t.consultH}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 400, margin: '0 auto 36px', fontSize: 14, lineHeight: 1.65 }}>
          {t.consultSub}
        </p>
        <a
          href="https://wa.me/17879449031?text=Hola%20Victor,%20quiero%20una%20consulta%20gratis%20para%20mi%20negocio"
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-block', fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: BG, background: G, padding: '16px 40px', borderRadius: 4, textDecoration: 'none', fontWeight: 700, boxShadow: `0 0 36px ${G}44` }}
        >
          {t.consultBtn}
        </a>
        <div style={{ marginTop: 56, fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>
          VDesing · Puerto Rico · nucleo.evo.cuantic7@gmail.com
        </div>
      </section>

      {/* Portfolio */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '80px 24px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12, textAlign: 'center' }}>{t.worksBadge}</div>
          <h2 style={{ fontFamily: SERIF, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', textAlign: 'center', fontWeight: 400, marginBottom: 52 }}>
            {t.worksTitle}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {([
              { ...t.projects[0], color: G, url: 'https://corta-pelo.vercel.app' },
              { ...t.projects[1], color: P, url: null },
              { ...t.projects[2], color: G, url: 'https://samuraytattoo.pages.dev' },
              { ...t.projects[3], color: P, url: 'https://reyesg.vercel.app/' },
              { ...t.projects[4], color: G, url: 'https://www.iglesia.living/' },
              { ...t.projects[5], color: P, url: 'https://ymusic.nucleo-evo-cuantic7.workers.dev/' },
              { ...t.projects[6], color: G, url: 'https://arcs.nucleo-evo-cuantic7.workers.dev/' },
            ] as Array<{ name: string; cat: string; desc: string; color: string; url: string | null }>).map((p) => (
              <div key={p.name} style={{ border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 10, padding: '28px 24px', background: 'rgba(255,255,255,0.02)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: p.color, opacity: 0.6 }} />
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: p.color, marginBottom: 10 }}>{p.cat}</div>
                <div style={{ fontFamily: SERIF, fontSize: 22, marginBottom: 12 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, flex: 1 }}>{p.desc}</div>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 20, fontFamily: MONO, fontSize: 11, letterSpacing: '0.12em', color: p.color, border: `1px solid ${p.color}44`, padding: '8px 16px', borderRadius: 4, textDecoration: 'none', width: 'fit-content' }}>
                    {t.viewSite}
                  </a>
                ) : (
                  <span style={{ display: 'inline-block', marginTop: 20, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.2)' }}>{t.privateDemo}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 40, padding: '48px 24px 32px', fontFamily: SANS }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between', marginBottom: 40 }}>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontFamily: SERIF, fontSize: 22, marginBottom: 8 }}>VDesing</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 240, whiteSpace: 'pre-line' }}>
                {t.footerDesc}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>{t.footerSvc}</div>
                {t.footerServices.map(l => (
                  <div key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>{l}</div>
                ))}
              </div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 14 }}>{t.footerContact}</div>
                <a href="https://wa.me/17879449031" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 13, color: G, textDecoration: 'none', marginBottom: 8 }}>WhatsApp</a>
                <a href="mailto:nucleo.evo.cuantic7@gmail.com" style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', marginBottom: 8 }}>nucleo.evo.cuantic7@gmail.com</a>
                <a href="tel:+17879449031" style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>(787) 944-9031</a>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontFamily: MONO }}>
              © {new Date().getFullYear()} VDesing — {t.rights}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {[
                { label: t.privacy, href: '#' },
                { label: t.terms,   href: '#' },
              ].map(l => (
                <a key={l.label} href={l.href} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontFamily: MONO }}>{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp chat */}
      <WhatsAppChat t={t} />
    </main>
  );
}