import {Episode} from '../types';

export const STAGE1: Episode[] = [
  {
    id: '1.1',
    stage: 1,
    num: 1,
    title: 'Fix your interview questions',
    script: `Most user interviews fail before they start, because the questions are leading. Here's how I use AI to fix that. First, I write my research goal in one line: why do people abandon grocery checkout? Then I ask AI to draft a discussion guide from that goal. It's fast, but it always slips in questions like "Would you use a faster checkout?" Nobody can answer that honestly. So my second prompt is: flag every leading or future-tense question, and rewrite it about past behaviour. "Tell me about the last time you left a cart." AI drafts. You decide what's worth asking. What's the worst interview question you've been asked? Tell me in the comments. Follow for the next step.`,
    hot: ['leading', 'AI', 'honestly.', 'behaviour.', 'decide'],
    beats: [
      {scene: 'Statement', props: {kicker: 'USER INTERVIEWS', lines: ['Most interviews', 'fail *before*', 'they start.'], icon: 'chat', tone: 'bad', stamp: 'LEADING'}, cues: {stamp: 'are leading'}},
      {at: 'First, I write', scene: 'PromptCard', props: {label: 'MY RESEARCH GOAL · ONE LINE', text: 'Why do people abandon grocery checkout?'}},
      {
        at: 'Then I ask AI',
        scene: 'DocCard',
        props: {
          kicker: 'DISCUSSION GUIDE · AI DRAFT',
          lines: [
            {text: 'Tell me about how you shop for groceries.'},
            {text: 'Would you use a faster checkout?', mark: 'circle', cue: 'c1'},
            {text: 'Would you pay for faster delivery?', mark: 'circle', cue: 'c2'},
            {text: 'Walk me through your last order.'},
          ],
        },
        cues: {c1: 'Would you use', c2: 'Nobody can answer'},
      },
      {
        at: 'So my second prompt',
        scene: 'DocCard',
        props: {
          kicker: 'PROMPT 2 · REWRITE ABOUT THE PAST',
          lines: [
            {text: 'Would you use a faster checkout?', mark: 'strike', rewrite: 'Tell me about the last time you left a cart.', cue: 'r1'},
            {text: 'Would you pay for faster delivery?', mark: 'strike', rewrite: 'What happened the last time an order arrived late?', cue: 'r2'},
          ],
        },
        cues: {r1: 'rewrite it about', r2: 'Tell me about the last'},
      },
      {at: 'AI drafts.', scene: 'Statement', props: {lines: ['AI drafts.', '*You decide*', "what's worth asking."], icon: 'check', tone: 'good'}, cues: {l1: 'You decide', l2: 'You decide'}},
    ],
    question: ["What's the worst", 'interview question', "you've been asked?"],
    draft: '"Would you pay for this?"',
    follow: 'Follow for the next step.',
  },
  {
    id: '1.2',
    stage: 1,
    num: 2,
    title: 'Interview the right people',
    script: `Five interviews with the wrong people teach you nothing. Recruiting is where most research quietly fails. I ask AI to draft a screener: five questions that filter for people who actually ordered groceries online in the last month. Then I check two things AI usually misses. One: does any question give away the right answer? "Do you use grocery apps often?" Everyone says yes. Ask "How many orders did you place last month?" instead. Two: add one question that screens out designers and developers. They answer like designers. The screener decides who you hear from, so check it twice. Have you ever been screened out of a study? Follow for the next step.`,
    hot: ['nothing.', 'fails.', 'yes.', 'twice.'],
    beats: [
      {scene: 'Counter', props: {from: 5, to: 0, label: 'interviews', toLabel: 'useful insights', icon: 'chat'}, cues: {drop: 'teach you nothing'}},
      {at: 'Recruiting is where', scene: 'Statement', props: {kicker: 'RECRUITING', lines: ['Where research', '*quietly* fails.'], icon: 'search', tone: 'bad'}},
      {at: 'I ask AI', scene: 'PromptCard', props: {label: 'PROMPT · SCREENER', text: 'Draft a 5-question screener for people who ordered groceries online in the last month.'}},
      {
        at: 'Then I check two',
        scene: 'DocCard',
        props: {
          kicker: 'SCREENER · CHECK 1: GIVEAWAYS',
          lines: [
            {text: 'Which apps have you ordered from?'},
            {text: 'Do you use grocery apps often?', mark: 'strike', rewrite: 'How many orders did you place last month?', tag: 'GIVES IT AWAY', tone: 'bad', cue: 's'},
          ],
        },
        cues: {s: 'Everyone says yes'},
      },
      {
        at: 'Two: add one',
        scene: 'DocCard',
        props: {
          kicker: 'SCREENER · CHECK 2: SCREEN OUT',
          lines: [
            {text: 'Which apps have you ordered from?'},
            {text: 'How many orders did you place last month?'},
            {text: 'Do you work in design, UX or software?', mark: 'highlight', tag: 'SCREEN OUT', tone: 'good', cue: 'a', appear: 'a'},
          ],
        },
        cues: {a: 'screens out'},
      },
      {at: 'The screener decides', scene: 'Statement', props: {lines: ['The screener decides', 'who you *hear from*.'], stamp: 'CHECK TWICE', tone: 'good'}, cues: {stamp: 'check it twice'}},
    ],
    question: ['Have you ever', 'been screened out', 'of a study?'],
    draft: 'Yes, for working in tech!',
    follow: 'Follow for the next step.',
  },
  {
    id: '1.3',
    stage: 1,
    num: 3,
    title: 'Make AI show its source',
    script: `Ten interviews leave you with hours of notes. AI can turn them into themes in a minute. Here's the catch. When I ask AI to cluster interview notes, it sometimes invents a theme that sounds right but no user said. So I add one line to the prompt: for every theme, quote the participant and the line it came from. Then I open the notes and check three quotes at random. If a quote isn't there, the theme goes. Speed comes from AI. Trust comes from the quote. Would you trust AI to summarise your research? Tell me in the comments. Follow for the next step.`,
    hot: ['minute.', 'invents', 'quote', 'random.', 'goes.', 'Trust'],
    beats: [
      {
        scene: 'CardFan',
        props: {
          kicker: '10 INTERVIEWS · HOURS OF NOTES',
          cols: 3,
          size: 26,
          cards: [
            {text: 'P1: fee showed up late', style: 'note'},
            {text: 'P2: checks total twice', style: 'note'},
            {text: 'P3: orders at night', style: 'note'},
            {text: 'P4: left at 11 PM', style: 'note'},
            {text: 'P5: total "jumped"', style: 'note'},
            {text: 'P6: shops in a hurry', style: 'note'},
            {text: 'P7: compares 2 apps', style: 'note'},
            {text: 'P8: slots too rigid', style: 'note'},
            {text: 'P9: coupon failed', style: 'note'},
          ],
        },
      },
      {
        at: 'AI can turn them',
        scene: 'CardFan',
        props: {
          kicker: 'AI THEMES',
          cols: 2,
          cards: [
            {text: 'Surprise fees cause drop-off', icon: 'tag'},
            {text: 'People shop in a hurry', icon: 'bolt'},
            {text: 'Users want loyalty points', icon: 'sparkle', reject: true},
            {text: 'Delivery slots feel rigid', icon: 'list'},
          ],
        },
        cues: {reject: 'invents a theme'},
      },
      {at: 'So I add one line', scene: 'PromptCard', props: {label: 'ONE EXTRA LINE IN THE PROMPT', text: 'For every theme, quote the participant and the line it came from.'}},
      {
        at: 'Then I open',
        scene: 'DocCard',
        props: {
          kicker: 'SPOT CHECK · 3 QUOTES AT RANDOM',
          lines: [
            {text: 'P2: "The fee showed up at the very end."', mark: 'check', cue: 'a'},
            {text: 'P5: "I left when the total jumped."', mark: 'check', cue: 'a'},
            {text: 'P7: "I collect loyalty points."', mark: 'cross', tag: 'NOT IN NOTES', tone: 'bad', cue: 'b'},
          ],
        },
        cues: {a: 'check three quotes', b: 'the theme goes'},
      },
      {at: 'Speed comes from', scene: 'Statement', props: {lines: ['Speed comes from *AI*.', 'Trust comes from', 'the *quote*.'], size: 88}, cues: {l1: 'Trust comes', l2: 'Trust comes'}},
    ],
    question: ['Would you trust AI', 'to summarise', 'your research?'],
    draft: 'Only with quotes attached.',
    follow: 'Follow for the next step.',
  },
  {
    id: '1.4',
    stage: 1,
    num: 4,
    title: 'No quote, no sticky note',
    script: `An empathy map is only useful if every sticky note comes from a real user. I paste my interview quotes into AI and ask it to sort them into Says, Thinks, Does and Feels. It's quick, and it's good at spotting the gap between what people say and what they do. "I always compare prices," while the notes show they never opened a second app. But Thinks and Feels are guesses. So I keep one rule: no quote, no sticky note. Anything AI adds without a quote gets deleted. What's one thing users say but never actually do? Follow for the next step.`,
    hot: ['real', 'gap', 'guesses.', 'deleted.'],
    beats: [
      {scene: 'Statement', props: {kicker: 'EMPATHY MAP', lines: ['Every sticky note', 'needs a *real user*.'], icon: 'chat', tone: 'good'}},
      {
        at: 'I paste my interview',
        scene: 'Grid2x2',
        props: {
          quadrants: ['SAYS', 'THINKS', 'DOES', 'FEELS'],
          items: [
            {text: '"I always compare prices."', x: 0.25, y: 0.72, sticky: true, appear: 's'},
            {text: '"Is this fee normal?"', x: 0.75, y: 0.72, sticky: true, appear: 's'},
            {text: 'Never opened a second app', x: 0.25, y: 0.22, sticky: true, appear: 'gap', hot: true},
            {text: '"I just gave up."', x: 0.75, y: 0.22, sticky: true, appear: 's'},
          ],
        },
        cues: {s: 'sort them', gap: 'spotting the gap', hot: 'they never opened'},
      },
      {
        at: 'But Thinks and Feels',
        scene: 'Grid2x2',
        props: {
          quadrants: ['SAYS', 'THINKS', 'DOES', 'FEELS'],
          items: [
            {text: '"I always compare prices."', x: 0.25, y: 0.72, sticky: true, appear: 'z'},
            {text: 'Wants a cheaper app', x: 0.75, y: 0.75, sticky: true, appear: 'z', reject: true},
            {text: 'Never opened a second app', x: 0.25, y: 0.22, sticky: true, appear: 'z'},
            {text: 'Feels loyal to the brand', x: 0.75, y: 0.25, sticky: true, appear: 'z', reject: true},
          ],
        },
        cues: {z: 'But Thinks', reject: 'no quote, no'},
      },
      {at: 'Anything AI adds', scene: 'Statement', props: {lines: ['Anything AI adds', '*without a quote*'], stamp: 'DELETED', tone: 'bad'}, cues: {stamp: 'gets deleted'}},
    ],
    question: ["What's one thing", 'users say but', 'never actually do?'],
    draft: '"I always read the reviews."',
    follow: 'Follow for the next step.',
  },
  {
    id: '1.5',
    stage: 1,
    num: 5,
    title: "The stage you can't outsource",
    script: `Can AI replace user interviews? You'll see tools that offer synthetic users: AI personas you can interview. They answer smoothly, and that's the problem. They give you the average of the internet, not the person who left a cart at 11 PM because the delivery fee jumped. In my interviews, the most useful moments were the ones nobody could predict: a pause, a workaround, a reason they almost didn't mention. Use AI to prepare, take notes and sort. Do the listening yourself. Empathy is the one stage you can't outsource. Have you tried synthetic users? Tell me in the comments. Follow for the next stage: Define.`,
    hot: ['synthetic', 'problem.', 'average', 'listening', 'outsource.'],
    beats: [
      {scene: 'Statement', props: {lines: ['Can AI replace', '*user interviews?*'], icon: 'robot', tone: 'ai'}},
      {
        at: "You'll see tools",
        scene: 'Compare',
        props: {
          top: {label: 'SYNTHETIC USER · AI PERSONA', style: 'chat', tone: 'bad', text: '"I value convenience and transparent pricing when I shop online."', badge: 'TOO SMOOTH'},
          bottom: {label: 'REAL INTERVIEW · P4', style: 'chat', tone: 'good', text: '"…(long pause)… I left at *11 PM*. The delivery fee just *jumped*."'},
        },
        cues: {bottom: 'not the person'},
      },
      {
        at: 'In my interviews',
        scene: 'CardFan',
        props: {
          kicker: 'WHAT NOBODY COULD PREDICT',
          cols: 1,
          size: 44,
          cards: [
            {text: 'A pause', icon: 'bell', appear: 'a0'},
            {text: 'A workaround', icon: 'link', appear: 'a1'},
            {text: "A reason they almost didn't mention", icon: 'chat', appear: 'a2'},
          ],
        },
        cues: {a0: 'a pause', a1: 'a workaround', a2: 'a reason'},
      },
      {
        at: 'Use AI to prepare',
        scene: 'Timeline',
        props: {
          steps: [
            {label: 'AI', sub: 'Prepare', icon: 'sparkle'},
            {label: 'AI', sub: 'Take notes & sort', icon: 'list'},
            {label: 'YOU', sub: 'Do the listening', icon: 'chat'},
          ],
        },
        cues: {s0: 'prepare', s1: 'take notes', s2: 'Do the listening'},
      },
      {at: 'Empathy is the one', scene: 'Statement', props: {kicker: 'EMPATHY', lines: ['The one stage', "you *can't outsource*."], icon: 'chat', tone: 'good'}},
    ],
    question: ['Have you tried', 'synthetic users?'],
    draft: 'Tried it. Felt like talking to an FAQ.',
    follow: 'Follow for the next stage: Define.',
  },
];
