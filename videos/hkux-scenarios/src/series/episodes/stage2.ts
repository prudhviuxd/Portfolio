import {Episode} from '../types';

const OR = '#FF7A3D';

export const STAGE2: Episode[] = [
  {
    id: '2.1',
    stage: 2,
    num: 1,
    title: 'A problem with no solution in it',
    script: `If your problem statement mentions a solution, it isn't a problem statement. After research, I give AI my top themes and ask for a point-of-view statement: user, need, insight. The first draft usually sneaks in a feature. "Users need a one-tap checkout." That's a solution. So I push back: rewrite it without any feature. "Busy parents need to know the final price before they commit, because surprise fees make them abandon the order." Now the team can solve it ten different ways. AI writes fast. You keep it honest. Does your team write problem statements, or jump straight to features? Follow for the next step.`,
    hot: ['solution,', 'solution.', 'feature.', 'honest.'],
    beats: [
      {scene: 'Statement', props: {kicker: 'PROBLEM STATEMENTS', lines: ['Mentions a solution?', "It's *not a problem*", '*statement.*'], icon: 'x', tone: 'bad', size: 84}},
      {
        at: 'After research',
        scene: 'PromptCard',
        props: {label: 'POINT OF VIEW', text: 'From these themes, write: [user] needs [need] because [insight].', reply: ['Users need a *one-tap checkout*.'], replyLabel: 'AI FIRST DRAFT'},
        cues: {reply: 'The first draft'},
      },
      {
        at: "That's a solution",
        scene: 'DocCard',
        props: {
          kicker: 'PROBLEM STATEMENT',
          size: 40,
          lines: [
            {text: 'Users need a one-tap checkout.', mark: 'strike', tag: 'SOLUTION', tone: 'bad', cue: 's'},
            {text: 'Busy parents need to know the *final price* before they commit, because *surprise fees* make them abandon the order.', mark: 'check', tone: 'good', cue: 'b', appear: 'b'},
          ],
        },
        cues: {s: "That's a solution", b: 'Busy parents'},
      },
      {
        at: 'Now the team',
        scene: 'CardFan',
        props: {
          kicker: 'TEN DIFFERENT WAYS TO SOLVE IT',
          cols: 2,
          size: 30,
          cards: [
            {text: 'Live cart total', icon: 'cart'},
            {text: 'Fees on screen one', icon: 'list'},
            {text: 'Price locked at cart', icon: 'tag'},
            {text: 'Budget alert', icon: 'bell'},
            {text: 'One honest price', icon: 'check'},
            {text: 'Fee explainer', icon: 'chat'},
          ],
        },
      },
      {at: 'AI writes fast', scene: 'Statement', props: {lines: ['AI writes *fast*.', 'You keep it *honest*.']}, cues: {l1: 'You keep'}},
    ],
    question: ['Does your team', 'write problem statements,', 'or jump to features?'],
    draft: 'Straight to features, every time.',
    follow: 'Follow for the next step.',
  },
  {
    id: '2.2',
    stage: 2,
    num: 2,
    title: 'Twenty HMWs, keep three',
    script: `A good "How might we" question is not too wide and not too narrow. I ask AI for twenty HMW questions from one problem statement. Twenty in ten seconds: that's the useful part. Then I sort them. "How might we improve grocery shopping?" Too wide; you can't start. "How might we add a price pop-up?" Too narrow; it's a solution again. "How might we show the full price before people decide?" That one's just right. I keep three and drop seventeen. AI gives you volume. Your judgement gives you the three worth solving. What's a "How might we" your team is stuck on? Follow for the next step.`,
    hot: ['wide', 'narrow.', 'wide;', 'narrow;', 'right.', 'volume.', 'judgement'],
    beats: [
      {scene: 'Statement', props: {kicker: '"HOW MIGHT WE"', lines: ['Not too *wide*.', 'Not too *narrow*.']}, cues: {l1: 'not too narrow'}},
      {
        at: 'I ask AI',
        scene: 'CardFan',
        props: {
          kicker: '20 HMW QUESTIONS · 10 SECONDS',
          cols: 4,
          size: 20,
          cards: [
            'make fees clear', 'show the total early', 'cut checkout steps', 'explain each fee', 'lock the price', 'warn on budget',
            'improve shopping', 'add a pop-up', 'show full price', 'reward loyalty', 'speed up search', 'simplify slots',
            'remove a fee', 'compare prices', 'preview delivery', 'save the cart', 'split fees', 'show savings', 'trust the total', 'cut surprises',
          ].map((t) => ({text: `HMW ${t}?`, style: 'ai' as const})),
        },
      },
      {
        at: 'Then I sort them',
        scene: 'DocCard',
        props: {
          kicker: 'SORTING THE TWENTY',
          size: 36,
          lines: [
            {text: 'HMW improve grocery shopping?', tag: 'TOO WIDE', tone: 'bad', cue: 'a', appear: 'pa'},
            {text: 'HMW add a price pop-up?', tag: 'TOO NARROW', tone: 'bad', cue: 'b', appear: 'pb'},
            {text: 'HMW show the full price before people decide?', tag: 'JUST RIGHT', tone: 'good', mark: 'highlight', cue: 'c', appear: 'pc'},
          ],
        },
        cues: {pa: 'How might we improve', a: 'Too wide', pb: 'How might we add', b: 'Too narrow', pc: 'How might we show', c: 'just right'},
      },
      {at: 'I keep three', scene: 'Counter', props: {from: 20, to: 3, label: 'HMW questions', toLabel: 'worth solving'}, cues: {drop: 'drop seventeen'}},
      {at: 'AI gives you volume', scene: 'Statement', props: {lines: ['AI gives you *volume*.', 'You pick the', '*three worth solving*.'], size: 88}, cues: {l1: 'Your judgement', l2: 'Your judgement'}},
    ],
    question: ["What's a", '"How might we"', 'your team is stuck on?'],
    draft: 'HMW make onboarding shorter?',
    follow: 'Follow for the next step.',
  },
  {
    id: '2.3',
    stage: 2,
    num: 3,
    title: 'Personas from data, not fiction',
    script: `AI can write a persona in five seconds. That's exactly why most AI personas are fiction. Ask for "a persona for a grocery app" and you get Priya, 32, loves yoga, values convenience. None of that came from your users. Here's what I do instead. I paste my research themes and quotes, and ask AI to build the persona only from them, and to mark every line "from research" or "assumption". Then I delete or test every assumption. A persona should be a summary of real people, not a character you made up. Does your team still use made-up personas? Tell me in the comments. Follow for the next step.`,
    hot: ['fiction.', 'None', 'only', 'assumption.', 'real'],
    beats: [
      {scene: 'Statement', props: {lines: ['A persona in', '*five seconds*.'], icon: 'robot', tone: 'ai', stamp: 'FICTION'}, cues: {stamp: 'are fiction'}},
      {
        at: 'Ask for',
        scene: 'DocCard',
        props: {
          kicker: 'AI PERSONA · NO DATA',
          title: 'Priya, 32',
          lines: [
            {text: 'Loves yoga', mark: 'cross', cue: 'n', appear: 'y'},
            {text: 'Values convenience', mark: 'cross', cue: 'n', appear: 'v'},
            {text: 'Shops on weekends', mark: 'cross', cue: 'n', appear: 'v'},
          ],
        },
        cues: {y: 'loves yoga', v: 'values convenience', n: 'None of that'},
      },
      {at: "Here's what I do", scene: 'PromptCard', props: {label: 'PROMPT', text: 'Build the persona only from these themes and quotes. Mark every line "from research" or "assumption".'}},
      {
        at: 'Then I delete',
        scene: 'DocCard',
        props: {
          kicker: 'PERSONA · FROM RESEARCH',
          title: 'Busy parent, orders weekly',
          lines: [
            {text: 'Leaves when fees appear late', tag: 'RESEARCH', tone: 'good', cue: 't'},
            {text: 'Checks the total twice', tag: 'RESEARCH', tone: 'good', cue: 't'},
            {text: 'Loves yoga', tag: 'ASSUMPTION', tone: 'bad', mark: 'strike', cue: 'd'},
            {text: 'Prefers dark mode', tag: 'ASSUMPTION', tone: 'bad', mark: 'strike', cue: 'd'},
          ],
        },
        cues: {t: 'Then I delete', d: 'every assumption'},
      },
      {at: 'A persona should', scene: 'Statement', props: {lines: ['Real people,', 'not a *character*', '*you made up*.']}, cues: {l1: 'not a character', l2: 'not a character'}},
    ],
    question: ['Does your team still', 'use made-up', 'personas?'],
    draft: 'Ours has a name, a dog and no data.',
    follow: 'Follow for the next step.',
  },
  {
    id: '2.4',
    stage: 2,
    num: 4,
    title: 'Find the one deep drop',
    script: `A journey map shows where users struggle. AI can draft one, if you give it the right input. I give AI my interview notes and ask for a journey map with five stages: discover, choose, add to cart, checkout, delivery. For each stage: what the user does, what they feel, and the evidence. It drafts in seconds. Then I check the emotional curve. AI tends to make every stage a little bit frustrating. Real journeys have one or two deep drops. In my grocery example, it's checkout, when the fees appear. That drop is where you design first. Where does your product's journey drop? Follow for the next step.`,
    hot: ['struggle.', 'evidence.', 'deep', 'checkout,', 'first.'],
    beats: [
      {scene: 'Statement', props: {kicker: 'JOURNEY MAPS', lines: ['Where do users', '*struggle?*'], icon: 'search'}},
      {at: 'I give AI', scene: 'PromptCard', props: {label: 'PROMPT · FROM MY INTERVIEW NOTES', text: 'Journey map, 5 stages: discover, choose, add to cart, checkout, delivery. For each: does, feels (1–5), evidence.'}},
      {
        at: 'Then I check',
        scene: 'Curve',
        props: {
          stages: ['Discover', 'Choose', 'Add to cart', 'Checkout', 'Delivery'],
          lines: [
            {label: "AI's draft", values: [3, 2.6, 3, 2.6, 3]},
            {label: 'Real interviews', values: [4, 4.2, 3.8, 1.2, 3.6], color: OR},
          ],
          drop: {index: 3, label: 'Fees appear'},
        },
        cues: {s0: 'a little bit', s1: 'Real journeys', drop: 'when the fees'},
      },
      {at: 'That drop is', scene: 'Statement', props: {lines: ['That drop is where', 'you *design first*.'], icon: 'target'}},
    ],
    question: ['Where does your', "product's journey", 'drop?'],
    draft: 'Right at sign-up. Every time.',
    follow: 'Follow for the next step.',
  },
  {
    id: '2.5',
    stage: 2,
    num: 5,
    title: 'Count with AI, judge the hurt',
    script: `You found twelve problems. You can solve three this quarter. Which three? I ask AI to count how many participants mentioned each problem, from my notes, and to quote one example for each. Then I put them on a simple grid: how often it happens, and how badly it hurts. AI is good at the counting. But it can't judge the hurt. Hidden fees came up in four interviews, and every time, the person left without ordering. That outranks a slow search that eight people mentioned and shrugged off. Count with AI. Decide with evidence. How does your team pick what to fix first? Follow for the next stage: Ideate.`,
    hot: ['three', 'counting.', 'hurt.', 'outranks', 'evidence.'],
    beats: [
      {scene: 'Counter', props: {from: 12, to: 3, label: 'problems found', toLabel: 'slots this quarter', icon: 'list'}, cues: {drop: 'solve three'}},
      {
        at: 'I ask AI',
        scene: 'DocCard',
        props: {
          kicker: 'AI COUNT · FROM MY NOTES',
          lines: [
            {text: 'Slow search', tag: '8 PEOPLE', cue: 'c'},
            {text: 'Hidden fees', tag: '4 PEOPLE', cue: 'c'},
            {text: 'Coupon errors', tag: '3 PEOPLE', cue: 'c'},
            {text: 'Small images', tag: '2 PEOPLE', cue: 'c'},
          ],
        },
        cues: {c: 'how many participants'},
      },
      {
        at: 'Then I put them',
        scene: 'Grid2x2',
        props: {
          xLabel: 'HOW OFTEN',
          yLabel: 'HOW BADLY IT HURTS',
          items: [
            {text: 'Slow search · 8 people', x: 0.78, y: 0.2, appear: 'g'},
            {text: 'Coupon errors · 3', x: 0.3, y: 0.45, appear: 'g'},
            {text: 'Small images · 2', x: 0.22, y: 0.12, appear: 'g'},
            {text: 'Hidden fees · 4 · everyone left', x: 0.66, y: 0.86, hot: true, appear: 'hf'},
          ],
        },
        cues: {g: 'how often', hf: 'Hidden fees', hot: 'every time'},
      },
      {at: 'Count with AI', scene: 'Statement', props: {lines: ['Count with *AI*.', 'Decide with', '*evidence*.']}, cues: {l1: 'Decide with', l2: 'Decide with'}},
    ],
    question: ['How does your team', 'pick what to', 'fix first?'],
    draft: 'Whoever shouts loudest, honestly.',
    follow: 'Follow for the next stage: Ideate.',
  },
];
