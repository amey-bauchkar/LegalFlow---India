// @ts-nocheck
// LegalFlow India – Premium Law Firm Case Management System
// Complete SaaS Dashboard with Framer Motion – Cinematic UI Overhaul

const { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } = React;
// Framer Motion – try multiple global names
const FM = window["framer-motion"] || window.FramerMotion || window.Motion || {};
const AnimatePresence = FM.AnimatePresence || (({children})=>children);
// motion.div is always available in framer-motion UMD
const motion = FM.motion || {div:'div'};
// Fallback: if motion.div is undefined, animations just won't run
if (!motion.div) { motion.div = 'div'; }

// ============================================================
// SECTION 1: TYPES & CONSTANTS
// ============================================================
const MATTER_STAGES = ['Filing','Admission','Written Statement','Evidence','Arguments','Final Hearing','Order Reserved','Disposed'];
const COURTS = { SC:'Supreme Court of India', BHC:'Bombay High Court', DHC:'Delhi High Court', DCMUM:'District Court, Mumbai', DCDEL:'District Court, Delhi', DCHYD:'District Court, Hyderabad' };
const COURT_TYPES = { SC:'Supreme Court', BHC:'High Court', DHC:'High Court', DCMUM:'District Court', DCDEL:'District Court', DCHYD:'District Court' };

// ============================================================
// SECTION 2: DATA (loaded from API – initially empty)
// ============================================================
let clients = [];
let cases = [];
let documents = [];
let invoices = [];
let tasks = [];
let calendarEvents = [];
let users = [];


// ============================================================
// SECTION 3: UTILITY FUNCTIONS
// ============================================================
const formatINR = (a) => a == null ? '₹0' : '₹' + a.toLocaleString('en-IN');
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const formatDateShort = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—';
const daysUntil = (d) => d ? Math.ceil((new Date(d)-new Date('2026-04-01'))/(864e5)) : Infinity;
const daysOverdue = (d) => -daysUntil(d);
const getPriorityBg = (p) => ({Critical:'priority-critical',High:'priority-high',Medium:'priority-medium',Low:'priority-low'}[p]||'');
const getActiveCases = () => cases.filter(c => c.status === 'Active');
const getUpcomingHearings = (n=7) => calendarEvents.filter(e => e.type==='Hearing' && daysUntil(e.date)>=0 && daysUntil(e.date)<=n).sort((a,b)=>new Date(a.date)-new Date(b.date));
const getOverdueInvoices = () => invoices.filter(i => i.status === 'Overdue');
const getTotalRevenue = () => invoices.filter(i => i.status==='Paid').reduce((s,i) => s+(i.total||0), 0);
const getTotalOutstanding = () => invoices.filter(i => i.status!=='Paid').reduce((s,i) => s+(i.total||0), 0);
const getDocumentsForCase = (id) => documents.filter(d => d.caseId===id);
const getTasksForCase = (id) => tasks.filter(t => t.caseId===id);
const getInvoicesForCase = (id) => invoices.filter(i => i.caseId===id);
const getUserRole = () => window.__lfUser ? window.__lfUser.role : 'lawyer';
const isAdmin = () => getUserRole() === 'admin';

const getAIInsight = () => {
  const ot = tasks.filter(t=>t.status==='Overdue');
  if(ot.length) { const t=ot[0]; const c=cases.find(x=>x.id===t.caseId); return {type:'urgent',icon:'fa-exclamation-triangle',title:'Overdue Task Alert',message:`"${t.title}" for ${c?.title||'case'} is overdue since ${formatDate(t.dueDate)}. Immediate action is required to avoid any adverse impact on proceedings.`,action:'Review Task',caseId:t.caseId}; }
  const uh=getUpcomingHearings(3);
  if(uh.length) { const e=uh[0]; const d=daysUntil(e.date); return {type:'warning',icon:'fa-gavel',title:'Upcoming Hearing',message:`${e.title} in ${d} day${d!==1?'s':''} at ${e.court}. Scheduled for ${e.time}. Ensure all preparation is complete.`,action:'View Details',caseId:e.caseId}; }
  const oi=getOverdueInvoices();
  if(oi.length) { const inv=oi[0]; return {type:'info',icon:'fa-file-invoice',title:'Overdue Invoice',message:`Invoice ${inv.invoiceNumber} for ${inv.clientName} (${formatINR(inv.total)}) is overdue by ${daysOverdue(inv.dueDate)} days. Follow up recommended.`,action:'View Invoice',caseId:inv.caseId}; }
  return {type:'info',icon:'fa-check-circle',title:'All Clear',message:'No urgent items. All workflows on track.',action:'View Dashboard',caseId:null};
};

// ============================================================
// SECTION 4: ROUTING
// ============================================================
const RouterCtx = createContext({ path:'/', navigate:()=>{} });
const useRouter = () => useContext(RouterCtx);
const Router = ({children}) => {
  const [path, setPath] = useState(window.location.hash.slice(1)||'/');
  useEffect(()=>{ const h=()=>setPath(window.location.hash.slice(1)||'/'); window.addEventListener('hashchange',h); return ()=>window.removeEventListener('hashchange',h); },[]);
  const navigate = useCallback((to)=>{ window.location.hash=to; },[]);
  return React.createElement(RouterCtx.Provider, {value:{path,navigate}}, children);
};
const Route = ({path:rp, component:C}) => {
  const {path}=useRouter();
  if(rp===path) return React.createElement(C);
  if(rp.includes(':')) { const rParts=rp.split('/'), pParts=path.split('/'); if(rParts.length!==pParts.length) return null; const params={}; const ok=rParts.every((part,i)=>{ if(part.startsWith(':')){ params[part.slice(1)]=pParts[i]; return true; } return part===pParts[i]; }); if(ok) return React.createElement(C,{params}); }
  return null;
};

// ============================================================
// SECTION 5: FRAMER MOTION – CINEMATIC ANIMATION SYSTEM
// ============================================================
const spring = { type:'spring', stiffness:280, damping:28 };
const springGentle = { type:'spring', stiffness:180, damping:22 };
const springBounce = { type:'spring', stiffness:350, damping:20 };
const easeOut = { duration:0.55, ease:[0.22,1,0.36,1] };
const easeOutFast = { duration:0.35, ease:[0.22,1,0.36,1] };

// Stagger container with entrance hierarchy
const Stagger = ({children, className='', staggerDelay=0.06, delayStart=0}) => {
  return React.createElement(motion.div, {
    className,
    initial:'hidden', animate:'show',
    variants: { hidden:{}, show:{ transition:{ staggerChildren:staggerDelay, delayChildren:delayStart } } }
  }, children);
};

// Fade Up (primary entrance)
const FadeUp = ({children, className='', delay=0, ...props}) => {
  return React.createElement(motion.div, {
    className,
    initial:{opacity:0, y:20}, animate:{opacity:1, y:0},
    transition:{...easeOut, delay},
    ...props
  }, children);
};

// Fade In (subtle)
const FadeIn = ({children, className='', delay=0}) => {
  return React.createElement(motion.div, {
    className,
    initial:{opacity:0}, animate:{opacity:1},
    transition:{duration:0.45, delay}
  }, children);
};

// Scale In (for modals/overlays)
const ScaleIn = ({children, className='', delay=0}) => {
  return React.createElement(motion.div, {
    className,
    initial:{opacity:0, scale:0.96}, animate:{opacity:1, scale:1},
    transition:{...easeOut, delay}
  }, children);
};

// Stagger Item
const StaggerItem = ({children, className=''}) => {
  return React.createElement(motion.div, {
    className,
    variants:{ hidden:{opacity:0, y:18}, show:{opacity:1, y:0, transition:{...easeOut}} }
  }, children);
};

// Animated counter with easeOutQuart
const AnimNum = ({value, prefix='', suffix='', duration=1400}) => {
  const [d,setD]=useState(0); const ref=useRef();
  useEffect(()=>{
    const st=Date.now();
    const run=()=>{ const p=Math.min((Date.now()-st)/duration,1); const e=1-Math.pow(1-p,4); setD(Math.round(e*value)); if(p<1) ref.current=requestAnimationFrame(run); };
    ref.current=requestAnimationFrame(run);
    return ()=>cancelAnimationFrame(ref.current);
  },[value,duration]);
  return React.createElement('span',null, prefix + d.toLocaleString('en-IN') + suffix);
};

// Badge components
const StatusBadge = ({status}) => {
  const m = {'Active':'badge-active','Pending':'badge-pending','Closed':'badge-closed','Paid':'badge-paid','Overdue':'badge-overdue','Verified':'badge-verified','Filed':'badge-filed','Uploaded':'badge-uploaded','Pending Review':'badge-review','In Progress':'badge-inprogress','Not Started':'badge-notstarted','Completed':'badge-paid'};
  return React.createElement('span',{className:`badge ${m[status]||'badge-pending'}`}, React.createElement('span',{className:'badge-dot'}), status);
};

const PriorityBadge = ({priority}) => {
  return React.createElement('span',{className:`priority-badge ${getPriorityBg(priority)}`}, React.createElement('span',{className:'badge-dot'}), priority);
};

// Skeleton loaders
const SkeletonBlock = ({className='',style={}}) => React.createElement('div',{className:`skeleton ${className}`,style});
const SkeletonCards = ({count=4}) => React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'},
  Array.from({length:count}).map((_,i) => React.createElement(SkeletonBlock,{key:i,className:'skeleton-metric'}))
);

// Empty state – polished
const EmptyState = ({icon,title,subtitle}) => React.createElement(FadeUp,{className:'flex flex-col items-center justify-center py-24 text-center'},
  React.createElement(motion.div,{
    className:'w-20 h-20 rounded-2xl glass-inner flex items-center justify-center mb-6',
    initial:{scale:0.8,opacity:0}, animate:{scale:1,opacity:1},
    transition:{...springGentle,delay:0.1}
  }, React.createElement('i',{className:`fas ${icon} text-3xl text-surface-600`})),
  React.createElement(motion.div||'div',{className:'text-base font-semibold text-surface-300 mb-2',initial:{opacity:0},animate:{opacity:1},transition:{delay:0.2}},title),
  React.createElement(motion.div||'div',{className:'text-sm text-surface-500 max-w-sm leading-relaxed',initial:{opacity:0},animate:{opacity:1},transition:{delay:0.3}},subtitle)
);

// ============================================================
// SECTION 6: LAYOUT (Sidebar + Header + Page Transitions)
// ============================================================
const Sidebar = () => {
  const {path,navigate}=useRouter();
  const links = [
    {to:'/',icon:'fa-th-large',label:'Dashboard'},
    {to:'/cases',icon:'fa-briefcase',label:'Cases'},
    {to:'/clients',icon:'fa-users',label:'Clients'},
    {to:'/documents',icon:'fa-folder-open',label:'Documents'},
    {to:'/billing',icon:'fa-file-invoice-dollar',label:'Billing'},
    {to:'/time',icon:'fa-stopwatch',label:'Time Tracking'},
    {to:'/expenses',icon:'fa-receipt',label:'Expenses'},
    {to:'/team',icon:'fa-users-cog',label:'Team'},
    {to:'/reports',icon:'fa-chart-pie',label:'Reports'},
    {to:'/calendar',icon:'fa-calendar-alt',label:'Calendar'}
  ];
  const isActive = (to) => to==='/' ? path==='/' : path.startsWith(to);

  return React.createElement(motion.div||'div',{role:'complementary',
    className:'fixed left-0 top-0 bottom-0 w-[260px] glass-panel z-40 flex flex-col border-r border-white/[0.035]',
    initial:{x:-260,opacity:0}, animate:{x:0,opacity:1}, transition:{...easeOut,delay:0.05}
  },
    // Logo
    React.createElement('div',{className:'px-5 py-5 border-b border-white/[0.035]'},
      React.createElement(motion.div,{className:'flex items-center gap-3 cursor-pointer group', onClick:()=>navigate('/'),
        whileHover:{x:2}, transition:easeOutFast},
        React.createElement('div',{className:'w-10 h-10 rounded-[11px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/35 transition-shadow'},
          React.createElement('i',{className:'fas fa-balance-scale text-white text-sm'})
        ),
        React.createElement('div',null,
          React.createElement('h1',{className:'text-[14px] font-bold text-white tracking-tight leading-tight'},'LegalFlow'),
          React.createElement('p',{className:'text-[9px] text-indigo-300/80 font-semibold tracking-[0.2em] uppercase'},'India')
        )
      )
    ),
    // Nav
    React.createElement('nav',{className:'flex-1 px-3 py-5 space-y-1 overflow-y-auto'},
      links.map((l,idx) => React.createElement(motion.div||'div',{key:l.to,
        initial:{opacity:0,x:-12}, animate:{opacity:1,x:0}, transition:{...easeOut,delay:0.1+idx*0.04},
        whileHover:{x:3}, whileTap:{scale:0.98}
      }, React.createElement('a',{href:`#${l.to}`,
        className:`sidebar-link ${isActive(l.to)?'active':''}`,
        onClick:e=>{e.preventDefault();navigate(l.to);}},
        React.createElement('i',{className:`fas ${l.icon} w-5 text-center text-[13px]`}),
        React.createElement('span',null,l.label)
      )))
    ),
    // User (from auth context)
    React.createElement(motion.div||'div',{className:'px-4 py-4 border-t border-white/[0.035]',
      initial:{opacity:0}, animate:{opacity:1}, transition:{delay:0.4}},
      React.createElement('div',{className:'flex items-center gap-3'},
        React.createElement('div',{className:'w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-indigo-500/15 ring-2 ring-indigo-500/10'}, window.__lfUser ? window.__lfUser.name.split(' ').map(w=>w[0]).join('').slice(0,2) : 'RK'),
        React.createElement('div',{className:'flex-1 min-w-0'},
          React.createElement('div',{className:'text-[13px] font-semibold text-white truncate'}, window.__lfUser ? window.__lfUser.name : 'Rajesh Kumar'),
          React.createElement('div',{className:'text-[11px] text-surface-500 truncate'}, window.__lfUser ? (window.__lfUser.designation || window.__lfUser.role) : 'Senior Partner')
        ),
        React.createElement(motion.div||'div',{className:'w-7 h-7 rounded-lg glass-inner flex items-center justify-center text-surface-500 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer',
          title:'Logout',onClick:()=>{window.lfAPI.clearAuth();window.location.reload();}},
          React.createElement('i',{className:'fas fa-sign-out-alt text-[10px]'})
        )
      )
    )
  );
};

const Header = () => {
  const {path}=useRouter();
  const [sf,setSf]=useState(false);
  const userName = window.__lfUser ? window.__lfUser.name.split(' ')[0] : 'Rajesh';
  const t = path==='/'?'Dashboard':path==='/cases'?'Cases':path.startsWith('/cases/')?'Case Details':path==='/clients'?'Clients':path==='/documents'?'Documents':path==='/billing'?'Billing':path==='/time'?'Time Tracking':path==='/expenses'?'Expenses':path==='/team'?'Team Collaboration':path==='/reports'?'Reports & Analytics':path==='/calendar'?'Calendar':'LegalFlow';
  const sub = path==='/'?`Welcome back, ${userName}`:path==='/cases'?`${cases.length} total matters`:path==='/clients'?`${clients.length} registered clients`:path==='/documents'?`${documents.length} documents`:path==='/billing'?`${invoices.length} invoices`:path==='/time'?'Manage billable hours':path==='/expenses'?'Track case expenses':path==='/team'?'Manage firm members':path==='/reports'?'Firm performance metrics':path==='/calendar'?'April 2026':'';

  return React.createElement(motion.div||'div',{role:'banner',
    className:'h-[64px] glass-panel border-b border-white/[0.035] flex items-center justify-between px-7 sticky top-0 z-30',
    initial:{opacity:0,y:-10}, animate:{opacity:1,y:0}, transition:{...easeOut,delay:0.1}
  },
    React.createElement('div',{className:'flex items-center gap-4'},
      React.createElement(AnimatePresence,{mode:'wait'},
        React.createElement(motion.div,{key:t, initial:{opacity:0,x:-10}, animate:{opacity:1,x:0}, exit:{opacity:0,x:10}, transition:{duration:0.25}},
          React.createElement('h2',{className:'text-[16px] font-bold text-white tracking-tight'},t),
          sub && React.createElement('p',{className:'text-[11px] text-surface-500 font-medium -mt-0.5'},sub)
        )
      )
    ),
    React.createElement('div',{className:'flex items-center gap-3'},
      React.createElement('span',{className:'text-[11px] text-surface-600 font-medium hidden md:block'},'1 Apr 2026'),
      React.createElement('div',{className:`relative transition-all duration-300 ${sf?'w-72':'w-48'}`},
        React.createElement('i',{className:'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 text-[11px]'}),
        React.createElement('input',{type:'text',placeholder:'Search cases, clients…',className:'w-full pl-8 pr-3 py-[7px] rounded-[11px] text-[13px]',onFocus:()=>setSf(true),onBlur:()=>setSf(false)})
      ),
      React.createElement(motion.div||'div',{
        className:'relative w-9 h-9 rounded-[11px] glass-inner flex items-center justify-center text-surface-500 hover:text-white hover:border-indigo-500/20 transition-all cursor-pointer',
        whileHover:{scale:1.05}, whileTap:{scale:0.95}
      },
        React.createElement('i',{className:'fas fa-bell text-[13px]'}),
        React.createElement(motion.div||'div',{
          className:'absolute -top-0.5 -right-0.5 w-[15px] h-[15px] bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center ring-2 ring-[#050910]',
          initial:{scale:0}, animate:{scale:1}, transition:{...springBounce,delay:0.5}
        },'3')
      )
    )
  );
};

// Page transition wrapper
const PageTransition = ({children, k}) => {
  return React.createElement(AnimatePresence,{mode:'wait'},
    React.createElement(motion.div,{key:k,
      initial:{opacity:0, y:16}, animate:{opacity:1, y:0}, exit:{opacity:0, y:-10},
      transition:{...easeOut}
    }, children)
  );
};

const Layout = ({children}) => {
  const {path}=useRouter();
  return React.createElement('div',{className:'min-h-screen'},
    React.createElement(Sidebar),
    React.createElement('div',{className:'ml-[260px]'},
      React.createElement(Header),
      React.createElement('main',{className:'p-7 min-h-[calc(100vh-64px)] page-content'},
        React.createElement(PageTransition,{k:path}, children)
      )
    )
  );
};

// ============================================================
// SECTION 7: PREMIUM COMPONENTS
// ============================================================

// Matter Stage Stepper - Cinematic
const MatterStageStepper = ({currentStage, compact=false}) => {
  return React.createElement(FadeUp,{className:'w-full py-3',delay:0.15},
    React.createElement('div',{className:'flex items-start justify-between relative'},
      MATTER_STAGES.map((stage,idx)=>{
        const done=idx<currentStage, active=idx===currentStage;
        const cls = done?'completed':active?'active':'inactive';
        return React.createElement('div',{key:stage,className:'stage-step'},
          idx<MATTER_STAGES.length-1 && React.createElement('div',{className:'stage-connector stage-connector-bg', style:{position:'absolute',top:'15px',left:'calc(50% + 16px)',right:'calc(-50% + 16px)',height:'2px'}},
            (done||active) && React.createElement(motion.div,{className:'stage-connector-fill',
              initial:{width:'0%'}, animate:{width:done?'100%':active?'50%':'0%'},
              transition:{duration:0.9,delay:idx*0.1,ease:[0.22,1,0.36,1]},
              style:{background:'linear-gradient(90deg, #6366f1, #a5b4fc)',height:'100%',borderRadius:'1px'}
            })
          ),
          React.createElement(motion.div,{className:`stage-dot ${cls}`,
            initial:{scale:0.7,opacity:0}, animate:{scale:1,opacity:1},
            transition:{delay:idx*0.07,...springGentle}
          }, done ? React.createElement('i',{className:'fas fa-check',style:{fontSize:'10px'}}) : React.createElement('span',null,idx+1)),
          !compact && React.createElement('div',{className:`stage-label ${cls}`},stage)
        );
      })
    )
  );
};

// AI Hero Card – Cinematic, dominant, glow/pulse
const AIAssistantCard = () => {
  const insight = useMemo(()=>getAIInsight(),[]);
  const {navigate}=useRouter();
  const gMap = {
    urgent:'from-red-950/50 via-red-900/25 to-orange-950/30',
    warning:'from-amber-950/40 via-amber-900/15 to-orange-950/20',
    info:'from-indigo-950/50 via-purple-950/20 to-blue-950/30'
  };
  const iMap = {urgent:'bg-red-500/15 text-red-400', warning:'bg-amber-500/15 text-amber-400', info:'bg-indigo-500/15 text-indigo-400'};
  const glowColor = {urgent:'rgba(239,68,68,0.12)',warning:'rgba(251,191,36,0.08)',info:'rgba(99,102,241,0.1)'};
  const borderColor = {urgent:'rgba(239,68,68,0.1)',warning:'rgba(251,191,36,0.08)',info:'rgba(99,102,241,0.08)'};

  return React.createElement(motion.div,{
    initial:{opacity:0,y:24,scale:0.97}, animate:{opacity:1,y:0,scale:1},
    transition:{duration:0.7,ease:[0.22,1,0.36,1]},
    className:`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gMap[insight.type]} p-8`,
    style:{
      boxShadow: `0 0 80px -20px ${glowColor[insight.type]}, 0 25px 60px -15px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
      border:`1px solid ${borderColor[insight.type]}`
    }
  },
    // Decorative glow orbs
    React.createElement(motion.div,{className:'absolute -top-20 -right-20 w-60 h-60 rounded-full',
      style:{background: insight.type==='urgent'?'radial-gradient(circle,rgba(239,68,68,0.08),transparent 70%)':'radial-gradient(circle,rgba(99,102,241,0.08),transparent 70%)'},
      animate:{scale:[1,1.1,1],opacity:[0.5,0.8,0.5]},transition:{duration:5,repeat:Infinity,ease:'easeInOut'}
    }),
    React.createElement(motion.div,{className:'absolute -bottom-16 left-1/3 w-44 h-44 rounded-full',
      style:{background:'radial-gradient(circle,rgba(139,92,246,0.06),transparent 70%)'},
      animate:{scale:[1,1.15,1],opacity:[0.3,0.6,0.3]},transition:{duration:6,repeat:Infinity,ease:'easeInOut',delay:1}
    }),
    // Noise texture overlay
    React.createElement('div',{className:'absolute inset-0 opacity-[0.012]',style:{backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,backgroundSize:'128px'}}),

    React.createElement('div',{className:'relative z-10'},
      React.createElement('div',{className:'flex items-start gap-6'},
        React.createElement(motion.div,{
          className:`w-16 h-16 rounded-xl ${iMap[insight.type]} flex items-center justify-center flex-shrink-0`,
          animate:{scale:[1,1.06,1]}, transition:{duration:3.5,repeat:Infinity,ease:'easeInOut'}
        }, React.createElement('i',{className:`fas ${insight.icon} text-2xl`})),
        React.createElement('div',{className:'flex-1 min-w-0'},
          React.createElement(motion.div,{className:'flex items-center gap-3 mb-3',
            initial:{opacity:0,y:6}, animate:{opacity:1,y:0}, transition:{delay:0.2,...easeOut}},
            React.createElement('span',{className:'text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300/60'},'✦ AI Legal Assistant'),
            React.createElement(motion.div||'div',{className:'w-[7px] h-[7px] rounded-full bg-emerald-400', animate:{opacity:[0.3,1,0.3],scale:[0.9,1.1,0.9]}, transition:{duration:2.5,repeat:Infinity}})
          ),
          React.createElement(motion.div||'div',{className:'text-xl font-bold text-white mb-2 tracking-tight leading-snug',
            initial:{opacity:0,y:8}, animate:{opacity:1,y:0}, transition:{delay:0.25,...easeOut}
          },insight.title),
          React.createElement(motion.div||'div',{className:'text-[14px] text-surface-300/90 leading-relaxed max-w-2xl',
            initial:{opacity:0,y:8}, animate:{opacity:1,y:0}, transition:{delay:0.3,...easeOut}
          },insight.message)
        )
      ),
      insight.caseId && React.createElement(motion.div||'div',{role:'button',
        className:'mt-6 ml-[88px] btn-primary text-[13px] px-6 py-2.5',
        initial:{opacity:0,y:10}, animate:{opacity:1,y:0}, transition:{delay:0.4,...easeOut},
        whileHover:{scale:1.03,y:-2,boxShadow:'0 12px 32px rgba(99,102,241,0.4), 0 0 24px rgba(99,102,241,0.15)'},
        whileTap:{scale:0.97},
        onClick:()=>navigate(`/cases/${insight.caseId}`)
      }, insight.action, ' ', React.createElement('i',{className:'fas fa-arrow-right ml-2 text-[11px]'}))
    )
  );
};

// Metric Card – Premium with lift+glow hover
const MetricCard = ({icon,iconBg,label,value,prefix='',suffix='',trend,trendUp,delay=0,sparkData}) => {
  return React.createElement(motion.div,{
    className:'glass-card p-5 metric-shimmer cursor-default',
    initial:{opacity:0,y:20}, animate:{opacity:1,y:0},
    transition:{...easeOut,delay},
    whileHover:{y:-4, scale:1.01,
      boxShadow:'0 24px 56px -16px rgba(99,102,241,0.16), 0 8px 24px -6px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.1)',
      borderColor:'rgba(99,102,241,0.2)'}
  },
    React.createElement('div',{className:'relative z-10'},
      React.createElement('div',{className:'flex items-center justify-between mb-4'},
        React.createElement(motion.div,{
          className:`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center`,
          whileHover:{scale:1.08}, transition:springBounce
        }, React.createElement('i',{className:`fas ${icon} text-[14px]`})),
        trend && React.createElement(motion.div||'div',{
          className:`text-[11px] font-semibold px-2.5 py-1 rounded-lg inline-flex items-center ${trendUp?'text-emerald-400 bg-emerald-500/8':'text-red-400 bg-red-500/8'}`,
          initial:{opacity:0,scale:0.8}, animate:{opacity:1,scale:1}, transition:{delay:delay+0.2,...springGentle}
        }, React.createElement('i',{className:`fas fa-arrow-${trendUp?'up':'down'} mr-1 text-[8px]`}), trend)
      ),
      React.createElement(motion.div,{className:'text-[24px] font-bold text-white mb-1 tracking-tight',
        initial:{opacity:0}, animate:{opacity:1}, transition:{delay:delay+0.1}},
        typeof value==='number' ? React.createElement(AnimNum,{value,prefix,suffix}) : React.createElement('span',null,prefix+value+suffix)
      ),
      React.createElement('div',{className:'text-[12px] text-surface-500 font-medium'},label),
      sparkData && React.createElement('div',{className:'flex items-end gap-[3px] mt-4 h-[28px]'},
        sparkData.map((v,i) => React.createElement(motion.div,{key:i,
          className:'flex-1 rounded-[3px]',
          style:{background:'linear-gradient(to top, rgba(99,102,241,0.25), rgba(129,140,248,0.5))'},
          initial:{height:0,opacity:0}, animate:{height:`${v}%`,opacity:1},
          transition:{delay:delay+0.15+i*0.04,duration:0.65,ease:[0.22,1,0.36,1]}
        }))
      )
    )
  );
};

// Bar Chart - Premium
const BarChart = ({data,height=90}) => {
  const max = Math.max(...data.map(d=>d.value));
  return React.createElement('div',{className:'flex items-end gap-2',style:{height}},
    data.map((d,i)=>React.createElement('div',{key:i,className:'flex-1 flex flex-col items-center gap-2'},
      React.createElement(motion.div,{
        className:'w-full rounded-[4px] chart-bar relative group',
        style:{background:d.color||'linear-gradient(to top, rgba(79,70,229,0.6), rgba(129,140,248,0.85))',minHeight:'3px'},
        initial:{height:0,opacity:0}, animate:{height:`${(d.value/max)*100}%`,opacity:1},
        transition:{delay:0.3+i*0.08,duration:0.75,ease:[0.22,1,0.36,1]}
      }),
      React.createElement('span',{className:'text-[9px] text-surface-600 font-medium'},d.label)
    ))
  );
};

// Donut mini chart for dashboard
const MiniDonut = ({data,size=80}) => {
  const total = data.reduce((s,d)=>s+d.value,0);
  let accum = 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  return React.createElement('svg',{width:size,height:size,viewBox:'0 0 80 80',className:'transform -rotate-90'},
    data.map((d,i)=>{
      const pct = d.value / total;
      const offset = accum * circumference;
      accum += pct;
      return React.createElement('circle',{key:i,
        cx:40,cy:40,r:radius,fill:'none',
        stroke:d.stroke,strokeWidth:8,
        strokeDasharray:`${pct*circumference} ${circumference}`,
        strokeDashoffset:-offset,
        strokeLinecap:'round'
      });
    })
  );
};

// ============================================================
// SECTION 8: DASHBOARD PAGE
// ============================================================

const CourtGroup = ({courtType,icon}) => {
  const cc = useMemo(()=>{
    if(courtType==='Supreme Court') return cases.filter(c=>c.court===COURTS.SC);
    if(courtType==='High Court') return cases.filter(c=>[COURTS.BHC,COURTS.DHC,'Karnataka High Court'].includes(c.court));
    return cases.filter(c=>[COURTS.DCMUM,COURTS.DCDEL,COURTS.DCHYD].includes(c.court));
  },[courtType]);
  const {navigate}=useRouter();
  if(!cc.length) return null;
  return React.createElement(StaggerItem,{},
    React.createElement('div',{className:'glass-card-flat overflow-hidden'},
      React.createElement('div',{className:'px-5 py-4 border-b border-white/[0.03] flex items-center gap-3'},
        React.createElement(motion.div,{className:'w-9 h-9 rounded-xl bg-indigo-500/8 flex items-center justify-center',
          whileHover:{scale:1.08}},
          React.createElement('i',{className:`fas ${icon} text-indigo-400/70 text-[13px]`})
        ),
        React.createElement('div',null,
          React.createElement('h3',{className:'text-[14px] font-semibold text-white'},courtType),
          React.createElement('p',{className:'text-[11px] text-surface-500'},`${cc.length} matter${cc.length>1?'s':''}`)
        )
      ),
      React.createElement('div',null,
        cc.map(c=>React.createElement(motion.div,{key:c.id,
          className:'px-5 py-3.5 cursor-pointer flex items-center justify-between gap-4 border-b border-white/[0.02] last:border-0',
          whileHover:{backgroundColor:'rgba(99,102,241,0.035)',x:2}, transition:easeOutFast,
          onClick:()=>navigate(`/cases/${c.id}`)},
          React.createElement('div',{className:'flex-1 min-w-0'},
            React.createElement('div',{className:'text-[13px] font-medium text-surface-200 truncate'},c.title),
            React.createElement('div',{className:'flex items-center gap-2.5 mt-1'},
              React.createElement('span',{className:'text-[11px] text-surface-500 font-mono'},c.caseNumber),
              React.createElement('span',{className:'text-[11px] text-surface-600'},'·'),
              React.createElement('span',{className:'text-[11px] text-surface-500'},c.advocate)
            )
          ),
          React.createElement('div',{className:'text-right flex-shrink-0 flex flex-col items-end gap-1.5'},
            React.createElement(PriorityBadge,{priority:c.priority}),
            React.createElement('div',{className:`text-[11px] font-medium ${daysUntil(c.nextHearingDate)<=3?'text-red-400':daysUntil(c.nextHearingDate)<=7?'text-amber-400':'text-surface-500'}`},
              React.createElement('i',{className:'fas fa-calendar-day mr-1 text-[9px]'}),formatDateShort(c.nextHearingDate))
          )
        ))
      )
    )
  );
};

const ListPanel = ({title,subtitle,icon,dotColor,children}) => React.createElement(StaggerItem,{},
  React.createElement('div',{className:'glass-card-flat overflow-hidden'},
    React.createElement('div',{className:'px-5 py-4 border-b border-white/[0.03] flex items-center justify-between'},
      React.createElement('div',{className:'flex items-center gap-2.5'},
        dotColor && React.createElement(motion.div||'div',{className:`w-[7px] h-[7px] rounded-full ${dotColor}`,
          animate:{opacity:[1,0.35,1],scale:[1,0.85,1]}, transition:{duration:2.5,repeat:Infinity}}),
        React.createElement('h3',{className:'text-[14px] font-semibold text-white'},title)
      ),
      subtitle && React.createElement('span',{className:'text-[11px] text-surface-500 font-medium bg-surface-950/40 px-2.5 py-1 rounded-lg'},subtitle)
    ),
    children
  )
);

const DashboardPage = () => {
  const ac=useMemo(()=>getActiveCases(),[]);
  const rev=useMemo(()=>getTotalRevenue(),[]);
  const out=useMemo(()=>getTotalOutstanding(),[]);
  const od=useMemo(()=>getOverdueInvoices(),[]);
  const hearings=useMemo(()=>getUpcomingHearings(14),[]);
  const causeCases=useMemo(()=>cases.filter(c=>daysUntil(c.nextHearingDate)>=0&&daysUntil(c.nextHearingDate)<=7).sort((a,b)=>new Date(a.nextHearingDate)-new Date(b.nextHearingDate)),[]);
  const activities=useMemo(()=>{ const all=[]; cases.forEach(c=>c.timeline.slice(-2).forEach(t=>all.push({...t,caseTitle:c.title,caseId:c.id}))); return all.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8); },[]);
  const {navigate}=useRouter();

  const statusData=[
    {label:'Active',value:12,color:'linear-gradient(to top, rgba(34,197,94,0.45), rgba(74,222,128,0.75))'},
    {label:'Pending',value:1,color:'linear-gradient(to top, rgba(234,179,8,0.45), rgba(253,224,71,0.75))'},
    {label:'Critical',value:3,color:'linear-gradient(to top, rgba(239,68,68,0.45), rgba(248,113,113,0.75))'},
    {label:'High',value:5,color:'linear-gradient(to top, rgba(249,115,22,0.45), rgba(251,146,60,0.75))'}
  ];
  const revData=[{label:'Oct',value:1200000},{label:'Nov',value:980000},{label:'Dec',value:1550000},{label:'Jan',value:890000},{label:'Feb',value:1320000},{label:'Mar',value:1650000}];
  const typeIcon={Filing:'fa-file-alt',Hearing:'fa-gavel',Order:'fa-scroll',Adjournment:'fa-clock',Stage:'fa-layer-group',Registration:'fa-stamp'};
  const typeColor={Filing:'text-blue-400 bg-blue-500/8',Hearing:'text-purple-400 bg-purple-500/8',Order:'text-amber-400 bg-amber-500/8',Adjournment:'text-red-400 bg-red-500/8',Stage:'text-emerald-400 bg-emerald-500/8',Registration:'text-cyan-400 bg-cyan-500/8'};

  return React.createElement('div',{className:'space-y-7'},
    // 1. HERO – AI (animates FIRST)
    React.createElement(AIAssistantCard),

    // 2. METRICS (animate SECOND with stagger)
    React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'},
      React.createElement(MetricCard,{icon:'fa-briefcase',iconBg:'bg-indigo-500/10 text-indigo-400',label:'Total Cases',value:cases.length,delay:0.15,sparkData:[40,65,55,80,70,90,85,100]}),
      React.createElement(MetricCard,{icon:'fa-bolt',iconBg:'bg-emerald-500/10 text-emerald-400',label:'Active Cases',value:ac.length,trend:'+2 this month',trendUp:true,delay:0.22,sparkData:[50,60,55,70,75,85,90,92]}),
      React.createElement(MetricCard,{icon:'fa-indian-rupee-sign',iconBg:'bg-amber-500/10 text-amber-400',label:'Revenue (Paid)',value:rev,prefix:'₹',delay:0.29,sparkData:[30,45,65,40,55,70]}),
      React.createElement(MetricCard,{icon:'fa-clock',iconBg:'bg-red-500/10 text-red-400',label:'Outstanding',value:out,prefix:'₹',trend:`${od.length} overdue`,trendUp:false,delay:0.36,sparkData:[70,60,80,65,50,75]})
    ),

    // 3. CHARTS (animate THIRD)
    React.createElement(FadeUp,{delay:0.4,className:'grid grid-cols-1 lg:grid-cols-2 gap-4'},
      React.createElement('div',{className:'glass-card-flat p-6'},
        React.createElement('div',{className:'flex items-center justify-between mb-5'},
          React.createElement('h3',{className:'text-[14px] font-semibold text-white'},'Case Status Overview'),
          React.createElement('span',{className:'text-[10px] text-surface-600 font-medium'},'By priority')
        ),
        React.createElement(BarChart,{data:statusData,height:80})
      ),
      React.createElement('div',{className:'glass-card-flat p-6'},
        React.createElement('div',{className:'flex items-center justify-between mb-5'},
          React.createElement('h3',{className:'text-[14px] font-semibold text-white'},'Monthly Revenue'),
          React.createElement('span',{className:'text-[10px] text-surface-600 font-medium'},'Last 6 months')
        ),
        React.createElement(BarChart,{data:revData,height:80})
      )
    ),

    // 4. HEARINGS + CAUSE LIST (animate FOURTH)
    React.createElement(Stagger,{className:'grid grid-cols-1 lg:grid-cols-2 gap-4',delayStart:0.45},
      React.createElement(ListPanel,{title:'Upcoming Hearings',subtitle:`${hearings.length} scheduled`,dotColor:'bg-red-400'},
        React.createElement('div',{className:'divide-y divide-white/[0.02] max-h-80 overflow-y-auto'},
          hearings.map((h,idx)=>{const d=daysUntil(h.date); const uc=d<=2?'text-red-400 font-bold':d<=5?'text-amber-400 font-semibold':'text-emerald-400 font-medium';
            return React.createElement(motion.div,{key:h.id,className:'px-5 py-3.5 cursor-pointer',
              initial:{opacity:0,x:-8}, animate:{opacity:1,x:0}, transition:{delay:0.5+idx*0.04,...easeOut},
              whileHover:{backgroundColor:'rgba(99,102,241,0.035)',x:2}, onClick:()=>h.caseId&&navigate(`/cases/${h.caseId}`)},
              React.createElement('div',{className:'flex items-center justify-between'},
                React.createElement('div',{className:'flex-1 min-w-0'},
                  React.createElement('div',{className:'text-[13px] font-medium text-surface-200 truncate'},h.title),
                  React.createElement('div',{className:'text-[11px] text-surface-500 mt-0.5'},h.court||'General')
                ),
                React.createElement('div',{className:'text-right flex-shrink-0 ml-4'},
                  React.createElement('div',{className:`text-[12px] ${uc}`},d===0?'TODAY':d===1?'TOMORROW':`${d} days`),
                  React.createElement('div',{className:'text-[10px] text-surface-600 mt-0.5'},`${formatDateShort(h.date)} · ${h.time}`)
                )
              )
            );
          })
        )
      ),
      React.createElement(ListPanel,{title:'Cause List Reminders',subtitle:'This week'},
        React.createElement('div',{className:'divide-y divide-white/[0.02]'},
          causeCases.length===0 ? React.createElement('div',{className:'p-8 text-center text-[12px] text-surface-600'},'No cause list items this week') :
          causeCases.map((c,idx)=>React.createElement(motion.div,{key:c.id,className:'px-5 py-3.5 cursor-pointer',
            initial:{opacity:0,x:-8}, animate:{opacity:1,x:0}, transition:{delay:0.5+idx*0.04,...easeOut},
            whileHover:{backgroundColor:'rgba(99,102,241,0.035)',x:2}, onClick:()=>navigate(`/cases/${c.id}`)},
            React.createElement('div',{className:'text-[10px] text-indigo-300/60 font-mono mb-1.5 tracking-wide'},c.causeListRef),
            React.createElement('div',{className:'text-[13px] text-white font-medium'},c.title),
            React.createElement('div',{className:'flex items-center gap-2 text-[11px] text-surface-500 mt-1'},
              React.createElement('span',null,c.court),
              React.createElement('span',{className:'text-surface-700'},'·'),
              React.createElement('span',{className:daysUntil(c.nextHearingDate)<=3?'text-red-400 font-medium':''},formatDate(c.nextHearingDate))
            )
          ))
        )
      )
    ),

    // 5. COURT GROUPS (animate FIFTH)
    React.createElement(FadeUp,{delay:0.55},
      React.createElement('div',{className:'flex items-center gap-3 mb-4'},
        React.createElement('div',{className:'h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent'}),
        React.createElement('h3',{className:'text-[11px] font-semibold text-surface-500 uppercase tracking-[0.14em] px-3'},'Matters by Court'),
        React.createElement('div',{className:'h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent'})
      ),
      React.createElement(Stagger,{className:'grid grid-cols-1 lg:grid-cols-3 gap-4',staggerDelay:0.08},
        React.createElement(CourtGroup,{courtType:'Supreme Court',icon:'fa-landmark'}),
        React.createElement(CourtGroup,{courtType:'High Court',icon:'fa-university'}),
        React.createElement(CourtGroup,{courtType:'District Court',icon:'fa-building-columns'})
      )
    ),

    // 6. RECENT ACTIVITY (animate LAST)
    React.createElement(FadeUp,{delay:0.6},
      React.createElement(ListPanel,{title:'Recent Activity',subtitle:'Last 30 days'},
        React.createElement('div',{className:'divide-y divide-white/[0.02]'},
          activities.map((a,i)=>React.createElement(motion.div,{key:i,className:'px-5 py-3.5 cursor-pointer flex items-center gap-3.5',
            initial:{opacity:0,x:-6}, animate:{opacity:1,x:0}, transition:{delay:0.65+i*0.03,...easeOut},
            whileHover:{backgroundColor:'rgba(99,102,241,0.035)',x:2}, onClick:()=>navigate(`/cases/${a.caseId}`)},
            React.createElement('div',{className:`w-9 h-9 rounded-xl ${typeColor[a.type]||'bg-surface-800 text-surface-400'} flex items-center justify-center flex-shrink-0`},
              React.createElement('i',{className:`fas ${typeIcon[a.type]||'fa-circle'} text-[11px]`})),
            React.createElement('div',{className:'flex-1 min-w-0'},
              React.createElement('div',{className:'text-[13px] text-surface-200 truncate'},a.description),
              React.createElement('div',{className:'text-[11px] text-surface-500 mt-0.5 truncate'},a.caseTitle)
            ),
            React.createElement('span',{className:'text-[11px] text-surface-600 flex-shrink-0 bg-surface-950/30 px-2 py-0.5 rounded-md'},formatDateShort(a.date))
          ))
        )
      )
    )
  );
};

// ============================================================
// SECTION 9: CASES LIST
// ============================================================
// Add Case Modal
const AddCaseModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', caseNumber: '', courtName: '', stage: 0, nextHearingDate: '', client: '', priority: 'Medium', status: 'Active', advocate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentUser = window.__lfUser;
  const isAdmin = currentUser && currentUser.role === 'admin';
  const lawyerUsers = useMemo(() => users.filter(u => u.role === 'lawyer'), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = { ...form };
    // Set courtKey from courtName
    const courtKey = Object.keys(COURTS).find(k => COURTS[k] === form.courtName);
    if (courtKey) payload.courtKey = courtKey;
    // If client is selected, set clientName too
    const cl = clients.find(c => c.id === form.client || c._id === form.client);
    if (cl) payload.clientName = cl.name;
    // Advocate name
    if (form.advocate) {
      const adv = users.find(u => (u.id || u._id) === form.advocate);
      if (adv) payload.advocateName = adv.name;
    }
    const res = await window.lfAPI.createCase(payload);
    if (res.success) {
      await reloadCases();
      onCreated();
      onClose();
    } else {
      setError(res.message || 'Failed to create case.');
    }
    setSaving(false);
  };

  return React.createElement(motion.div, {
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm',
    initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 },
    onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
  },
    React.createElement(motion.div, {
      className: 'glass-card p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto',
      initial: { opacity: 0, scale: 0.95, y: 20 }, animate: { opacity: 1, scale: 1, y: 0 },
      transition: { duration: 0.35, ease: [0.22,1,0.36,1] },
      onClick: e => e.stopPropagation()
    },
      React.createElement('div', { className: 'relative z-10' },
        React.createElement('div', { className: 'flex items-center justify-between mb-6' },
          React.createElement('h2', { className: 'text-xl font-bold text-white tracking-tight' }, 'Add New Case'),
          React.createElement(motion.div, { className: 'w-8 h-8 rounded-lg glass-inner flex items-center justify-center cursor-pointer text-surface-500 hover:text-white transition-colors',
            onClick: onClose, whileHover: { scale: 1.1 }, whileTap: { scale: 0.9 } },
            React.createElement('i', { className: 'fas fa-times text-[12px]' })
          )
        ),
        error && React.createElement(motion.div, { className: 'mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]',
          initial: { opacity: 0 }, animate: { opacity: 1 } }, React.createElement('i', { className: 'fas fa-exclamation-circle mr-2' }), error),
        React.createElement('form', { onSubmit: handleSubmit, className: 'space-y-4' },
          // Case Title
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Case Title *'),
            React.createElement('input', { type: 'text', required: true, value: form.title, onChange: e => setForm({...form, title: e.target.value}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]', placeholder: 'e.g. ABC Corp vs. XYZ Ltd.' })
          ),
          // Case Number
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Case Number *'),
            React.createElement('input', { type: 'text', required: true, value: form.caseNumber, onChange: e => setForm({...form, caseNumber: e.target.value}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]', placeholder: 'e.g. WP(C) 123/2026' })
          ),
          // Client
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Client *'),
            React.createElement('select', { required: true, value: form.client, onChange: e => setForm({...form, client: e.target.value}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]' },
              React.createElement('option', { value: '' }, 'Select a client...'),
              clients.map(c => React.createElement('option', { key: c.id || c._id, value: c.id || c._id }, c.name))
            )
          ),
          // Court Name
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Court Name *'),
            React.createElement('select', { required: true, value: form.courtName, onChange: e => setForm({...form, courtName: e.target.value}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]' },
              React.createElement('option', { value: '' }, 'Select a court...'),
              Object.values(COURTS).map(c => React.createElement('option', { key: c, value: c }, c))
            )
          ),
          // Two columns: Stage + Priority
          React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Stage'),
              React.createElement('select', { value: form.stage, onChange: e => setForm({...form, stage: Number(e.target.value)}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]' },
                MATTER_STAGES.map((s, i) => React.createElement('option', { key: i, value: i }, s))
              )
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Priority'),
              React.createElement('select', { value: form.priority, onChange: e => setForm({...form, priority: e.target.value}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]' },
                ['Critical', 'High', 'Medium', 'Low'].map(p => React.createElement('option', { key: p, value: p }, p))
              )
            )
          ),
          // Advocate (admin can assign, lawyer auto-assigns)
          isAdmin && React.createElement('div', null,
            React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Assign Advocate'),
            React.createElement('select', { value: form.advocate, onChange: e => setForm({...form, advocate: e.target.value}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]' },
              React.createElement('option', { value: '' }, 'Auto-assign (self)'),
              lawyerUsers.map(u => React.createElement('option', { key: u.id || u._id, value: u.id || u._id }, u.name))
            )
          ),
          // Next Hearing Date
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5' }, 'Next Hearing Date'),
            React.createElement('input', { type: 'date', value: form.nextHearingDate, onChange: e => setForm({...form, nextHearingDate: e.target.value}), className: 'w-full py-2.5 px-4 rounded-xl text-[13px]' })
          ),
          // Submit
          React.createElement('div', { className: 'flex items-center gap-3 pt-3' },
            React.createElement('button', { type: 'submit', disabled: saving, className: `btn-primary py-2.5 px-6 text-[13px] flex-1 ${saving ? 'opacity-60 cursor-wait' : ''}` },
              saving ? React.createElement('span', null, React.createElement('i', { className: 'fas fa-circle-notch fa-spin mr-2' }), 'Creating...') :
              React.createElement('span', null, React.createElement('i', { className: 'fas fa-plus mr-2' }), 'Create Case')
            ),
            React.createElement('button', { type: 'button', onClick: onClose, className: 'btn-ghost py-2.5 px-6 text-[13px]' }, 'Cancel')
          )
        )
      )
    )
  );
};

const CasesPage = () => {
  const [filter,setFilter]=useState('All');
  const [search,setSearch]=useState('');
  const [sortBy,setSortBy]=useState('nextHearing');
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const {navigate}=useRouter();
  const filtered=useMemo(()=>{
    let r=cases;
    if(filter!=='All') r=r.filter(c=>c.priority===filter||c.status===filter);
    if(search){const s=search.toLowerCase(); r=r.filter(c=>(c.title||'').toLowerCase().includes(s)||(c.caseNumber||'').toLowerCase().includes(s)||(c.clientName||'').toLowerCase().includes(s)||(c.court||'').toLowerCase().includes(s));}
    if(sortBy==='nextHearing') r=[...r].sort((a,b)=>new Date(a.nextHearingDate||0)-new Date(b.nextHearingDate||0));
    if(sortBy==='priority'){const o={Critical:0,High:1,Medium:2,Low:3}; r=[...r].sort((a,b)=>(o[a.priority]||9)-(o[b.priority]||9));}
    if(sortBy==='name') r=[...r].sort((a,b)=>(a.title||'').localeCompare(b.title||''));
    return r;
  },[filter,search,sortBy,refreshKey]);
  const opts=['All','Active','Pending','Critical','High','Medium','Low'];

  return React.createElement('div',{className:'space-y-6'},
    React.createElement(FadeUp,{className:'flex flex-wrap items-center gap-3'},
      React.createElement('div',{className:'relative flex-1 max-w-md'},
        React.createElement('i',{className:'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 text-[11px]'}),
        React.createElement('input',{type:'text',placeholder:'Search cases…',className:'w-full pl-8 pr-3 py-[8px] rounded-[11px] text-[13px]',value:search,onChange:e=>setSearch(e.target.value)})
      ),
      React.createElement('div',{className:'tab-bar'},
        opts.map(f=>React.createElement('button',{key:f,className:`tab-btn ${filter===f?'active':''}`,onClick:()=>setFilter(f)},f))
      ),
      React.createElement('select',{className:'rounded-[11px] text-[13px] py-[8px]',value:sortBy,onChange:e=>setSortBy(e.target.value)},
        React.createElement('option',{value:'nextHearing'},'Next Hearing'),React.createElement('option',{value:'priority'},'Priority'),React.createElement('option',{value:'name'},'Name')),
      React.createElement(motion.div, { role: 'button', className: 'btn-primary text-[13px] px-4 py-[8px] flex items-center gap-2', onClick: () => setShowAddModal(true),
        whileHover: { scale: 1.03 }, whileTap: { scale: 0.97 } },
        React.createElement('i', { className: 'fas fa-plus text-[11px]' }), 'Add Case'
      )
    ),
    React.createElement(FadeIn,{delay:0.08,className:'text-[12px] text-surface-500 font-medium'},`Showing ${filtered.length} of ${cases.length} cases`),

    React.createElement(AnimatePresence,{mode:'wait'},
      React.createElement(motion.div,{key:filter+sortBy+search,
        initial:{opacity:0}, animate:{opacity:1}, transition:{duration:0.3}},
        React.createElement(Stagger,{className:'grid grid-cols-1 lg:grid-cols-2 gap-4',staggerDelay:0.04,delayStart:0.1},
          filtered.map(c=>{
            const du = daysUntil(c.nextHearingDate);
            const urgentHearing = du <= 3;
            return React.createElement(StaggerItem,{key:c.id},
              React.createElement(motion.div,{className:'glass-card p-5 cursor-pointer',
                whileHover:{y:-4, scale:1.008,
                  boxShadow:'0 24px 56px -16px rgba(99,102,241,0.16), 0 8px 24px -6px rgba(0,0,0,0.35)',
                  borderColor:'rgba(99,102,241,0.18)'},
                whileTap:{scale:0.995},
                onClick:()=>navigate(`/cases/${c.id}`)},
                React.createElement('div',{className:'relative z-10'},
                  React.createElement('div',{className:'flex items-start justify-between mb-3.5'},
                    React.createElement('div',{className:'flex-1 min-w-0'},
                      React.createElement('h3',{className:'text-[14px] font-semibold text-white truncate mb-1.5 tracking-tight'},c.title),
                      React.createElement('div',{className:'flex items-center gap-2 flex-wrap'},
                        React.createElement('span',{className:'text-[11px] font-mono text-indigo-300/80 bg-indigo-500/8 px-2 py-0.5 rounded-md'},c.caseNumber),
                        React.createElement(StatusBadge,{status:c.status})
                      )
                    ),
                    React.createElement(PriorityBadge,{priority:c.priority})
                  ),
                  React.createElement('div',{className:'grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12px] mb-3'},
                    [{l:'Court',v:c.court,i:'fa-landmark'},{l:'Client',v:c.clientName,i:'fa-building'},{l:'Next Hearing',v:formatDate(c.nextHearingDate),hl:urgentHearing,i:'fa-calendar-check'},{l:'Advocate',v:c.advocate,i:'fa-user-tie'}].map((x,i)=>
                      React.createElement('div',{key:i,className:'flex items-start gap-1.5'},
                        React.createElement('i',{className:`fas ${x.i} text-[9px] text-surface-600 mt-[3px]`}),
                        React.createElement('div',null,
                          React.createElement('span',{className:'text-surface-600 text-[10px] block'},x.l),
                          React.createElement('div',{className:`mt-0.5 truncate font-medium ${x.hl?'text-red-400':'text-surface-300'}`},x.v)
                        )
                      )
                    )
                  ),
                  // Next hearing alert inline
                  urgentHearing && React.createElement(motion.div,{
                    className:'flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/[0.06] border border-red-500/[0.08] mb-3',
                    initial:{opacity:0,height:0}, animate:{opacity:1,height:'auto'}},
                    React.createElement('i',{className:'fas fa-exclamation-circle text-red-400 text-[10px]'}),
                    React.createElement('span',{className:'text-[11px] text-red-300 font-medium'},du===0?'Hearing TODAY':du===1?'Hearing TOMORROW':`Hearing in ${du} days`)
                  ),
                  // Matter stage bar
                  React.createElement('div',{className:'pt-3 border-t border-white/[0.03]'},
                    React.createElement('div',{className:'flex items-center justify-between text-[11px] mb-2'},
                      React.createElement('span',{className:'text-surface-500 font-medium'},'Matter Stage'),
                      React.createElement('span',{className:'text-indigo-300/90 font-semibold'},MATTER_STAGES[c.matterStage])
                    ),
                    React.createElement('div',{className:'flex gap-[3px]'},
                      MATTER_STAGES.map((_,i)=>React.createElement(motion.div,{key:i,
                        className:`h-[5px] flex-1 rounded-full`,
                        style:{background:i<c.matterStage?'linear-gradient(90deg, rgba(99,102,241,0.7), rgba(129,140,248,0.7))':i===c.matterStage?'linear-gradient(90deg, rgba(129,140,248,0.5), rgba(165,180,252,0.4))':'rgba(30,41,59,0.4)'},
                        initial:{scaleX:0,opacity:0}, animate:{scaleX:1,opacity:1},
                        transition:{delay:0.15+i*0.04,duration:0.55,ease:[0.22,1,0.36,1]},
                        layout:true
                      }))
                    )
                  )
                )
              )
            );
          })
        )
      )
    ),
    filtered.length===0 && React.createElement(EmptyState,{icon:'fa-briefcase',title:'No cases found',subtitle:'Try adjusting your search criteria or filters to find what you need.'}),
    // Add Case Modal
    showAddModal && React.createElement(AddCaseModal, { onClose: () => setShowAddModal(false), onCreated: () => setRefreshKey(k => k + 1) })
  );
};

// ============================================================
// SECTION 10: CASE DETAILS
// ============================================================
const CaseDetailsPage = ({params}) => {
  const caseId=params?.id;
  const cd=useMemo(()=>cases.find(c=>c.id===caseId),[caseId]);
  const [tab,setTab]=useState('overview');
  const {navigate}=useRouter();
  if(!cd) return React.createElement(EmptyState,{icon:'fa-exclamation-circle',title:'Case Not Found',subtitle:'The case you are looking for does not exist.'});
  const docs=useMemo(()=>getDocumentsForCase(caseId),[caseId]);
  const tks=useMemo(()=>getTasksForCase(caseId),[caseId]);
  const invs=useMemo(()=>getInvoicesForCase(caseId),[caseId]);
  const tabs=[{k:'overview',l:'Overview',i:'fa-info-circle'},{k:'documents',l:'Documents',i:'fa-folder'},{k:'tasks',l:'Tasks',i:'fa-tasks'},{k:'billing',l:'Billing',i:'fa-file-invoice-dollar'},{k:'timeline',l:'Timeline',i:'fa-clock'}];
  const tIcon={Filing:'fa-file-alt',Hearing:'fa-gavel',Order:'fa-scroll',Adjournment:'fa-clock',Stage:'fa-layer-group',Registration:'fa-stamp'};
  const tDotCls={Filing:'filing',Hearing:'hearing',Order:'order',Adjournment:'adjournment',Stage:'stage',Registration:'filing'};

  return React.createElement('div',{className:'space-y-5'},
    // Back button
    React.createElement(motion.div||'div',{className:'flex items-center gap-2 text-[13px] text-surface-500 hover:text-white transition-colors group cursor-pointer',
      onClick:()=>navigate('/cases'),whileHover:{x:-3},whileTap:{scale:0.97}},
      React.createElement('i',{className:'fas fa-arrow-left text-[11px] group-hover:text-indigo-400 transition-colors'}),'Back to Cases'),

    // Summary Card
    React.createElement(FadeUp,{delay:0},
      React.createElement('div',{className:'glass-card p-7'},
        React.createElement('div',{className:'relative z-10'},
          React.createElement('div',{className:'flex items-start justify-between mb-5 flex-wrap gap-4'},
            React.createElement('div',null,
              React.createElement(motion.div||'div',{className:'text-xl font-bold text-white mb-2.5 tracking-tight',
                initial:{opacity:0,y:8}, animate:{opacity:1,y:0}, transition:{delay:0.05,...easeOut}
              },cd.title),
              React.createElement('div',{className:'flex items-center gap-2.5 flex-wrap'},
                React.createElement(motion.div||'div',{className:'text-[12px] font-mono text-indigo-300/80 bg-indigo-500/8 px-2.5 py-1 rounded-lg inline-block',
                  initial:{opacity:0,scale:0.9}, animate:{opacity:1,scale:1}, transition:{delay:0.1,...springGentle}},cd.caseNumber),
                React.createElement(StatusBadge,{status:cd.status}),
                React.createElement(PriorityBadge,{priority:cd.priority})
              )
            )
          ),
          // Key info cards
          React.createElement(Stagger,{className:'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3',staggerDelay:0.03,delayStart:0.1},
            [{l:'Court',v:cd.court,i:'fa-landmark'},{l:'Next Hearing',v:formatDate(cd.nextHearingDate),i:'fa-calendar-check',hl:daysUntil(cd.nextHearingDate)<=7},{l:'Last Order',v:formatDate(cd.lastOrderDate),i:'fa-scroll'},{l:'Filing Deadline',v:formatDate(cd.filingDeadline),i:'fa-hourglass-half'},{l:'Filing Type',v:cd.filingType,i:'fa-file-alt'},{l:'Advocate',v:cd.advocate,i:'fa-user-tie'}].map((x,i)=>
              React.createElement(StaggerItem,{key:i},
                React.createElement('div',{className:`p-3.5 glass-inner ${x.hl?'ring-1 ring-red-500/15':''}`},
                  React.createElement('div',{className:'flex items-center gap-1.5 text-surface-500 mb-1.5'},
                    React.createElement('i',{className:`fas ${x.i} text-[9px]`}),
                    React.createElement('span',{className:'text-[10px] font-semibold uppercase tracking-wide'},x.l)
                  ),
                  React.createElement('div',{className:`text-[12px] font-semibold ${x.hl?'text-red-300':'text-white'} truncate`},x.v)
                )
              )
            )
          ),
          // Last hearing outcome
          React.createElement(motion.div,{className:'mt-3 p-3.5 glass-inner',initial:{opacity:0},animate:{opacity:1},transition:{delay:0.3}},
            React.createElement('div',{className:'text-[10px] text-surface-500 mb-1.5 font-semibold uppercase tracking-wide'},React.createElement('i',{className:'fas fa-gavel mr-1.5'}),'Last Hearing Outcome'),
            React.createElement('div',{className:'text-[13px] text-surface-300 leading-relaxed'},cd.lastHearingOutcome)
          ),
          // Extra info
          React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-3 gap-3 mt-3'},
            [{l:'Bench / Jurisdiction',v:cd.bench},{l:'Opposing Party',v:cd.opposingParty},{l:'Diary Number',v:cd.diaryNumber,mono:true}].map((x,i)=>
              React.createElement(motion.div,{key:i,className:'p-3.5 glass-inner',initial:{opacity:0,y:6},animate:{opacity:1,y:0},transition:{delay:0.35+i*0.05,...easeOut}},
                React.createElement('div',{className:'text-[10px] text-surface-500 mb-1 font-semibold uppercase tracking-wide'},x.l),
                React.createElement('div',{className:`text-[12px] text-surface-300 ${x.mono?'font-mono':''}`},x.v)
              )
            )
          )
        )
      )
    ),

    // Stepper
    React.createElement(FadeUp,{delay:0.1},
      React.createElement('div',{className:'glass-card p-5'},
        React.createElement('div',{className:'relative z-10'},
          React.createElement('div',{className:'flex items-center gap-2.5 mb-1'},
            React.createElement('h3',{className:'text-[14px] font-semibold text-white'},'Matter Stage Progression'),
            React.createElement('span',{className:'text-[10px] text-indigo-300/80 bg-indigo-500/8 px-2.5 py-0.5 rounded-lg font-semibold'},MATTER_STAGES[cd.matterStage])
          ),
          React.createElement(MatterStageStepper,{currentStage:cd.matterStage})
        )
      )
    ),

    // Tabs
    React.createElement(FadeUp,{delay:0.15},
      React.createElement('div',{className:'tab-bar w-fit'},
        tabs.map(t=>React.createElement(motion.div||'div',{key:t.k,
          className:`tab-btn flex items-center gap-1.5 ${tab===t.k?'active':''} cursor-pointer`,
          onClick:()=>setTab(t.k),
          whileHover:{scale:1.02}, whileTap:{scale:0.97}
        },
          React.createElement('i',{className:`fas ${t.i} text-[10px]`}),t.l
        ))
      )
    ),

    // Tab content with transition
    React.createElement(AnimatePresence,{mode:'wait'},
      React.createElement(motion.div,{key:tab, initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, exit:{opacity:0,y:-8}, transition:{duration:0.35,ease:[0.22,1,0.36,1]}},

        // OVERVIEW TAB
        tab==='overview' && React.createElement('div',{className:'space-y-4'},
          React.createElement(ScaleIn,{delay:0.05},
            React.createElement('div',{className:'glass-card-flat p-6'},
              React.createElement('h3',{className:'text-[14px] font-semibold text-white mb-3'},'Case Description'),
              React.createElement('p',{className:'text-[13px] text-surface-400 leading-relaxed'},cd.description)
            )
          ),
          React.createElement(ScaleIn,{delay:0.1},
            React.createElement('div',{className:'glass-card-flat p-6'},
              React.createElement('h3',{className:'text-[14px] font-semibold text-white mb-3'},'Cause List Reference'),
              React.createElement('div',{className:'text-[12px] text-indigo-300/80 font-mono glass-inner p-3.5 tracking-wide'},cd.causeListRef)
            )
          ),
          cd.adjournmentHistory.length>0 && React.createElement(ScaleIn,{delay:0.15},
            React.createElement('div',{className:'glass-card-flat p-6'},
              React.createElement('h3',{className:'text-[14px] font-semibold text-white mb-4'},'Adjournment History'),
              React.createElement(Stagger,{className:'space-y-3',staggerDelay:0.05},
                cd.adjournmentHistory.map((a,i)=>React.createElement(StaggerItem,{key:i},
                  React.createElement('div',{className:'flex items-start gap-3.5 p-3.5 rounded-xl bg-red-500/[0.03] border border-red-500/[0.06]'},
                    React.createElement(motion.div,{className:'w-9 h-9 rounded-xl bg-red-500/8 flex items-center justify-center flex-shrink-0',
                      animate:{scale:[1,1.05,1]},transition:{duration:3,repeat:Infinity,delay:i*0.3}},
                      React.createElement('i',{className:'fas fa-clock text-red-400/70 text-[11px]'})
                    ),
                    React.createElement('div',{className:'flex-1'},
                      React.createElement('div',{className:'text-[13px] text-surface-300 leading-relaxed'},a.reason),
                      React.createElement('div',{className:'text-[11px] text-surface-500 mt-1.5 flex items-center gap-1.5'},
                        React.createElement('span',null,formatDate(a.date)),
                        React.createElement('i',{className:'fas fa-arrow-right text-[8px] text-surface-600'}),
                        React.createElement('span',null,formatDate(a.nextDate))
                      )
                    )
                  )
                ))
              )
            )
          ),
          React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 gap-4'},
            React.createElement(ScaleIn,{delay:0.2},
              React.createElement('div',{className:'glass-card-flat p-6'},
                React.createElement('h3',{className:'text-[14px] font-semibold text-white mb-4'},'Key Dates'),
                React.createElement('div',{className:'space-y-2'},
                  [{l:'Filing Date',v:formatDate(cd.filingDate)},{l:'Registration',v:formatDate(cd.registrationDate)},{l:'Next Hearing',v:formatDate(cd.nextHearingDate),hl:daysUntil(cd.nextHearingDate)<=7},{l:'Last Order',v:formatDate(cd.lastOrderDate)},{l:'Filing Deadline',v:formatDate(cd.filingDeadline)},{l:'Next Action',v:formatDate(cd.nextActionDate)}].map((d,i)=>
                    React.createElement('div',{key:i,className:'flex justify-between items-center py-1.5 text-[12px] border-b border-white/[0.02] last:border-0'},
                      React.createElement('span',{className:'text-surface-500 font-medium'},d.l),
                      React.createElement('span',{className:`font-semibold ${d.hl?'text-red-300':'text-surface-300'}`},d.v)
                    )
                  )
                )
              )
            ),
            React.createElement(ScaleIn,{delay:0.25},
              React.createElement('div',{className:'glass-card-flat p-6'},
                React.createElement('h3',{className:'text-[14px] font-semibold text-white mb-4'},'Billing Summary'),
                React.createElement('div',{className:'space-y-2'},
                  [{l:'Billing Type',v:cd.billingType},{l:'Total Billed',v:formatINR(cd.totalBilled)},{l:'Total Paid',v:formatINR(cd.totalPaid)},{l:'Outstanding',v:formatINR(cd.totalBilled-cd.totalPaid),hl:cd.totalBilled>cd.totalPaid}].map((d,i)=>
                    React.createElement('div',{key:i,className:'flex justify-between items-center py-1.5 text-[12px] border-b border-white/[0.02] last:border-0'},
                      React.createElement('span',{className:'text-surface-500 font-medium'},d.l),
                      React.createElement('span',{className:`font-semibold ${d.hl?'text-amber-400':'text-surface-300'}`},d.v)
                    )
                  )
                ),
                // Mini progress bar
                React.createElement('div',{className:'mt-4'},
                  React.createElement('div',{className:'flex justify-between text-[10px] mb-1.5'},
                    React.createElement('span',{className:'text-surface-500 font-medium'},'Collection Progress'),
                    React.createElement('span',{className:'text-indigo-300/80 font-semibold'},`${Math.round((cd.totalPaid/cd.totalBilled)*100)}%`)
                  ),
                  React.createElement('div',{className:'h-2 bg-surface-900/60 rounded-full overflow-hidden'},
                    React.createElement(motion.div,{className:'h-full rounded-full',
                      style:{background:'linear-gradient(90deg, #6366f1, #a5b4fc)'},
                      initial:{width:'0%'}, animate:{width:`${(cd.totalPaid/cd.totalBilled)*100}%`},
                      transition:{delay:0.3,duration:1,ease:[0.22,1,0.36,1]}
                    })
                  )
                )
              )
            )
          )
        ),

        // DOCUMENTS TAB
        tab==='documents' && (docs.length===0 ? React.createElement(EmptyState,{icon:'fa-folder-open',title:'No Documents',subtitle:'No documents have been uploaded for this case yet.'}) :
          React.createElement(ScaleIn,{},
            React.createElement('div',{className:'glass-card-flat overflow-hidden rounded-2xl'}, React.createElement('div',{className:'overflow-x-auto'},
              React.createElement('table',{className:'premium-table'},
                React.createElement('thead',null, React.createElement('tr',null, ['Document','Type','Category','Date','Size','Status'].map(h=>React.createElement('th',{key:h},h)))),
                React.createElement('tbody',null, docs.map(d=>React.createElement('tr',{key:d.id},
                  React.createElement('td',null, React.createElement('div',{className:'flex items-center gap-2.5'}, React.createElement('div',{className:'w-8 h-8 rounded-lg bg-indigo-500/8 flex items-center justify-center'}, React.createElement('i',{className:'fas fa-file-alt text-indigo-400/70 text-[11px]'})), React.createElement('span',{className:'text-[13px] text-white font-medium'},d.title))),
                  React.createElement('td',{className:'text-surface-400'},d.type),
                  React.createElement('td',{className:'text-surface-500'},d.category),
                  React.createElement('td',{className:'text-surface-500'},formatDate(d.uploadDate)),
                  React.createElement('td',{className:'text-surface-500'},d.size),
                  React.createElement('td',null, React.createElement(StatusBadge,{status:d.status}))
                )))
              )
            ))
          )
        ),

        // TASKS TAB
        tab==='tasks' && (tks.length===0 ? React.createElement(EmptyState,{icon:'fa-tasks',title:'No Tasks',subtitle:'No tasks have been created for this case yet.'}) :
          React.createElement(Stagger,{className:'space-y-3',staggerDelay:0.05},
            tks.map(t=>React.createElement(StaggerItem,{key:t.id},
              React.createElement(motion.div,{className:'glass-card-flat p-4.5 flex items-center gap-4',
                whileHover:{x:3,backgroundColor:'rgba(99,102,241,0.02)'},transition:easeOutFast},
                React.createElement(motion.div,{className:`w-3 h-3 rounded-full flex-shrink-0 ${t.status==='Overdue'?'bg-red-500':t.status==='In Progress'?'bg-blue-400':t.status==='Completed'?'bg-emerald-400':'bg-surface-600'}`,
                  animate:t.status==='Overdue'?{scale:[1,1.4,1],opacity:[1,0.6,1]}:{}, transition:{duration:1.5,repeat:Infinity}},
                ),
                React.createElement('div',{className:'flex-1 min-w-0'},
                  React.createElement('div',{className:'text-[13px] font-medium text-white'},t.title),
                  React.createElement('div',{className:'text-[11px] text-surface-500 mt-0.5'},`${t.assignee} · Due: ${formatDate(t.dueDate)}`)
                ),
                React.createElement('div',{className:'flex items-center gap-2 flex-shrink-0'}, React.createElement(PriorityBadge,{priority:t.priority}), React.createElement(StatusBadge,{status:t.status}))
              )
            ))
          )
        ),

        // BILLING TAB
        tab==='billing' && (invs.length===0 ? React.createElement(EmptyState,{icon:'fa-file-invoice-dollar',title:'No Invoices',subtitle:'No invoices have been generated for this case yet.'}) :
          React.createElement(ScaleIn,{},
            React.createElement('div',{className:'glass-card-flat overflow-hidden rounded-2xl'}, React.createElement('div',{className:'overflow-x-auto'},
              React.createElement('table',{className:'premium-table'},
                React.createElement('thead',null, React.createElement('tr',null, ['Invoice #','Description','Amount','GST (18%)','Total','Due Date','Status'].map(h=>React.createElement('th',{key:h},h)))),
                React.createElement('tbody',null, invs.map(inv=>React.createElement('tr',{key:inv.id,
                  className:inv.status==='Overdue'?'bg-red-500/[0.02]':''},
                  React.createElement('td',{className:'font-mono text-indigo-300/80'},inv.invoiceNumber),
                  React.createElement('td',{className:'text-surface-300'},inv.description),
                  React.createElement('td',{className:'text-surface-300'},formatINR(inv.amount)),
                  React.createElement('td',{className:'text-surface-500'},formatINR(inv.gst)),
                  React.createElement('td',{className:'font-semibold text-white'},formatINR(inv.total)),
                  React.createElement('td',{className:inv.status==='Overdue'?'text-red-400 font-semibold':'text-surface-500'},formatDate(inv.dueDate)),
                  React.createElement('td',null, React.createElement(StatusBadge,{status:inv.status}))
                )))
              )
            ))
          )
        ),

        // TIMELINE TAB
        tab==='timeline' && React.createElement(ScaleIn,{},
          React.createElement('div',{className:'glass-card-flat p-6 rounded-2xl'},
            React.createElement(Stagger,{className:'space-y-0',staggerDelay:0.05},
              [...cd.timeline].reverse().map((ev,i)=>React.createElement(StaggerItem,{key:i},
                React.createElement('div',{className:'tl-item'},
                  React.createElement('div',{className:`tl-dot ${tDotCls[ev.type]||''}`}),
                  React.createElement(motion.div,{className:'glass-inner p-3.5',
                    whileHover:{x:3,borderColor:'rgba(99,102,241,0.08)'},transition:easeOutFast},
                    React.createElement('div',{className:'flex items-center gap-2 mb-1.5'},
                      React.createElement('i',{className:`fas ${tIcon[ev.type]||'fa-circle'} text-[9px] text-surface-500`}),
                      React.createElement('span',{className:'text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-300/70'},ev.type),
                      React.createElement('span',{className:'text-[10px] text-surface-600'},'·'),
                      React.createElement('span',{className:'text-[10px] text-surface-500 font-medium'},formatDate(ev.date))
                    ),
                    React.createElement('p',{className:'text-[13px] text-surface-300 leading-relaxed'},ev.description)
                  )
                )
              ))
            )
          )
        )
      )
    )
  );
};

// ============================================================
// SECTION 11: CLIENTS
// ============================================================
const ClientsPage = () => {
  const [search,setSearch]=useState('');
  const [tf,setTf]=useState('All');
  const filtered=useMemo(()=>{
    let r=clients;
    if(tf!=='All') r=r.filter(c=>c.type===tf);
    if(search){const s=search.toLowerCase(); r=r.filter(c=>c.name.toLowerCase().includes(s)||c.industry.toLowerCase().includes(s));}
    return r;
  },[search,tf]);
  return React.createElement('div',{className:'space-y-6'},
    React.createElement(FadeUp,{className:'flex flex-wrap items-center gap-3'},
      React.createElement('div',{className:'relative flex-1 max-w-md'},
        React.createElement('i',{className:'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 text-[11px]'}),
        React.createElement('input',{type:'text',placeholder:'Search clients…',className:'w-full pl-8 pr-3 py-[8px] rounded-[11px] text-[13px]',value:search,onChange:e=>setSearch(e.target.value)})
      ),
      React.createElement('div',{className:'tab-bar'}, ['All','Corporate','Individual'].map(f=>React.createElement('button',{key:f,className:`tab-btn ${tf===f?'active':''}`,onClick:()=>setTf(f)},f)))
    ),
    React.createElement(FadeIn,{delay:0.08,className:'text-[12px] text-surface-500 font-medium'},`${filtered.length} client${filtered.length!==1?'s':''}`),
    React.createElement(Stagger,{className:'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',staggerDelay:0.05,delayStart:0.1},
      filtered.map(cl=>React.createElement(StaggerItem,{key:cl.id},
        React.createElement(motion.div,{className:'glass-card p-6 cursor-default',
          whileHover:{y:-4,scale:1.005,borderColor:'rgba(99,102,241,0.15)',
            boxShadow:'0 20px 50px -15px rgba(99,102,241,0.12), 0 8px 20px -5px rgba(0,0,0,0.35)'}},
          React.createElement('div',{className:'relative z-10'},
            React.createElement('div',{className:'flex items-start gap-4 mb-4'},
              React.createElement(motion.div,{
                className:`w-12 h-12 rounded-xl flex items-center justify-center text-[16px] font-bold ${cl.type==='Corporate'?'bg-indigo-500/10 text-indigo-400':'bg-purple-500/10 text-purple-400'}`,
                whileHover:{scale:1.08,rotate:2}
              },cl.name.charAt(0)),
              React.createElement('div',{className:'flex-1 min-w-0'},
                React.createElement('h3',{className:'text-[14px] font-semibold text-white truncate'},cl.name),
                React.createElement('div',{className:'flex items-center gap-2 mt-1.5'},
                  React.createElement('span',{className:`text-[10px] px-2.5 py-0.5 rounded-lg font-semibold ${cl.type==='Corporate'?'bg-indigo-500/8 text-indigo-300/80':'bg-purple-500/8 text-purple-300/80'}`},cl.type),
                  React.createElement('span',{className:'text-[11px] text-surface-500'},cl.industry)
                )
              )
            ),
            React.createElement('div',{className:'grid grid-cols-2 gap-3 text-[11px]'},
              [{l:'Contact',v:cl.contact,i:'fa-user'},{l:'Active Cases',v:cl.activeCases,b:true,i:'fa-briefcase'},{l:'PAN',v:cl.pan,m:true,i:'fa-id-card'},{l:'Total Billed',v:formatINR(cl.totalBilled),b:true,i:'fa-indian-rupee-sign'}].map((x,i)=>
                React.createElement('div',{key:i,className:'flex items-start gap-1.5'},
                  React.createElement('i',{className:`fas ${x.i} text-[8px] text-surface-600 mt-[3px]`}),
                  React.createElement('div',null,
                    React.createElement('span',{className:'text-surface-600 text-[10px] block'},x.l),
                    React.createElement('div',{className:`mt-0.5 text-surface-300 ${x.b?'font-semibold':''} ${x.m?'font-mono text-[10px]':''}`},x.v)
                  )
                )
              )
            ),
            cl.gst && React.createElement('div',{className:'mt-4 pt-3 border-t border-white/[0.03] text-[11px] flex items-center gap-1.5'},
              React.createElement('i',{className:'fas fa-receipt text-[9px] text-surface-600'}),
              React.createElement('span',{className:'text-surface-600'},'GST:'),
              React.createElement('span',{className:'text-surface-400 font-mono text-[10px]'},cl.gst)
            )
          )
        )
      ))
    )
  );
};

// ============================================================
// SECTION 12: DOCUMENTS
// ============================================================
const DocumentsPage = () => {
  const [search,setSearch]=useState('');
  const [tf,setTf]=useState('All');
  const [sf,setSf]=useState('All');
  const tOpts=useMemo(()=>['All',...new Set(documents.map(d=>d.type))],[]);
  const sOpts=useMemo(()=>['All',...new Set(documents.map(d=>d.status))],[]);
  const filtered=useMemo(()=>{
    let r=documents;
    if(tf!=='All') r=r.filter(d=>d.type===tf);
    if(sf!=='All') r=r.filter(d=>d.status===sf);
    if(search){const s=search.toLowerCase(); r=r.filter(d=>d.title.toLowerCase().includes(s)||d.type.toLowerCase().includes(s));}
    return r;
  },[search,tf,sf]);
  const di=(t)=>({'Vakalatnama':'fa-stamp','Power of Attorney':'fa-user-shield','Sale Deed':'fa-home','Rent Agreement':'fa-file-contract','Affidavit':'fa-file-signature','GST Filing Attachment':'fa-receipt','Aadhaar Copy':'fa-id-card','PAN Copy':'fa-id-badge','Written Statement':'fa-file-lines','Petition':'fa-file-alt','Counter Affidavit':'fa-file-shield','Court Order':'fa-gavel','Compliance Report':'fa-clipboard-check','Evidence Document':'fa-folder-open'}[t]||'fa-file');

  return React.createElement('div',{className:'space-y-5'},
    React.createElement(FadeUp,{className:'flex flex-wrap items-center gap-3'},
      React.createElement('div',{className:'relative flex-1 max-w-md'},
        React.createElement('i',{className:'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 text-[11px]'}),
        React.createElement('input',{type:'text',placeholder:'Search documents…',className:'w-full pl-8 pr-3 py-[8px] rounded-[11px] text-[13px]',value:search,onChange:e=>setSearch(e.target.value)})
      ),
      React.createElement('select',{className:'rounded-[11px] text-[13px] py-[8px]',value:tf,onChange:e=>setTf(e.target.value)}, tOpts.map(t=>React.createElement('option',{key:t,value:t},t))),
      React.createElement('select',{className:'rounded-[11px] text-[13px] py-[8px]',value:sf,onChange:e=>setSf(e.target.value)}, sOpts.map(s=>React.createElement('option',{key:s,value:s},s)))
    ),
    React.createElement(FadeIn,{delay:0.08,className:'text-[12px] text-surface-500 font-medium'},`${filtered.length} document${filtered.length!==1?'s':''}`),
    React.createElement(FadeUp,{delay:0.12},
      filtered.length===0 ? React.createElement(EmptyState,{icon:'fa-folder-open',title:'No documents found',subtitle:'Try adjusting your filters.'}) :
      React.createElement('div',{className:'glass-card-flat overflow-hidden rounded-2xl'}, React.createElement('div',{className:'overflow-x-auto'},
        React.createElement('table',{className:'premium-table'},
          React.createElement('thead',null, React.createElement('tr',null, ['Document','Type','Category','Case','Date','Size','By','Status'].map(h=>React.createElement('th',{key:h},h)))),
          React.createElement('tbody',null, filtered.map((d,idx)=>{const lc=cases.find(c=>c.id===d.caseId); return React.createElement('tr',{key:d.id},
            React.createElement('td',null, React.createElement('div',{className:'flex items-center gap-2.5'}, React.createElement('div',{className:'w-8 h-8 rounded-lg bg-indigo-500/8 flex items-center justify-center flex-shrink-0'}, React.createElement('i',{className:`fas ${di(d.type)} text-indigo-400/70 text-[11px]`})), React.createElement('span',{className:'text-white font-medium truncate max-w-[180px]'},d.title))),
            React.createElement('td',{className:'text-surface-400 whitespace-nowrap'},d.type),
            React.createElement('td',{className:'text-surface-500 whitespace-nowrap'},d.category),
            React.createElement('td',{className:'text-surface-400 truncate max-w-[140px]'},lc?.title||'—'),
            React.createElement('td',{className:'text-surface-500 whitespace-nowrap'},formatDate(d.uploadDate)),
            React.createElement('td',{className:'text-surface-500 whitespace-nowrap'},d.size),
            React.createElement('td',{className:'text-surface-500 whitespace-nowrap'},d.uploadedBy),
            React.createElement('td',{className:'whitespace-nowrap'}, React.createElement(StatusBadge,{status:d.status}))
          );}))
        )
      ))
    )
  );
};

// ============================================================
// SECTION 13: BILLING
// ============================================================
const BillingPage = () => {
  const [filter,setFilter]=useState('All');
  const [search,setSearch]=useState('');
  const filtered=useMemo(()=>{let r=invoices; if(filter!=='All') r=r.filter(i=>i.status===filter); if(search){const s=search.toLowerCase(); r=r.filter(i=>i.invoiceNumber.toLowerCase().includes(s)||i.clientName.toLowerCase().includes(s));} return r;},[filter,search]);
  const stats=useMemo(()=>({tb:invoices.reduce((s,i)=>s+i.total,0), tp:invoices.filter(i=>i.status==='Paid').reduce((s,i)=>s+i.total,0), tpn:invoices.filter(i=>i.status==='Pending').reduce((s,i)=>s+i.total,0), to:invoices.filter(i=>i.status==='Overdue').reduce((s,i)=>s+i.total,0)}),[]);

  return React.createElement('div',{className:'space-y-6'},
    // Metric cards
    React.createElement('div',{className:'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'},
      React.createElement(MetricCard,{icon:'fa-file-invoice-dollar',iconBg:'bg-indigo-500/10 text-indigo-400',label:'Total Billed',value:stats.tb,prefix:'₹',delay:0}),
      React.createElement(MetricCard,{icon:'fa-check-circle',iconBg:'bg-emerald-500/10 text-emerald-400',label:'Paid',value:stats.tp,prefix:'₹',delay:0.06}),
      React.createElement(MetricCard,{icon:'fa-clock',iconBg:'bg-amber-500/10 text-amber-400',label:'Pending',value:stats.tpn,prefix:'₹',delay:0.12}),
      React.createElement(MetricCard,{icon:'fa-exclamation-triangle',iconBg:'bg-red-500/10 text-red-400',label:'Overdue',value:stats.to,prefix:'₹',delay:0.18})
    ),
    // Collection progress
    React.createElement(FadeUp,{delay:0.2},
      React.createElement('div',{className:'glass-card-flat p-5'},
        React.createElement('div',{className:'flex items-center justify-between mb-3'},
          React.createElement('span',{className:'text-[13px] font-semibold text-white'},'Overall Collection Progress'),
          React.createElement('span',{className:'text-[13px] font-bold text-indigo-300'},`${Math.round((stats.tp/stats.tb)*100)}%`)
        ),
        React.createElement('div',{className:'h-2.5 bg-surface-900/60 rounded-full overflow-hidden'},
          React.createElement(motion.div,{className:'h-full rounded-full',
            style:{background:'linear-gradient(90deg, #6366f1, #818cf8, #a5b4fc)'},
            initial:{width:'0%'}, animate:{width:`${(stats.tp/stats.tb)*100}%`},
            transition:{delay:0.3,duration:1.2,ease:[0.22,1,0.36,1]}
          })
        )
      )
    ),
    // Filters
    React.createElement(FadeUp,{delay:0.25,className:'flex flex-wrap items-center gap-3'},
      React.createElement('div',{className:'relative flex-1 max-w-md'},
        React.createElement('i',{className:'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 text-[11px]'}),
        React.createElement('input',{type:'text',placeholder:'Search invoices…',className:'w-full pl-8 pr-3 py-[8px] rounded-[11px] text-[13px]',value:search,onChange:e=>setSearch(e.target.value)})
      ),
      React.createElement('div',{className:'tab-bar'}, ['All','Paid','Pending','Overdue'].map(f=>React.createElement('button',{key:f,className:`tab-btn ${filter===f?'active':''}`,onClick:()=>setFilter(f)},f)))
    ),
    React.createElement(FadeIn,{delay:0.28,className:'text-[12px] text-surface-500 font-medium'},`${filtered.length} invoice${filtered.length!==1?'s':''}`),
    // Table
    React.createElement(FadeUp,{delay:0.3},
      filtered.length===0 ? React.createElement(EmptyState,{icon:'fa-file-invoice-dollar',title:'No invoices found',subtitle:'Try adjusting your filters.'}) :
      React.createElement('div',{className:'glass-card-flat overflow-hidden rounded-2xl'}, React.createElement('div',{className:'overflow-x-auto'},
        React.createElement('table',{className:'premium-table'},
          React.createElement('thead',null, React.createElement('tr',null, ['Invoice #','Client','Description','Type','Amount','GST','Total','Due Date','Status'].map(h=>React.createElement('th',{key:h},h)))),
          React.createElement('tbody',null, filtered.map((inv,idx)=>React.createElement('tr',{key:inv.id,
            className:inv.status==='Overdue'?'bg-red-500/[0.025]':''},
            React.createElement('td',{className:'font-mono text-indigo-300/80 whitespace-nowrap'},inv.invoiceNumber),
            React.createElement('td',{className:'text-surface-300 whitespace-nowrap'},inv.clientName),
            React.createElement('td',{className:'text-surface-400 max-w-[180px] truncate'},inv.description),
            React.createElement('td',{className:'text-surface-500 whitespace-nowrap'},inv.billingType),
            React.createElement('td',{className:'text-surface-300 whitespace-nowrap'},formatINR(inv.amount)),
            React.createElement('td',{className:'text-surface-500 whitespace-nowrap'},formatINR(inv.gst)),
            React.createElement('td',{className:'font-bold text-white whitespace-nowrap'},formatINR(inv.total)),
            React.createElement('td',{className:`whitespace-nowrap ${inv.status==='Overdue'?'text-red-400 font-semibold':'text-surface-500'}`},formatDate(inv.dueDate)),
            React.createElement('td',{className:'whitespace-nowrap'}, React.createElement(StatusBadge,{status:inv.status}))
          )))
        )
      ))
    )
  );
};

// ============================================================
// SECTION 14: CALENDAR
// ============================================================
const CalendarPage = () => {
  const [sel,setSel]=useState(null);
  const {navigate}=useRouter();
  const year=2026,month=3;
  const dim=new Date(year,month+1,0).getDate();
  const fdw=new Date(year,month,1).getDay();
  const ebd=useMemo(()=>{const m={}; calendarEvents.forEach(e=>{const d=new Date(e.date).getDate(); const mo=new Date(e.date).getMonth(); if(mo===month){if(!m[d])m[d]=[];m[d].push(e);}}); return m;},[]);
  const se=useMemo(()=>sel?ebd[sel]||[]:calendarEvents.filter(e=>new Date(e.date).getMonth()===month).sort((a,b)=>new Date(a.date)-new Date(b.date)),[sel,ebd]);
  const ti={'Hearing':'fa-gavel','Deadline':'fa-hourglass-half','Meeting':'fa-users'};
  const tb={'Hearing':'bg-purple-500/10 text-purple-400','Deadline':'bg-red-500/10 text-red-400','Meeting':'bg-blue-500/10 text-blue-400'};

  return React.createElement('div',{className:'space-y-6'},
    React.createElement(FadeUp,{},
      React.createElement('div',{className:'grid grid-cols-1 lg:grid-cols-3 gap-6'},
        // Calendar grid
        React.createElement('div',{className:'lg:col-span-2 glass-card-flat p-6 rounded-2xl'},
          React.createElement('div',{className:'flex items-center justify-between mb-6'},
            React.createElement('h3',{className:'text-[16px] font-bold text-white tracking-tight'},'April 2026'),
            sel && React.createElement(motion.div||'div',{role:'button',
              className:'text-[11px] text-indigo-300/80 hover:text-white transition-colors font-semibold flex items-center gap-1.5',
              onClick:()=>setSel(null), whileHover:{x:-2}},
              React.createElement('i',{className:'fas fa-times text-[9px]'}),'Show All')
          ),
          React.createElement('div',{className:'grid grid-cols-7 gap-1.5 mb-3'},
            ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>React.createElement('div',{key:d,className:'text-center text-[10px] font-semibold text-surface-600 py-2 uppercase tracking-wider'},d))
          ),
          React.createElement('div',{className:'grid grid-cols-7 gap-1.5'},
            Array.from({length:fdw}).map((_,i)=>React.createElement('div',{key:`e-${i}`,className:'h-[80px]'})),
            Array.from({length:dim}).map((_,i)=>{
              const day=i+1; const de=ebd[day]||[]; const today=day===1; const isSel=sel===day; const has=de.length>0;
              const hasCritical = de.some(e=>e.priority==='Critical');
              return React.createElement(motion.div,{key:day,
                className:`h-[80px] rounded-xl p-2 cursor-pointer border transition-colors ${isSel?'border-indigo-500/40 bg-indigo-500/8':today?'border-indigo-500/20 bg-indigo-500/[0.04]':'border-transparent hover:border-white/[0.05] hover:bg-white/[0.015]'}`,
                whileHover:{scale:1.03}, whileTap:{scale:0.97},
                onClick:()=>setSel(isSel?null:day)},
                React.createElement('div',{className:'flex items-center justify-between'},
                  React.createElement('div',{className:`text-[12px] font-semibold ${today?'text-indigo-300':isSel?'text-white':'text-surface-400'}`},day),
                  hasCritical && React.createElement(motion.div,{className:'w-[5px] h-[5px] rounded-full bg-red-400',
                    animate:{opacity:[0.4,1,0.4]},transition:{duration:2,repeat:Infinity}})
                ),
                has && React.createElement('div',{className:'mt-1.5 space-y-[3px]'},
                  de.slice(0,2).map((e,j)=>React.createElement(motion.div,{key:j,
                    className:`text-[8px] px-1.5 py-[2px] rounded-md truncate font-medium ${e.type==='Hearing'?'bg-purple-500/12 text-purple-300':e.type==='Deadline'?'bg-red-500/12 text-red-300':'bg-blue-500/12 text-blue-300'}`,
                    initial:{opacity:0}, animate:{opacity:1}, transition:{delay:j*0.05}
                  },e.title.substring(0,14)+(e.title.length>14?'…':''))),
                  de.length>2 && React.createElement('div',{className:'text-[8px] text-surface-600 font-medium'},`+${de.length-2} more`)
                )
              );
            })
          )
        ),
        // Events sidebar
        React.createElement('div',{className:'glass-card-flat overflow-hidden rounded-2xl'},
          React.createElement('div',{className:'px-5 py-4 border-b border-white/[0.03]'},
            React.createElement('h3',{className:'text-[14px] font-semibold text-white'},sel?`Events on April ${sel}`:'All April Events'),
            React.createElement('p',{className:'text-[11px] text-surface-500 mt-0.5 font-medium'},`${se.length} event${se.length!==1?'s':''}`)
          ),
          React.createElement('div',{className:'divide-y divide-white/[0.02] max-h-[calc(100vh-280px)] overflow-y-auto'},
            se.length===0 ? React.createElement('div',{className:'p-10 text-center'},
              React.createElement('i',{className:'fas fa-calendar-xmark text-2xl text-surface-700 mb-3 block'}),
              React.createElement('div',{className:'text-[12px] text-surface-600'},'No events on this date')
            ) :
            se.map((e,i)=>React.createElement(motion.div,{key:e.id,className:'px-5 py-3.5 cursor-pointer',
              initial:{opacity:0,y:8}, animate:{opacity:1,y:0}, transition:{delay:i*0.04,duration:0.35},
              whileHover:{backgroundColor:'rgba(99,102,241,0.035)',x:2},
              onClick:()=>e.caseId&&navigate(`/cases/${e.caseId}`)},
              React.createElement('div',{className:'flex items-start gap-3'},
                React.createElement(motion.div,{className:`w-9 h-9 rounded-xl ${tb[e.type]||'bg-surface-800 text-surface-400'} flex items-center justify-center flex-shrink-0`,
                  whileHover:{scale:1.08}},
                  React.createElement('i',{className:`fas ${ti[e.type]||'fa-calendar'} text-[11px]`})
                ),
                React.createElement('div',{className:'flex-1 min-w-0'},
                  React.createElement('div',{className:'text-[13px] font-medium text-white'},e.title),
                  React.createElement('div',{className:'text-[11px] text-surface-500 mt-0.5'},formatDate(e.date),' · ',e.time),
                  e.court && React.createElement('div',{className:'text-[10px] text-surface-600 mt-0.5 truncate'},e.court)
                ),
                React.createElement(PriorityBadge,{priority:e.priority})
              )
            ))
          )
        )
      )
    )
  );
};

// ============================================================
// SECTION 14.1: TIME TRACKING (NEW)
// ============================================================
const TimeTrackingPage = () => {
  // Dummy data for time entries
  const timeEntries = [
    { id: 1, case: 'Reliance Industries vs. Union of India', lawyer: 'Adv. Rajesh Kumar', date: '2026-04-01', hours: 4.5, rate: 5000, description: 'Drafting cross-examination questions for PW-2', status: 'Billed' },
    { id: 2, case: 'Infosys Ltd. vs. DataTech Solutions', lawyer: 'Adv. Priya Nair', date: '2026-04-02', hours: 2.0, rate: 4500, description: 'Client meeting and strategy discussion', status: 'Unbilled' },
    { id: 3, case: 'Adani Ports vs. Global Shipping', lawyer: 'Adv. Meera Desai', date: '2026-04-02', hours: 6.5, rate: 6000, description: 'Reviewing arbitration documents', status: 'Unbilled' },
  ];

  return React.createElement('div', { className: 'space-y-6' },
    // Top Controls
    React.createElement(FadeUp, { className: 'flex justify-between items-center' },
      React.createElement('div', { className: 'flex items-center gap-4' },
        React.createElement('div', { className: 'glass-inner px-4 py-2 rounded-xl flex items-center gap-3 text-white font-mono text-xl' },
          React.createElement('i', { className: 'fas fa-circle-dot text-red-500 animate-pulse text-[10px]' }),
          '00:00:00'
        ),
        React.createElement('button', { className: 'btn-primary bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30' }, 
          React.createElement('i', { className: 'fas fa-play mr-2' }), 'Start Timer'
        )
      ),
      React.createElement('button', { className: 'btn-ghost' }, React.createElement('i', { className: 'fas fa-plus mr-2' }), 'Manual Entry')
    ),

    // Quick Stats
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
      React.createElement(MetricCard, { icon: 'fa-clock', iconBg: 'bg-indigo-500/10 text-indigo-400', label: 'Unbilled Hours (This Week)', value: 18.5, suffix: ' hrs', delay: 0.1 }),
      React.createElement(MetricCard, { icon: 'fa-indian-rupee-sign', iconBg: 'bg-emerald-500/10 text-emerald-400', label: 'Unbilled Amount', value: 92500, prefix: '₹', delay: 0.2 }),
      React.createElement(MetricCard, { icon: 'fa-check-double', iconBg: 'bg-purple-500/10 text-purple-400', label: 'Billed Hours (This Month)', value: 142, suffix: ' hrs', delay: 0.3 })
    ),

    // Time Entries Table
    React.createElement(FadeUp, { delay: 0.4 },
      React.createElement('div', { className: 'glass-card-flat overflow-hidden rounded-2xl' },
        React.createElement('div', { className: 'px-5 py-4 border-b border-white/[0.03] flex justify-between items-center' },
          React.createElement('h3', { className: 'text-[14px] font-semibold text-white' }, 'Recent Time Entries'),
          React.createElement('span', { className: 'text-[11px] text-surface-500' }, 'Showing last 7 days')
        ),
        React.createElement('div', { className: 'overflow-x-auto' },
          React.createElement('table', { className: 'premium-table' },
            React.createElement('thead', null, React.createElement('tr', null, ['Date', 'Case / Matter', 'Lawyer', 'Description', 'Hours', 'Status'].map(h => React.createElement('th', { key: h }, h)))),
            React.createElement('tbody', null, timeEntries.map(entry => React.createElement('tr', { key: entry.id },
              React.createElement('td', { className: 'text-surface-400 whitespace-nowrap' }, entry.date),
              React.createElement('td', { className: 'text-white font-medium' }, entry.case),
              React.createElement('td', { className: 'text-surface-400' }, entry.lawyer),
              React.createElement('td', { className: 'text-surface-500 max-w-[200px] truncate' }, entry.description),
              React.createElement('td', { className: 'text-indigo-300 font-mono font-bold' }, entry.hours),
              React.createElement('td', null, React.createElement('span', { className: `px-2.5 py-1 rounded-md text-[10px] font-bold ${entry.status === 'Billed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}` }, entry.status))
            )))
          )
        )
      )
    )
  );
};
// ============================================================
// SECTION 14.2: EXPENSE TRACKING (NEW)
// ============================================================
const ExpenseTrackingPage = () => {
  // Dummy data for expenses
  const expenses = [
    { id: 'EXP001', case: 'Reliance Industries vs. Union of India', category: 'Court Fees', date: '2026-04-01', amount: 15000, status: 'Billable', receipt: true },
    { id: 'EXP002', case: 'Infosys Ltd. vs. DataTech Solutions', category: 'Travel & Accommodation', date: '2026-04-02', amount: 8500, status: 'Pending Approval', receipt: true },
    { id: 'EXP003', case: 'Firm Operations (Internal)', category: 'Software Subscriptions', date: '2026-04-03', amount: 12000, status: 'Non-Billable', receipt: true },
    { id: 'EXP004', case: 'Adani Ports vs. Global Shipping', category: 'Document Printing', date: '2026-04-04', amount: 3200, status: 'Billed', receipt: false },
    { id: 'EXP005', case: 'Arun Mehta vs. Heritage Properties', category: 'Notary & Stamp Paper', date: '2026-04-05', amount: 1500, status: 'Billable', receipt: true }
  ];

  const getCategoryIcon = (cat) => {
    if(cat.includes('Court')) return 'fa-gavel text-amber-400';
    if(cat.includes('Travel')) return 'fa-plane text-blue-400';
    if(cat.includes('Software')) return 'fa-laptop-code text-purple-400';
    return 'fa-file-invoice text-surface-400';
  };

  return React.createElement('div', { className: 'space-y-6' },
    // Top Controls
    React.createElement(FadeUp, { className: 'flex justify-between items-center flex-wrap gap-4' },
      React.createElement('div', { className: 'relative max-w-sm w-full' },
        React.createElement('i', { className: 'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 text-[11px]' }),
        React.createElement('input', { type: 'text', placeholder: 'Search expenses, cases...', className: 'w-full pl-8 pr-3 py-[8px] rounded-[11px] text-[13px]' })
      ),
      React.createElement('div', { className: 'flex items-center gap-3' },
        React.createElement('button', { className: 'btn-ghost' }, React.createElement('i', { className: 'fas fa-file-export mr-2' }), 'Export CSV'),
        React.createElement('button', { className: 'btn-primary' }, React.createElement('i', { className: 'fas fa-plus mr-2' }), 'Record Expense')
      )
    ),

    // Quick Stats
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
      React.createElement(MetricCard, { icon: 'fa-receipt', iconBg: 'bg-indigo-500/10 text-indigo-400', label: 'Total Expenses (April)', value: 40200, prefix: '₹', delay: 0.1 }),
      React.createElement(MetricCard, { icon: 'fa-file-invoice-dollar', iconBg: 'bg-amber-500/10 text-amber-400', label: 'Unbilled Client Expenses', value: 16500, prefix: '₹', delay: 0.2 }),
      React.createElement(MetricCard, { icon: 'fa-building-columns', iconBg: 'bg-surface-500/10 text-surface-400', label: 'Internal / Non-Billable', value: 12000, prefix: '₹', delay: 0.3 })
    ),

    // Expenses Table
    React.createElement(FadeUp, { delay: 0.4 },
      React.createElement('div', { className: 'glass-card-flat overflow-hidden rounded-2xl' },
        React.createElement('div', { className: 'px-5 py-4 border-b border-white/[0.03] flex justify-between items-center' },
          React.createElement('h3', { className: 'text-[14px] font-semibold text-white' }, 'Expense Ledger'),
          React.createElement('div', { className: 'tab-bar' },
            ['All', 'Billable', 'Non-Billable'].map(f => React.createElement('button', { key: f, className: `tab-btn ${f === 'All' ? 'active' : ''}` }, f))
          )
        ),
        React.createElement('div', { className: 'overflow-x-auto' },
          React.createElement('table', { className: 'premium-table' },
            React.createElement('thead', null, React.createElement('tr', null, ['Date', 'Category', 'Case / Matter', 'Amount', 'Receipt', 'Status'].map(h => React.createElement('th', { key: h }, h)))),
            React.createElement('tbody', null, expenses.map(exp => React.createElement('tr', { key: exp.id, className: 'group' },
              React.createElement('td', { className: 'text-surface-400 whitespace-nowrap' }, exp.date),
              React.createElement('td', null,
                React.createElement('div', { className: 'flex items-center gap-2.5' },
                  React.createElement('div', { className: 'w-7 h-7 rounded-lg bg-surface-800/50 flex items-center justify-center' },
                    React.createElement('i', { className: `fas ${getCategoryIcon(exp.category)} text-[10px]` })
                  ),
                  React.createElement('span', { className: 'text-white font-medium text-[13px]' }, exp.category)
                )
              ),
              React.createElement('td', { className: 'text-surface-400 max-w-[200px] truncate' }, exp.case),
              React.createElement('td', { className: 'text-white font-bold tracking-tight' }, `₹${exp.amount.toLocaleString('en-IN')}`),
              React.createElement('td', null, 
                exp.receipt 
                  ? React.createElement('div', { className: 'flex items-center gap-1.5 text-indigo-400 cursor-pointer hover:text-indigo-300 transition-colors' }, React.createElement('i', { className: 'fas fa-paperclip' }), React.createElement('span', { className: 'text-[10px] font-semibold' }, 'View')) 
                  : React.createElement('span', { className: 'text-surface-600 text-[10px]' }, '—')
              ),
              React.createElement('td', null, 
                React.createElement('span', { className: `px-2.5 py-1 rounded-md text-[10px] font-bold ${exp.status === 'Billed' ? 'bg-emerald-500/10 text-emerald-400' : exp.status === 'Non-Billable' ? 'bg-surface-500/10 text-surface-400' : 'bg-amber-500/10 text-amber-400'}` }, exp.status)
              )
            )))
          )
        )
      )
    )
  );
};
// ============================================================
// SECTION 14.3: TEAM COLLABORATION (NEW)
// ============================================================
const TeamPage = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const currentUser = window.__lfUser;
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Use global users array loaded from API
  const teamMembers = useMemo(() => {
    let filtered = users;
    if (roleFilter !== 'All') filtered = filtered.filter(u => u.role === roleFilter);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || (u.designation || '').toLowerCase().includes(s));
    }
    return filtered;
  }, [search, roleFilter]);

  const admins = useMemo(() => users.filter(u => u.role === 'admin'), []);
  const lawyers = useMemo(() => users.filter(u => u.role === 'lawyer'), []);
  const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';
  const getColor = (role) => role === 'admin' ? 'from-indigo-500 to-purple-600' : 'from-blue-500 to-cyan-600';

  return React.createElement('div', { className: 'space-y-6' },
    // Top Controls
    React.createElement(FadeUp, { className: 'flex justify-between items-center flex-wrap gap-4' },
      React.createElement('div', { className: 'relative max-w-sm w-full' },
        React.createElement('i', { className: 'fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-600 text-[11px]' }),
        React.createElement('input', { type: 'text', placeholder: 'Search team members...', className: 'w-full pl-8 pr-3 py-[8px] rounded-[11px] text-[13px]', value: search, onChange: e => setSearch(e.target.value) })
      ),
      React.createElement('div', { className: 'tab-bar' },
        ['All', 'admin', 'lawyer'].map(f => React.createElement('button', { key: f, className: `tab-btn ${roleFilter === f ? 'active' : ''}`, onClick: () => setRoleFilter(f) }, f === 'All' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'))
      )
    ),

    // Quick Stats
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
      React.createElement(MetricCard, { icon: 'fa-users', iconBg: 'bg-indigo-500/10 text-indigo-400', label: 'Total Firm Members', value: users.length, delay: 0.1 }),
      React.createElement(MetricCard, { icon: 'fa-user-shield', iconBg: 'bg-purple-500/10 text-purple-400', label: 'Admins', value: admins.length, delay: 0.15 }),
      React.createElement(MetricCard, { icon: 'fa-user-tie', iconBg: 'bg-blue-500/10 text-blue-400', label: 'Lawyers', value: lawyers.length, delay: 0.2 })
    ),

    // Team Grid
    teamMembers.length === 0 ?
      React.createElement(EmptyState, { icon: 'fa-users', title: 'No team members found', subtitle: 'Try adjusting your search or filters.' }) :
    React.createElement(Stagger, { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5', staggerDelay: 0.05, delayStart: 0.3 },
      teamMembers.map((member) => React.createElement(StaggerItem, { key: member.id || member._id },
        React.createElement(motion.div, { 
          className: 'glass-card p-6 h-full flex flex-col cursor-default group',
          whileHover: { y: -4, borderColor: 'rgba(99,102,241,0.2)', boxShadow: '0 20px 40px -15px rgba(99,102,241,0.15)' }
        },
          // Header: Avatar & Name
          React.createElement('div', { className: 'flex items-start justify-between mb-4' },
            React.createElement('div', { className: 'flex items-center gap-4' },
              React.createElement('div', { className: `w-12 h-12 rounded-2xl bg-gradient-to-br ${getColor(member.role)} flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/10` }, getInitials(member.name)),
              React.createElement('div', null,
                React.createElement('h3', { className: 'text-[15px] font-semibold text-white tracking-tight' }, member.name),
                React.createElement('span', { className: 'text-[11px] text-surface-400 font-medium' }, member.designation || (member.role === 'admin' ? 'Administrator' : 'Lawyer'))
              )
            ),
            // Role Badge
            React.createElement('div', { className: `flex items-center gap-1.5 px-2.5 py-1 rounded-md ${member.role === 'admin' ? 'bg-indigo-500/10' : 'bg-blue-500/10'}` },
              React.createElement('div', { className: `w-1.5 h-1.5 rounded-full ${member.role === 'admin' ? 'bg-indigo-400' : 'bg-blue-400'}` }),
              React.createElement('span', { className: 'text-[9px] font-medium text-surface-300 uppercase tracking-wide' }, member.role)
            )
          ),
          
          // Contact Info
          React.createElement('div', { className: 'space-y-2 mb-6 flex-1' },
            React.createElement('div', { className: 'flex items-center gap-2.5 text-[12px] text-surface-400' },
              React.createElement('i', { className: 'fas fa-envelope text-[10px] w-3 text-center opacity-70' }),
              React.createElement('span', { className: 'truncate hover:text-indigo-300 transition-colors' }, member.email)
            ),
            member.phone && React.createElement('div', { className: 'flex items-center gap-2.5 text-[12px] text-surface-400' },
              React.createElement('i', { className: 'fas fa-phone text-[10px] w-3 text-center opacity-70' }),
              React.createElement('span', null, member.phone)
            ),
            React.createElement('div', { className: 'flex items-center gap-2.5 text-[12px] text-surface-400' },
              React.createElement('i', { className: 'fas fa-calendar-plus text-[10px] w-3 text-center opacity-70' }),
              React.createElement('span', null, 'Joined ', formatDate(member.createdAt))
            )
          ),

          // Footer: Active Cases
          React.createElement('div', { className: 'pt-4 border-t border-white/[0.04] flex items-center justify-between' },
            React.createElement('div', null,
              React.createElement('span', { className: 'block text-[10px] text-surface-500 font-medium mb-0.5' }, 'Assigned Cases'),
              React.createElement('div', { className: 'flex items-center gap-3' },
                React.createElement('div', { className: 'flex items-center gap-1.5' },
                  React.createElement('i', { className: 'fas fa-briefcase text-[10px] text-indigo-400' }),
                  React.createElement('span', { className: 'text-[14px] font-bold text-white' }, member.totalCases || 0)
                ),
                React.createElement('span', { className: 'text-[10px] text-surface-600' }, '|'),
                React.createElement('div', { className: 'flex items-center gap-1' },
                  React.createElement('span', { className: 'text-[11px] text-emerald-400 font-semibold' }, member.activeCases || 0),
                  React.createElement('span', { className: 'text-[10px] text-surface-500' }, 'active')
                )
              )
            )
          )
        )
      ))
    )
  );
};

// ============================================================
// SECTION 14.4: REPORTS & ANALYTICS (NEW)
// ============================================================
const ReportsPage = () => {
  // Dummy data for charts
  const revenueTrend = [
    { label: 'Nov', value: 980000, color: 'linear-gradient(to top, rgba(99,102,241,0.5), rgba(129,140,248,0.8))' },
    { label: 'Dec', value: 1550000, color: 'linear-gradient(to top, rgba(99,102,241,0.5), rgba(129,140,248,0.8))' },
    { label: 'Jan', value: 890000, color: 'linear-gradient(to top, rgba(99,102,241,0.5), rgba(129,140,248,0.8))' },
    { label: 'Feb', value: 1320000, color: 'linear-gradient(to top, rgba(99,102,241,0.5), rgba(129,140,248,0.8))' },
    { label: 'Mar', value: 1650000, color: 'linear-gradient(to top, rgba(99,102,241,0.5), rgba(129,140,248,0.8))' },
    { label: 'Apr', value: 2100000, color: 'linear-gradient(to top, rgba(52,211,153,0.6), rgba(110,231,183,0.9))' } // Projected/Current
  ];

  const caseDistribution = [
    { label: 'Corporate', value: 35, color: 'linear-gradient(to top, rgba(168,85,247,0.5), rgba(192,132,252,0.8))' },
    { label: 'Litigation', value: 45, color: 'linear-gradient(to top, rgba(239,68,68,0.5), rgba(248,113,113,0.8))' },
    { label: 'IPR', value: 15, color: 'linear-gradient(to top, rgba(59,130,246,0.5), rgba(96,165,250,0.8))' },
    { label: 'Tax', value: 25, color: 'linear-gradient(to top, rgba(245,158,11,0.5), rgba(251,191,36,0.8))' },
    { label: 'Real Estate', value: 10, color: 'linear-gradient(to top, rgba(16,185,129,0.5), rgba(52,211,153,0.8))' }
  ];

  const generatedReports = [
    { id: 'RPT-001', name: 'Q1 Financial Summary 2026', type: 'Financial', date: '2026-04-01', size: '2.4 MB', author: 'Rajesh Kumar' },
    { id: 'RPT-002', name: 'Associate Utilization Report - March', type: 'Performance', date: '2026-04-02', size: '1.1 MB', author: 'System Auto' },
    { id: 'RPT-003', name: 'Active Litigation Pipeline', type: 'Case Management', date: '2026-04-03', size: '3.5 MB', author: 'Priya Nair' },
    { id: 'RPT-004', name: 'Outstanding Receivables Ledger', type: 'Billing', date: '2026-04-05', size: '850 KB', author: 'System Auto' }
  ];

  return React.createElement('div', { className: 'space-y-6' },
    // Top Controls
    React.createElement(FadeUp, { className: 'flex justify-between items-center flex-wrap gap-4' },
      React.createElement('div', { className: 'flex items-center gap-3' },
        React.createElement('div', { className: 'relative' },
          React.createElement('select', { className: 'appearance-none bg-surface-900/60 border border-white/[0.05] text-white pl-4 pr-10 py-2 rounded-xl text-[13px] outline-none cursor-pointer hover:border-indigo-500/30 transition-colors' },
            React.createElement('option', null, 'This Quarter (Q2 2026)'),
            React.createElement('option', null, 'Last Quarter (Q1 2026)'),
            React.createElement('option', null, 'Year to Date (YTD)'),
            React.createElement('option', null, 'Custom Range...')
          ),
          React.createElement('i', { className: 'fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-surface-500 pointer-events-none' })
        )
      ),
      React.createElement('div', { className: 'flex items-center gap-3' },
        React.createElement('button', { className: 'btn-ghost' }, React.createElement('i', { className: 'fas fa-print mr-2' }), 'Print'),
        React.createElement('button', { className: 'btn-primary' }, React.createElement('i', { className: 'fas fa-wand-magic-sparkles mr-2' }), 'Generate Custom Report')
      )
    ),

    // KPI Metrics
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4' },
      React.createElement(MetricCard, { icon: 'fa-arrow-trend-up', iconBg: 'bg-emerald-500/10 text-emerald-400', label: 'Revenue Growth', value: '+18.5', suffix: '%', trend: 'vs Last Quarter', trendUp: true, delay: 0.1 }),
      React.createElement(MetricCard, { icon: 'fa-scale-balanced', iconBg: 'bg-indigo-500/10 text-indigo-400', label: 'Win/Resolution Rate', value: 82, suffix: '%', delay: 0.15 }),
      React.createElement(MetricCard, { icon: 'fa-user-clock', iconBg: 'bg-purple-500/10 text-purple-400', label: 'Avg. Billable Utilization', value: 76, suffix: '%', delay: 0.2 }),
      React.createElement(MetricCard, { icon: 'fa-hand-holding-dollar', iconBg: 'bg-amber-500/10 text-amber-400', label: 'Realization Rate', value: 91, suffix: '%', trend: '-2% vs Target', trendUp: false, delay: 0.25 })
    ),

    // Charts Section
    React.createElement(FadeUp, { delay: 0.35, className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
      // Revenue Chart
      React.createElement('div', { className: 'glass-card-flat p-6 rounded-2xl' },
        React.createElement('div', { className: 'flex items-center justify-between mb-6' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-[14px] font-semibold text-white' }, 'Revenue Trajectory'),
            React.createElement('span', { className: 'text-[11px] text-surface-500' }, 'Actuals vs Projected (Apr)')
          ),
          React.createElement('button', { className: 'text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors' }, 'View Ledger')
        ),
        React.createElement('div', { className: 'mt-4' },
          React.createElement(BarChart, { data: revenueTrend, height: 160 })
        )
      ),
      
      // Case Distribution Chart
      React.createElement('div', { className: 'glass-card-flat p-6 rounded-2xl' },
        React.createElement('div', { className: 'flex items-center justify-between mb-6' },
          React.createElement('div', null,
            React.createElement('h3', { className: 'text-[14px] font-semibold text-white' }, 'Practice Area Distribution'),
            React.createElement('span', { className: 'text-[11px] text-surface-500' }, 'Active caseload by sector')
          )
        ),
        React.createElement('div', { className: 'mt-4' },
          React.createElement(BarChart, { data: caseDistribution, height: 160 })
        )
      )
    ),

    // Generated Reports Table
    React.createElement(FadeUp, { delay: 0.5 },
      React.createElement('div', { className: 'glass-card-flat overflow-hidden rounded-2xl' },
        React.createElement('div', { className: 'px-6 py-5 border-b border-white/[0.03] flex justify-between items-center' },
          React.createElement('h3', { className: 'text-[14px] font-semibold text-white' }, 'Saved Reports & Exports'),
          React.createElement('button', { className: 'text-[11px] text-indigo-400 font-medium' }, 'View Archive')
        ),
        React.createElement('div', { className: 'overflow-x-auto' },
          React.createElement('table', { className: 'premium-table' },
            React.createElement('thead', null, React.createElement('tr', null, ['Report Name', 'Type', 'Generated On', 'Author', 'Size', 'Action'].map(h => React.createElement('th', { key: h }, h)))),
            React.createElement('tbody', null, generatedReports.map(rpt => React.createElement('tr', { key: rpt.id, className: 'group' },
              React.createElement('td', null, 
                React.createElement('div', { className: 'flex items-center gap-3' },
                  React.createElement('div', { className: 'w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center' },
                    React.createElement('i', { className: 'fas fa-file-pdf text-red-400 text-[12px]' })
                  ),
                  React.createElement('span', { className: 'text-[13px] font-semibold text-white group-hover:text-indigo-300 transition-colors cursor-pointer' }, rpt.name)
                )
              ),
              React.createElement('td', null, React.createElement('span', { className: 'px-2.5 py-1 rounded-md bg-surface-800/50 text-[10px] text-surface-300 font-medium tracking-wide' }, rpt.type)),
              React.createElement('td', { className: 'text-surface-400 text-[12px]' }, rpt.date),
              React.createElement('td', { className: 'text-surface-400 text-[12px]' }, rpt.author),
              React.createElement('td', { className: 'text-surface-500 text-[12px] font-mono' }, rpt.size),
              React.createElement('td', null, 
                React.createElement('div', { className: 'flex items-center gap-3' },
                  React.createElement('button', { className: 'text-surface-500 hover:text-white transition-colors', title: 'Download' }, React.createElement('i', { className: 'fas fa-download text-[12px]' })),
                  React.createElement('button', { className: 'text-surface-500 hover:text-indigo-400 transition-colors', title: 'Share' }, React.createElement('i', { className: 'fas fa-share-nodes text-[12px]' }))
                )
              )
            )))
          )
        )
      )
    )
  );
};
// ============================================================
// SECTION 15: APP (with Authentication & API Integration)
// ============================================================

// Data normalizer: maps MongoDB _id to id for frontend compatibility
const normalizeRecord = (rec) => {
  if (!rec) return rec;
  const obj = { ...rec };
  if (obj._id && !obj.id) { obj.id = obj._id; }
  // Normalize nested refs
  if (obj.client && typeof obj.client === 'object' && obj.client._id) obj.client = { ...obj.client, id: obj.client._id };
  if (obj.advocate && typeof obj.advocate === 'object' && obj.advocate._id) obj.advocate = { ...obj.advocate, id: obj.advocate._id };
  if (obj.caseId && typeof obj.caseId === 'object' && obj.caseId._id) { obj.caseRef = { ...obj.caseId, id: obj.caseId._id }; obj.caseId = obj.caseId._id; }
  else if (obj.caseId && typeof obj.caseId === 'string') { /* keep as string id */ }
  if (obj.clientId && typeof obj.clientId === 'object' && obj.clientId._id) { obj.clientId = obj.clientId._id; }
  // Map stage → matterStage for case data
  if (obj.stage !== undefined && obj.matterStage === undefined) obj.matterStage = obj.stage;
  // Map courtName → court
  if (obj.courtName && !obj.court) obj.court = obj.courtName;
  // Map advocateName → advocate string
  if (obj.advocateName && typeof obj.advocate !== 'string') obj.advocate = obj.advocateName;
  // Map fileSize → size
  if (obj.fileSize && !obj.size) obj.size = obj.fileSize;
  // Map uploadedByName → uploadedBy
  if (obj.uploadedByName) obj.uploadedBy = obj.uploadedByName;
  // Map invoice type → billingType
  if (obj.type && !obj.billingType && ['Fixed Fee','Hourly','Retainership','Milestone-Based','Event-Based'].includes(obj.type)) obj.billingType = obj.type;
  return obj;
};
const normalizeArray = (arr) => (arr || []).map(normalizeRecord);

// Load all data from API into global arrays
const loadAllData = async () => {
  try {
    const [casesRes, clientsRes, docsRes, invoicesRes, tasksRes, eventsRes, usersRes] = await Promise.all([
      window.lfAPI.getCases({ limit: 100 }),
      window.lfAPI.getClients({ limit: 100 }),
      window.lfAPI.getDocuments({ limit: 100 }),
      window.lfAPI.getInvoices({ limit: 100 }),
      window.lfAPI.getTasks({ limit: 100 }),
      window.lfAPI.getCalendarEvents({ limit: 200 }),
      window.lfAPI.getUsers({ limit: 100 })
    ]);
    if (casesRes.success) cases = normalizeArray(casesRes.data);
    if (clientsRes.success) clients = normalizeArray(clientsRes.data);
    if (docsRes.success) documents = normalizeArray(docsRes.data);
    if (invoicesRes.success) invoices = normalizeArray(invoicesRes.data);
    if (tasksRes.success) tasks = normalizeArray(tasksRes.data);
    if (eventsRes.success) calendarEvents = normalizeArray(eventsRes.data);
    if (usersRes.success) users = normalizeArray(usersRes.data);
    return true;
  } catch (err) {
    console.error('Failed to load data:', err);
    return false;
  }
};

// Reload just cases (after create/update)
const reloadCases = async () => {
  try {
    const res = await window.lfAPI.getCases({ limit: 100 });
    if (res.success) cases = normalizeArray(res.data);
  } catch (err) { console.error('Failed to reload cases:', err); }
};

// Reload just users (after signup)
const reloadUsers = async () => {
  try {
    const res = await window.lfAPI.getUsers({ limit: 100 });
    if (res.success) users = normalizeArray(res.data);
  } catch (err) { console.error('Failed to reload users:', err); }
};

// ---- LOGIN SCREEN ----
const LoginScreen = ({ onLogin, onSwitchToSignup }) => {
  const [email, setEmail] = useState('admin@legalflow.in');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e && e.preventDefault();
    setError(''); setLoading(true);
    const res = await window.lfAPI.login(email, password);
    if (res.success) {
      window.lfAPI.setToken(res.data.token);
      window.__lfUser = res.data.user;
      localStorage.setItem('lf_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } else {
      setError(res.message || 'Login failed.');
    }
    setLoading(false);
  };

  return React.createElement(motion.div, {
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-base overflow-hidden',
    initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 }
  },
    React.createElement('div', {className: 'bg-aurora absolute inset-0 opacity-50'}),
    React.createElement('div', {className: 'bg-noise absolute inset-0'}),
    React.createElement('div', {className: 'absolute inset-0 bg-gradient-to-t from-[#050910] via-transparent to-[#050910]'}),
    React.createElement(motion.div, {
      className: 'relative z-10 w-full max-w-md px-4',
      initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 },
      transition: { duration: 0.8, delay: 0.2, ease: [0.22,1,0.36,1] }
    },
      // Logo
      React.createElement('div', {className: 'text-center mb-10'},
        React.createElement(motion.div, {
          className: 'w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.35)] ring-1 ring-white/20',
          initial: { scale: 0.8, rotate: -15 }, animate: { scale: 1, rotate: 0 },
          transition: { type: 'spring', damping: 20, stiffness: 200, delay: 0.3 }
        }, React.createElement('i', {className: 'fas fa-balance-scale text-white text-3xl'})),
        React.createElement('h1', {className: 'text-3xl font-extrabold text-white tracking-tight mb-1'}, 'LegalFlow'),
        React.createElement('p', {className: 'text-xs text-indigo-300/90 font-bold tracking-[0.4em] uppercase'}, 'India')
      ),
      // Login Card
      React.createElement('div', {className: 'glass-card p-8'},
        React.createElement('div', {className: 'relative z-10'},
          React.createElement('h2', {className: 'text-xl font-bold text-white mb-1.5 tracking-tight'}, 'Welcome back'),
          React.createElement('p', {className: 'text-[13px] text-surface-500 mb-7'}, 'Sign in to your LegalFlow account'),
          error && React.createElement(motion.div, {
            className: 'mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] font-medium',
            initial: {opacity:0,y:-10}, animate: {opacity:1,y:0}
          }, React.createElement('i', {className: 'fas fa-exclamation-circle mr-2'}), error),
          React.createElement('form', {onSubmit: handleLogin},
            React.createElement('div', {className: 'space-y-4'},
              React.createElement('div', null,
                React.createElement('label', {className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2'}, 'Email'),
                React.createElement('input', {type:'email', value:email, onChange:e=>setEmail(e.target.value), className:'w-full py-3 px-4 rounded-xl text-[13px]', placeholder:'admin@legalflow.in', required:true, autoFocus:true})
              ),
              React.createElement('div', null,
                React.createElement('label', {className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2'}, 'Password'),
                React.createElement('input', {type:'password', value:password, onChange:e=>setPassword(e.target.value), className:'w-full py-3 px-4 rounded-xl text-[13px]', placeholder:'Enter your password', required:true})
              )
            ),
            React.createElement('button', {
              type: 'submit', disabled: loading,
              className: `w-full btn-primary py-3 mt-7 text-[14px] ${loading ? 'opacity-60 cursor-wait' : ''}`
            }, loading ? React.createElement('span', null, React.createElement('i', {className: 'fas fa-circle-notch fa-spin mr-2'}), 'Signing in...') : React.createElement('span', null, 'Sign In ', React.createElement('i', {className: 'fas fa-arrow-right ml-1'})))
          ),
          React.createElement('div', {className: 'mt-6 text-center'},
            React.createElement('span', {className: 'text-[12px] text-surface-500'}, "Don't have an account? "),
            React.createElement('button', {onClick: onSwitchToSignup, className: 'text-[12px] text-indigo-400 font-semibold hover:text-indigo-300 transition-colors'}, 'Create Account')
          ),
          React.createElement('div', {className: 'mt-6 pt-5 border-t border-white/[0.03]'},
            React.createElement('div', {className: 'text-[10px] text-surface-600 text-center mb-3 font-semibold uppercase tracking-wider'}, 'Demo Credentials'),
            React.createElement('div', {className: 'grid grid-cols-2 gap-2 text-[11px]'},
              React.createElement('div', {className: 'glass-inner p-2.5 rounded-lg cursor-pointer hover:border-indigo-500/20 transition-all', onClick:()=>{setEmail('admin@legalflow.in');setPassword('admin123');}},
                React.createElement('div', {className: 'text-surface-400 font-medium'}, 'Admin'),
                React.createElement('div', {className: 'text-surface-600 font-mono text-[10px] mt-0.5'}, 'admin@legalflow.in')
              ),
              React.createElement('div', {className: 'glass-inner p-2.5 rounded-lg cursor-pointer hover:border-indigo-500/20 transition-all', onClick:()=>{setEmail('priya@legalflow.in');setPassword('lawyer123');}},
                React.createElement('div', {className: 'text-surface-400 font-medium'}, 'Lawyer'),
                React.createElement('div', {className: 'text-surface-600 font-mono text-[10px] mt-0.5'}, 'priya@legalflow.in')
              )
            )
          )
        )
      )
    )
  );
};

// ---- SIGNUP SCREEN ----
const SignupScreen = ({ onSignup, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('lawyer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e && e.preventDefault();
    setError(''); setLoading(true);
    const res = await window.lfAPI.signup(name, email, password, role);
    if (res.success) {
      window.lfAPI.setToken(res.data.token);
      window.__lfUser = res.data.user;
      localStorage.setItem('lf_user', JSON.stringify(res.data.user));
      onSignup(res.data.user);
    } else {
      setError(res.message || 'Signup failed.');
    }
    setLoading(false);
  };

  return React.createElement(motion.div, {
    className: 'fixed inset-0 z-50 flex items-center justify-center bg-base overflow-hidden',
    initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6 }
  },
    React.createElement('div', {className: 'bg-aurora absolute inset-0 opacity-50'}),
    React.createElement('div', {className: 'bg-noise absolute inset-0'}),
    React.createElement('div', {className: 'absolute inset-0 bg-gradient-to-t from-[#050910] via-transparent to-[#050910]'}),
    React.createElement(motion.div, {
      className: 'relative z-10 w-full max-w-md px-4',
      initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 },
      transition: { duration: 0.8, delay: 0.2, ease: [0.22,1,0.36,1] }
    },
      React.createElement('div', {className: 'text-center mb-8'},
        React.createElement(motion.div, {
          className: 'w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)] ring-1 ring-white/20',
          initial: { scale: 0.8 }, animate: { scale: 1 }, transition: { type: 'spring', damping: 20, delay: 0.3 }
        }, React.createElement('i', {className: 'fas fa-balance-scale text-white text-2xl'})),
        React.createElement('h1', {className: 'text-2xl font-extrabold text-white tracking-tight'}, 'LegalFlow'),
        React.createElement('p', {className: 'text-[10px] text-indigo-300/80 font-bold tracking-[0.3em] uppercase'}, 'India')
      ),
      React.createElement('div', {className: 'glass-card p-8'},
        React.createElement('div', {className: 'relative z-10'},
          React.createElement('h2', {className: 'text-xl font-bold text-white mb-1.5'}, 'Create Account'),
          React.createElement('p', {className: 'text-[13px] text-surface-500 mb-6'}, 'Register for a new LegalFlow account'),
          error && React.createElement(motion.div, {
            className: 'mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]',
            initial: {opacity:0}, animate: {opacity:1}
          }, React.createElement('i', {className: 'fas fa-exclamation-circle mr-2'}), error),
          React.createElement('form', {onSubmit: handleSignup},
            React.createElement('div', {className: 'space-y-3.5'},
              React.createElement('div', null,
                React.createElement('label', {className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5'}, 'Full Name'),
                React.createElement('input', {type:'text', value:name, onChange:e=>setName(e.target.value), className:'w-full py-2.5 px-4 rounded-xl text-[13px]', placeholder:'e.g. Adv. Ananya Singh', required:true})
              ),
              React.createElement('div', null,
                React.createElement('label', {className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5'}, 'Email'),
                React.createElement('input', {type:'email', value:email, onChange:e=>setEmail(e.target.value), className:'w-full py-2.5 px-4 rounded-xl text-[13px]', placeholder:'you@firm.in', required:true})
              ),
              React.createElement('div', null,
                React.createElement('label', {className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5'}, 'Password'),
                React.createElement('input', {type:'password', value:password, onChange:e=>setPassword(e.target.value), className:'w-full py-2.5 px-4 rounded-xl text-[13px]', placeholder:'Min 6 characters', required:true, minLength:6})
              ),
              React.createElement('div', null,
                React.createElement('label', {className: 'block text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-1.5'}, 'Role'),
                React.createElement('select', {value:role, onChange:e=>setRole(e.target.value), className:'w-full py-2.5 px-4 rounded-xl text-[13px]'},
                  React.createElement('option', {value:'lawyer'}, 'Lawyer'),
                  React.createElement('option', {value:'admin'}, 'Admin')
                )
              )
            ),
            React.createElement('button', {
              type: 'submit', disabled: loading,
              className: `w-full btn-primary py-3 mt-6 text-[14px] ${loading ? 'opacity-60 cursor-wait' : ''}`
            }, loading ? React.createElement('span', null, React.createElement('i', {className: 'fas fa-circle-notch fa-spin mr-2'}), 'Creating...') : React.createElement('span', null, 'Create Account ', React.createElement('i', {className: 'fas fa-arrow-right ml-1'})))
          ),
          React.createElement('div', {className: 'mt-5 text-center'},
            React.createElement('span', {className: 'text-[12px] text-surface-500'}, 'Already have an account? '),
            React.createElement('button', {onClick: onSwitchToLogin, className: 'text-[12px] text-indigo-400 font-semibold hover:text-indigo-300 transition-colors'}, 'Sign In')
          )
        )
      )
    )
  );
};

// ---- LOADING SCREEN ----
const LoadingScreen = () => {
  return React.createElement(motion.div, {
    className: 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-base overflow-hidden',
    initial: { opacity: 1 }, exit: { opacity: 0, scale: 1.05, filter: 'blur(10px)' },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  },
    React.createElement('div', {className: 'bg-aurora absolute inset-0 opacity-50'}),
    React.createElement('div', {className: 'bg-noise absolute inset-0'}),
    React.createElement('div', {className: 'absolute inset-0 bg-gradient-to-t from-[#050910] via-transparent to-[#050910]'}),
    React.createElement(motion.div, {
      className: 'relative z-10 flex flex-col items-center text-center',
      initial: { opacity: 0, y: 30 }, animate: { opacity: 1, y: 0 },
      transition: { duration: 1, delay: 0.2, ease: "easeOut" }
    },
      React.createElement(motion.div, {
        className: 'w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.35)] ring-1 ring-white/20',
        initial: { scale: 0.8, opacity: 0, rotate: -15 }, animate: { scale: 1, opacity: 1, rotate: 0 },
        transition: { type: 'spring', damping: 20, stiffness: 200, delay: 0.3 }
      }, React.createElement('i', { className: 'fas fa-balance-scale text-white text-4xl' })),
      React.createElement('h1', { className: 'text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg' }, 'LegalFlow'),
      React.createElement('p', { className: 'text-xs md:text-sm text-indigo-300/90 font-bold tracking-[0.4em] uppercase mb-10' }, 'India'),
      React.createElement(motion.div, {
        className: 'px-5 py-2 rounded-full glass-inner border border-indigo-500/20 flex items-center gap-3 shadow-lg',
        initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 },
        transition: { delay: 0.5, duration: 0.6 }
      },
        React.createElement('div', {className: 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'}),
        React.createElement('span', {className: 'text-surface-300 text-xs font-semibold tracking-wide'}, 'Loading case data...')
      ),
      React.createElement('div', { className: 'w-56 h-[3px] bg-surface-800/80 rounded-full mt-8 overflow-hidden shadow-inner' },
        React.createElement(motion.div, {
          className: 'h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400',
          initial: { width: '0%' }, animate: { width: '100%' },
          transition: { duration: 2.5, ease: "easeInOut", delay: 0.3 }
        })
      )
    )
  );
};

// Main App Component with Auth + Data Loading
const App = () => {
  // Auth states: 'checking' | 'login' | 'signup' | 'loading' | 'ready'
  const [authState, setAuthState] = useState('checking');
  const [loadError, setLoadError] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = window.lfAPI.getToken();
      if (!token) {
        setAuthState('login');
        return;
      }
      // Validate token
      const res = await window.lfAPI.getMe();
      if (res.success && res.data && res.data.authenticated) {
        window.__lfUser = res.data.user;
        localStorage.setItem('lf_user', JSON.stringify(res.data.user));
        setAuthState('loading');
        // Load data
        const ok = await loadAllData();
        if (ok) { setAuthState('ready'); }
        else { setLoadError('Failed to load data. Please try again.'); setAuthState('login'); }
      } else {
        window.lfAPI.clearAuth();
        setAuthState('login');
      }
    };
    checkAuth();
  }, []);

  // Handle 401 globally
  useEffect(() => {
    window.lfAPI.onUnauthorized = () => {
      setAuthState('login');
    };
  }, []);

  const handleLogin = async (user) => {
    setAuthState('loading');
    const ok = await loadAllData();
    if (ok) { setAuthState('ready'); }
    else { setLoadError('Failed to load data.'); setAuthState('login'); }
  };

  const handleSignup = handleLogin;

  // Render based on state
  if (authState === 'checking' || authState === 'loading') {
    return React.createElement(LoadingScreen);
  }
  if (authState === 'login') {
    return React.createElement(AnimatePresence, { mode: 'wait' },
      React.createElement(LoginScreen, { key: 'login', onLogin: handleLogin, onSwitchToSignup: () => setAuthState('signup') })
    );
  }
  if (authState === 'signup') {
    return React.createElement(AnimatePresence, { mode: 'wait' },
      React.createElement(SignupScreen, { key: 'signup', onSignup: handleSignup, onSwitchToLogin: () => setAuthState('login') })
    );
  }

  // authState === 'ready' – show dashboard
  return React.createElement(Router, null,
    React.createElement(motion.div, {
      key: 'main-layout',
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.8, ease: "easeOut" }
    },
      React.createElement(Layout, null,
        React.createElement(Route, {path:'/',component:DashboardPage}),
        React.createElement(Route, {path:'/cases',component:CasesPage}),
        React.createElement(Route, {path:'/cases/:id',component:CaseDetailsPage}),
        React.createElement(Route, {path:'/clients',component:ClientsPage}),
        React.createElement(Route, {path:'/documents',component:DocumentsPage}),
        React.createElement(Route, {path:'/billing',component:BillingPage}),
        React.createElement(Route, {path:'/time',component:TimeTrackingPage}),
        React.createElement(Route, {path:'/expenses',component:ExpenseTrackingPage}),
        React.createElement(Route, {path:'/team',component:TeamPage}),
        React.createElement(Route, {path:'/reports',component:ReportsPage}),
        React.createElement(Route, {path:'/calendar',component:CalendarPage})
      )
    )
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));