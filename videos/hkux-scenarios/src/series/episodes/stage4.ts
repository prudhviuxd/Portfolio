import {Episode} from '../types';

export const STAGE4: Episode[] = [
  {
    id: '4.1',
    stage: 4,
    num: 1,
    title: 'Prototype the riskiest assumption',
    script: `The biggest prototyping mistake is building everything. Before I open any tool, I ask AI one question: here's my idea, list every assumption it depends on, riskiest first. For the live cart total, the riskiest one is: will a changing total make people add less, or trust us more? That's all the prototype needs to answer. Two screens, not twenty. No login, no settings, no profile. AI is good at listing assumptions you didn't know you had. Picking the one to test is your call. What's the biggest thing you've prototyped that nobody needed? Follow for the next step.`,
    hot: ['everything.', 'riskiest', 'Two', 'call.'],
    beats: [
      {scene: 'Statement', props: {lines: ['Biggest mistake:', 'building', '*everything*.'], icon: 'x', tone: 'bad'}},
      {at: 'Before I open', scene: 'PromptCard', props: {label: 'ONE QUESTION', text: "Here's my idea. List every assumption it depends on, riskiest first."}},
      {
        at: 'For the live cart',
        scene: 'DocCard',
        props: {
          kicker: 'ASSUMPTIONS · RISKIEST FIRST',
          lines: [
            {text: 'A changing total makes people *add less*, or *trust us more*', mark: 'circle', tag: '#1', cue: 'r'},
            {text: 'People notice the total updating', tag: '#2', cue: 'r'},
            {text: 'Fees fit on one line', tag: '#3', cue: 'r'},
            {text: 'Users want a running total at all', tag: '#4', cue: 'r'},
          ],
        },
        cues: {r: 'will a changing'},
      },
      {at: 'Two screens', scene: 'Counter', props: {from: 20, to: 2, label: 'screens planned', toLabel: 'screens to build', icon: 'list'}, cues: {drop: 'not twenty'}},
      {
        at: 'AI is good',
        scene: 'Compare',
        props: {
          top: {label: 'AI', tone: 'neutral', text: "Lists assumptions you *didn't know* you had."},
          bottom: {label: 'YOU', tone: 'good', text: 'Pick *the one to test*.'},
        },
        cues: {bottom: 'Picking the one'},
      },
    ],
    question: ["What's the biggest thing", "you've prototyped", 'that nobody needed?'],
    draft: 'A full settings page. Nobody opened it.',
    follow: 'Follow for the next step.',
  },
  {
    id: '4.2',
    stage: 4,
    num: 2,
    title: 'Keep it ugly on purpose',
    script: `My prototypes still start on paper. Then AI helps me skip the boring part. I sketch the cart screen in two minutes: list, total, button. I take a photo and ask an AI design tool to turn it into a clean wireframe. In a minute I have something I can click through. But I keep it grey. No colours, no brand, no polish. If it looks finished, users comment on the colours. If it looks rough, they comment on the idea. And the idea is what you're testing. Sketch fast, let AI clean it up, keep it ugly on purpose. Do you start on paper or on screen? Follow for the next step.`,
    hot: ['paper.', 'grey.', 'colours.', 'idea.', 'ugly'],
    beats: [
      {scene: 'Statement', props: {lines: ['Prototypes start', 'on *paper*.'], icon: 'list', size: 110}},
      {
        at: 'I sketch the cart',
        scene: 'Phone',
        props: {
          mode: 'sketch',
          title: 'Cart',
          items: [
            {name: 'Item', price: '₹'},
            {name: 'Item', price: '₹'},
            {name: 'Item', price: '₹'},
          ],
          button: 'Order',
          palette: true,
        },
        cues: {swap: 'turn it into', palette: 'No colours'},
      },
      {
        at: 'If it looks finished',
        scene: 'Compare',
        props: {
          top: {label: 'LOOKS FINISHED', tone: 'bad', text: 'Users comment on the *colours*.'},
          bottom: {label: 'LOOKS ROUGH', tone: 'good', text: 'Users comment on the *idea*.'},
        },
        cues: {bottom: 'If it looks rough'},
      },
      {
        at: 'Sketch fast',
        scene: 'Timeline',
        props: {
          steps: [
            {label: 'YOU', sub: 'Sketch fast', icon: 'list'},
            {label: 'AI', sub: 'Clean it up', icon: 'sparkle'},
            {label: 'THE RULE', sub: 'Keep it ugly', icon: 'check'},
          ],
        },
        cues: {s0: 'Sketch fast', s1: 'let AI', s2: 'keep it ugly'},
      },
    ],
    question: ['Do you start', 'on paper', 'or on screen?'],
    draft: 'Paper. Always paper first.',
    follow: 'Follow for the next step.',
  },
  {
    id: '4.3',
    stage: 4,
    num: 3,
    title: 'Real content beats lorem ipsum',
    script: `Lorem ipsum hides problems. Real words reveal them. In my prototypes, every label, price and message is real, and AI writes the first draft. I give it context: grocery app, busy parents, Indian rupees, the fees we actually charge. Then I ask for real product names, real prices, a real delivery message. Suddenly you see problems lorem ipsum never shows. "Small cart fee" doesn't fit on one line. Three fee lines push the button below the fold. Then I check every word AI wrote, because users will read it as a promise. Do your prototypes still use lorem ipsum? Tell me in the comments. Follow for the next step.`,
    hot: ['hides', 'reveal', 'context:', 'fold.', 'promise.'],
    beats: [
      {scene: 'Statement', props: {lines: ['Lorem ipsum *hides*.', 'Real words *reveal*.'], size: 92}, cues: {l1: 'Real words'}},
      {
        at: 'In my prototypes',
        scene: 'PromptCard',
        props: {
          label: 'CONTEXT FOR AI',
          text: 'Grocery app · busy parents · Indian rupees · the fees we actually charge.',
          reply: ['Paneer 200 g · *₹180*', 'Small cart fee (orders under ₹199) · *₹25*', 'Arriving by *7:30 PM* tonight'],
          replyLabel: 'AI · REAL CONTENT',
        },
        cues: {reply: 'Then I ask for'},
      },
      {
        at: 'Suddenly you see',
        scene: 'Phone',
        props: {
          lorem: true,
          items: [
            {name: 'Tomatoes 1 kg', price: '₹60'},
            {name: 'Paneer 200 g', price: '₹180'},
            {name: 'Basmati rice', price: '₹95'},
          ],
          fees: [
            {name: 'Delivery fee', price: '₹40'},
            {name: 'Small cart fee (orders under ₹199)', price: '₹25'},
            {name: 'Platform fee', price: '₹9'},
          ],
          total: '₹409',
          overflow: true,
        },
        cues: {swap: 'Suddenly', overflow: 'Three fee lines'},
      },
      {at: 'Then I check every', scene: 'Statement', props: {lines: ['Check every word.', 'Users read it as', 'a *promise*.'], icon: 'check', tone: 'good', size: 88}, cues: {l1: 'users will read', l2: 'users will read'}},
    ],
    question: ['Do your prototypes', 'still use', 'lorem ipsum?'],
    draft: 'Guilty. Lorem everywhere.',
    follow: 'Follow for the next step.',
  },
  {
    id: '4.4',
    stage: 4,
    num: 4,
    title: 'A UI prompt is a design brief',
    script: `"Design a checkout screen." That prompt gives you the average checkout on the internet. Here's the prompt I actually use. Who: busy parents ordering groceries on a phone. Goal: see the final price before paying. Constraints: our design system, 360-pixel width, all fees visible on the first screen. Content: these five items and these two fees. Avoid: no pre-selected add-ons. Same AI, completely different result. A prompt is a design brief. If you wouldn't hand a vague brief to a designer, don't hand it to AI. What's in your best UI prompt? Share it in the comments. Follow for the next step.`,
    hot: ['average', 'Who:', 'Goal:', 'Constraints:', 'Content:', 'Avoid:', 'brief.'],
    beats: [
      {
        scene: 'Compare',
        props: {
          top: {label: 'VAGUE PROMPT', tone: 'bad', text: '"Design a checkout screen."'},
          bottom: {label: 'WHAT YOU GET', tone: 'bad', text: 'The *average checkout* on the internet.', badge: 'GENERIC'},
        },
        cues: {bottom: 'That prompt'},
      },
      {
        at: "Here's the prompt",
        scene: 'DocCard',
        props: {
          kicker: 'THE BRIEF · 5 PARTS',
          size: 34,
          lines: [
            {text: '*Who:* busy parents ordering groceries on a phone', appear: 'w'},
            {text: '*Goal:* see the final price before paying', appear: 'g'},
            {text: '*Constraints:* our design system · 360 px · all fees on the first screen', appear: 'c'},
            {text: '*Content:* these five items, these two fees', appear: 'ct'},
            {text: '*Avoid:* no pre-selected add-ons', appear: 'a'},
          ],
        },
        cues: {w: 'Who:', g: 'Goal:', c: 'Constraints:', ct: 'Content:', a: 'Avoid:'},
      },
      {at: 'Same AI', scene: 'Statement', props: {lines: ['Same AI.', '*Completely different*', '*result.*'], size: 92}, cues: {l1: 'completely', l2: 'completely'}},
      {at: 'A prompt is', scene: 'Statement', props: {kicker: 'THE RULE', lines: ['A prompt is a', '*design brief*.'], icon: 'list'}},
    ],
    question: ["What's in your", 'best UI prompt?'],
    draft: 'Who, goal, constraints. Always.',
    follow: 'Follow for the next step.',
  },
  {
    id: '4.5',
    stage: 4,
    num: 5,
    title: 'A prototype in a day',
    script: `A prototype is a question, not a product. Here's how I get one ready in a day. Morning: sketch on paper. AI turns the sketches into wireframes. Afternoon: I link the screens into a clickable flow, with AI writing the real content. By evening I have five screens, one task, ready for users. And here's the rule I give my team: don't fall in love with it. AI makes prototypes look good so fast that teams start defending them. If users struggle tomorrow, we throw it away, and that's a win. Have you ever defended a prototype you should have thrown away? Follow for the next stage: Test.`,
    hot: ['question,', 'love', 'defending', 'win.'],
    beats: [
      {scene: 'Statement', props: {lines: ['A prototype is a', '*question*,', 'not a product.']}, cues: {l1: 'question', l2: 'not a product'}},
      {
        at: "Here's how I get",
        scene: 'Timeline',
        props: {
          steps: [
            {label: 'MORNING', sub: 'Sketch → AI wireframes', icon: 'list'},
            {label: 'AFTERNOON', sub: 'Clickable flow + real content', icon: 'link'},
            {label: 'EVENING', sub: '5 screens · 1 task · ready', icon: 'check'},
          ],
        },
        cues: {s0: 'Morning:', s1: 'Afternoon:', s2: 'By evening'},
      },
      {at: "And here's the rule", scene: 'Statement', props: {kicker: 'THE RULE', lines: ["Don't fall in love", '*with it*.'], tone: 'bad', stamp: 'NO DEFENDING'}, cues: {stamp: 'start defending'}},
      {at: 'If users struggle', scene: 'Statement', props: {lines: ['Throw it away.', "*That's a win.*"], icon: 'bin', tone: 'good', size: 110}, cues: {l1: "that's a win"}},
    ],
    question: ['Have you ever defended', 'a prototype you', 'should have thrown away?'],
    draft: 'Yes. For three sprints.',
    follow: 'Follow for the next stage: Test.',
  },
];
