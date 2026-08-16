/* ============================================================
   CONTENT — single source of truth for the four nodes.
   Both the 3D scene and the HTML overlay read from here, so
   the WebGL build and the no-WebGL fallback can never drift.

   Each node:
     id      unique key, used for deep links (#about) and nav
     index   two-digit glyph painted on the 3D card
     title   card headline
     kicker  one line under the headline, on the card itself
     accent  hex int for Three.js, hex string for CSS
     blocks  overlay body, rendered by overlay.js
   ============================================================ */

export const PROFILE = {
  name: 'Prudhvi Raj PJ',
  role: 'Design Leader & UX Strategist',
  base: 'Hyderabad, India · Working globally',
  home: 'index.html'
};

/* Cyan → violet ramp. Four stops of one family, not four colours. */
export const ACCENTS = {
  about:    { hex: 0x22e7f5, css: '#22e7f5' },
  projects: { hex: 0x56aaff, css: '#56aaff' },
  skills:   { hex: 0x8a7dff, css: '#8a7dff' },
  contact:  { hex: 0xb85cff, css: '#b85cff' }
};

export const NODES = [
  {
    id: 'about',
    index: '01',
    title: 'About Me',
    kicker: 'Who you would be hiring',
    accent: ACCENTS.about,
    blocks: [
      {
        kind: 'lede',
        text: 'I am a design leader with 12 years across enterprise, telecom, banking and public health. I lead teams of 5–12 designers, own UX strategy with C-level stakeholders, and ship products used by millions — most recently for the World Health Organization, MTN and the IPL.'
      },
      {
        kind: 'stats',
        items: [
          { value: '12',   label: 'Years in the craft' },
          { value: '5–12', label: 'Designers led' },
          { value: '4',    label: 'Continents shipped to' },
          { value: '10+',  label: 'Industries' }
        ]
      },
      { kind: 'label', text: 'Three convictions' },
      {
        kind: 'rows',
        items: [
          {
            title: 'Vision before velocity',
            text: 'Shipping fast is worthless without a shared picture of where the product is going. I set that early, with the people who have to build it.'
          },
          {
            title: 'Designers grow, or work stalls',
            text: 'A team that only executes produces only what it was told. I mentor toward judgement, so good calls happen when nobody is watching.'
          },
          {
            title: 'Evidence outranks opinion',
            text: 'Taste sets the ceiling, evidence sets the floor. Every significant call is anchored in research, instrumentation, or a test agreed before the argument.'
          }
        ]
      }
    ]
  },

  {
    id: 'projects',
    index: '02',
    title: 'Projects',
    kicker: 'Three deep, five more',
    accent: ACCENTS.projects,
    blocks: [
      {
        kind: 'lede',
        text: 'Written up in full: the problem, how the team worked, and what shifted. Everything below shipped to production.'
      },
      {
        kind: 'cases',
        items: [
          {
            org: 'World Health Organization',
            title: 'WHO mYoga',
            href: 'case-studies/who-myyoga.html',
            meta: [
              ['Role', 'UX Lead, team of 6'],
              ['Problem', 'Wellbeing apps assumed literacy, bandwidth and a premium device'],
              ['Outcome', '2.1M+ downloads, 10 languages, offline-first']
            ]
          },
          {
            org: 'MTN Nigeria & South Africa',
            title: 'My MTN',
            href: 'case-studies/my-mtn.html',
            meta: [
              ['Role', 'Lead UX Designer, 5 months'],
              ['Problem', 'Recharge took five screens and drove customers to call centres'],
              ['Outcome', 'One-tap recharge, OTP removed from the critical path']
            ]
          },
          {
            org: 'BCCI · Indian Premier League',
            title: 'IPL Mobile',
            href: 'case-studies/ipl.html',
            meta: [
              ['Role', 'Lead Product Designer, team of 5'],
              ['Problem', 'One app serving the five-minute scroller and the stats obsessive'],
              ['Outcome', '+22% session length, 15s faster to score']
            ]
          }
        ]
      },
      { kind: 'label', text: 'Also shipped — write-ups on request' },
      {
        kind: 'rows',
        dense: true,
        items: [
          { title: 'GATI',           text: 'Allcargo logistics ecosystem, multiple connected apps', tag: 'Logistics' },
          { title: 'Citi Star',      text: 'Enterprise dashboards for balance-sheet processing',    tag: 'Banking' },
          { title: 'SCB Support AI', text: 'Data-heavy internal tooling with AI assistance',        tag: 'Banking · AI' },
          { title: 'Gamer 8',        text: 'Saudi Arabia’s flagship e-sports platform',             tag: 'E-sports' },
          { title: 'SLA DCP',        text: 'Digitising property transactions for Singapore Land Authority', tag: 'Real estate' }
        ]
      }
    ]
  },

  {
    id: 'skills',
    index: '03',
    title: 'Skills',
    kicker: 'What I actually do',
    accent: ACCENTS.skills,
    blocks: [
      {
        kind: 'lede',
        text: 'Four areas. Leadership is where most of the week goes; the rest is how the work gets proved.'
      },
      {
        kind: 'tagGroups',
        items: [
          {
            title: 'Leadership',
            text: 'Setting direction and building the people who deliver it.',
            tags: ['UX strategy', 'Team leadership & mentorship', 'Stakeholder management to C level',
                   'Design ops', 'Delivery estimation', 'RFP & POC submission', 'Cross-functional collaboration']
          },
          {
            title: 'Research',
            text: 'Turning an uncertain brief into evidence a team can act on.',
            tags: ['User interviews', 'Surveys', 'Ethnographic & demographic studies', 'Competitor & SWOT analysis',
                   'Feature benchmarking', 'Card sorting', 'Behavioural analytics', 'KPI definition']
          },
          {
            title: 'Design',
            text: 'From the shape of the information down to the states nobody demos.',
            tags: ['Information architecture', 'User flows & journey mapping', 'Personas', 'Wireframing',
                   'UI design', 'Design systems', 'Service blueprints', 'Accessibility, WCAG', 'UX writing']
          },
          {
            title: 'Validation',
            text: 'Proof that the thing works, agreed before the argument rather than after it.',
            tags: ['Usability testing', 'A/B testing', 'Eye tracking', 'Heat maps', 'Beta testing',
                   'Design-implementation QA']
          }
        ]
      }
    ]
  },

  {
    id: 'contact',
    index: '04',
    title: 'Contact',
    kicker: 'Let’s build something real',
    accent: ACCENTS.contact,
    blocks: [
      {
        kind: 'lede',
        text: 'Open to design leadership roles and selected consulting. If you are weighing a hard product problem, I would like to hear it.'
      },
      {
        kind: 'links',
        items: [
          { label: 'Email',    value: 'prudhviuxd@gmail.com',   href: 'mailto:prudhviuxd@gmail.com' },
          { label: 'Phone',    value: '+91 91775 98417',        href: 'tel:+919177598417' },
          { label: 'LinkedIn', value: '/prudhviraj-pj',         href: 'https://www.linkedin.com/in/prudhviraj-pj', external: true },
          { label: 'Behance',  value: '/prudhviuxd',            href: 'https://www.behance.net/prudhviuxd', external: true },
          { label: 'Résumé',   value: 'Full work history',      href: 'resume.html' }
        ]
      },
      { kind: 'note', text: 'Based in Hyderabad, India. Comfortable across IST, GMT and CET working hours.' }
    ]
  }
];

/** Look a node up by id. Returns undefined for unknown ids. */
export function nodeById(id) {
  return NODES.find((n) => n.id === id);
}
