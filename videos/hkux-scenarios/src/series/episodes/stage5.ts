import {Episode} from '../types';

// 5.1 is the hand-built composition "HKUX-Scenarios".
export const STAGE5: Episode[] = [
  {
    id: '5.2',
    stage: 5,
    num: 2,
    title: "Don't help the user",
    script: `The fastest way to ruin a usability test is to help the user. "Did you see the fee there?" Now they did, and your data is gone. Before every test, I give AI my moderator script and ask: flag every line that leads, hints or explains the design. It catches things I still miss. "Is this clear?" becomes "What do you expect to happen next?" "Do you like it?" becomes "Tell me what you're thinking." AI can review the script. In the room, the hardest skill is still yours: staying quiet when they struggle. Is silence hard for you in tests? Tell me in the comments. Follow for the next step.`,
    hot: ['help', 'gone.', 'leads,', 'hints', 'quiet'],
    beats: [
      {scene: 'Statement', props: {lines: ['Ruin a test:', '*help the user*.'], icon: 'x', tone: 'bad'}},
      {
        at: '"Did you see',
        scene: 'Compare',
        props: {
          top: {label: 'MODERATOR', style: 'chat', tone: 'bad', text: '"Did you see the fee there?"'},
          bottom: {label: 'YOUR DATA', tone: 'bad', text: '*Gone.* Now they saw it.', badge: 'LEADING'},
        },
        cues: {bottom: 'Now they did'},
      },
      {at: 'Before every test', scene: 'PromptCard', props: {label: 'MODERATOR SCRIPT CHECK', text: 'Flag every line that leads, hints or explains the design.'}},
      {
        at: 'It catches',
        scene: 'DocCard',
        props: {
          kicker: 'MODERATOR SCRIPT',
          size: 40,
          lines: [
            {text: '"Is this clear?"', mark: 'strike', rewrite: '"What do you expect to happen next?"', cue: 'a'},
            {text: '"Do you like it?"', mark: 'strike', rewrite: '"Tell me what you\'re thinking."', cue: 'b'},
          ],
        },
        cues: {a: 'becomes "What', b: 'becomes "Tell'},
      },
      {at: 'AI can review', scene: 'Statement', props: {lines: ['AI reviews the script.', '*You stay quiet*', 'when they struggle.'], icon: 'chat', size: 84}, cues: {l1: 'staying quiet', l2: 'staying quiet'}},
    ],
    question: ['Is silence hard', 'for you', 'in tests?'],
    draft: 'So hard. I always want to jump in.',
    follow: 'Follow for the next step.',
  },
  {
    id: '5.3',
    stage: 5,
    num: 3,
    title: 'AI points, you watch',
    script: `Five test sessions, five hours of video. AI can summarise them in minutes, and I let it. I give AI the transcripts and ask for every moment a participant hesitated, went back, or said something unexpected, with timestamps. That's the useful part: timestamps. Because then I watch those clips myself. Transcripts miss the most important things: the long pause before tapping Pay, the thumb hovering over the fee line, the sigh. AI tells you where to look. Your eyes tell you what happened. Do you watch your test recordings, or just read the notes? Follow for the next step.`,
    hot: ['minutes,', 'timestamps.', 'watch', 'pause', 'look.', 'eyes'],
    beats: [
      {scene: 'Statement', props: {lines: ['5 sessions.', '*5 hours* of video.'], icon: 'search', size: 100}, cues: {l1: 'five hours'}},
      {
        at: 'I give AI',
        scene: 'Transcript',
        props: {
          rows: [
            {ts: '02:14', text: 'P1 opens the cart, scrolls'},
            {ts: '04:12', text: 'P3 pauses before Pay', hot: true},
            {ts: '07:40', text: 'P2 goes back to the list', hot: true},
            {ts: '09:05', text: 'P4: "Wait, what\'s this fee?"', hot: true},
            {ts: '11:30', text: 'P5 places the order'},
          ],
        },
        cues: {light: 'with timestamps', clip: 'I watch those'},
      },
      {
        at: 'AI tells you',
        scene: 'Compare',
        props: {top: {label: 'AI', tone: 'neutral', text: 'Tells you *where to look*.'}, bottom: {label: 'YOUR EYES', tone: 'good', text: 'Tell you *what happened*.'}},
        cues: {bottom: 'Your eyes'},
      },
    ],
    question: ['Do you watch', 'your test recordings,', 'or just read the notes?'],
    draft: 'Notes only... until now.',
    follow: 'Follow for the next step.',
  },
  {
    id: '5.4',
    stage: 5,
    num: 4,
    title: 'Severity is impact, not frequency',
    script: `Your test found fifteen issues. The team will fix three. Make sure they're the right three. I ask AI to draft a findings table: issue, how many participants hit it, and a suggested severity from one to four. It's a great first draft. But AI rates by how often something happened. Severity is about impact. One participant couldn't find the total at all and gave up. That's a four, even if it happened once. Three people said the font was small and carried on. That's a one. Let AI draft the table. You set the severity. How does your team rate usability issues? Follow for the next step.`,
    hot: ['three.', 'often', 'impact.', 'four,', 'one.', 'severity.'],
    beats: [
      {scene: 'Counter', props: {from: 15, to: 3, label: 'issues found', toLabel: 'will get fixed', icon: 'alert'}, cues: {drop: 'will fix three'}},
      {
        at: 'I ask AI',
        scene: 'DocCard',
        props: {
          kicker: 'FINDINGS · AI DRAFT → YOUR CALL',
          size: 34,
          lines: [
            {text: 'Small font on fee lines · 3 people, carried on', tag: 'SEV 3', tagTo: 'SEV 1', tone: 'good', cue: 'one'},
            {text: 'Coupon field missed · 2 people', tag: 'SEV 2'},
            {text: "Couldn't find the total, gave up · 1 person", tag: 'SEV 1', tagTo: 'SEV 4', tone: 'bad', mark: 'highlight', cue: 'four'},
          ],
        },
        cues: {four: "That's a four", one: "That's a one"},
      },
      {
        at: 'Let AI draft',
        scene: 'Compare',
        props: {top: {label: 'AI', tone: 'neutral', text: 'Drafts *the table*.'}, bottom: {label: 'YOU', tone: 'good', text: 'Set *the severity*.'}},
        cues: {bottom: 'You set'},
      },
    ],
    question: ['How does your team', 'rate usability', 'issues?'],
    draft: 'By impact, 1 to 4. Finally.',
    follow: 'Follow for the next step.',
  },
  {
    id: '5.5',
    stage: 5,
    num: 5,
    title: "It's a loop, not a line",
    script: `Design thinking is drawn as five steps in a line. It's really a loop. Our test showed something we didn't expect. People understood the live total, but they wanted to know why each fee existed. That's not a prototype fix. That's a new insight, so we go back to Define. A new problem statement: busy parents need to trust why they're paying each fee. AI helps you move around the loop faster: drafting, sorting, summarising. But the decision to go back is yours, and it's the most important decision in the whole process. Which stage does your team skip most? Tell me in the comments. Follow for more AI × UX.`,
    hot: ['loop.', 'why', 'insight,', 'Define.', 'yours,'],
    beats: [
      {scene: 'Loop', props: {stages: ['Empathise', 'Define', 'Ideate', 'Prototype', 'Test'], note: ''}, cues: {bend: "It's really"}},
      {
        at: 'Our test showed',
        scene: 'Compare',
        props: {
          top: {label: 'PEOPLE UNDERSTOOD', tone: 'good', text: 'The live total.'},
          bottom: {label: 'BUT THEY WANTED TO KNOW', tone: 'neutral', text: '*Why* each fee existed.', badge: 'NEW INSIGHT'},
        },
        cues: {bottom: 'but they wanted'},
      },
      {
        at: "That's not a prototype",
        scene: 'Loop',
        props: {stages: ['Empathise', 'Define', 'Ideate', 'Prototype', 'Test'], note: 'Busy parents need to trust why they\'re paying each fee.'},
        cues: {bend: "That's not", back: 'go back to Define'},
      },
      {at: 'AI helps you move', scene: 'Statement', props: {lines: ['AI moves you around', 'the loop *faster*.'], icon: 'sparkle', tone: 'ai', size: 88}},
      {at: 'But the decision', scene: 'Statement', props: {kicker: 'THE MOST IMPORTANT DECISION', lines: ['Going back', 'is *yours*.'], icon: 'target', size: 110}, cues: {l1: 'is yours'}},
    ],
    question: ['Which stage does', 'your team', 'skip most?'],
    draft: 'Empathise. We jump to Ideate.',
    follow: 'Follow for more AI × UX.',
  },
];
