import {Composition, Folder} from 'remotion';
import {H, HKUXScenarios, SCENES, TOTAL, W} from './Video';
import {EpisodeVideo} from './series/Episode';
import {PLANS, compId} from './series';
import {STAGES} from './series/shared';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="HKUX-Scenes">
        {SCENES.map((sc) => (
          <Composition key={sc.id} id={sc.id} component={sc.component} durationInFrames={sc.duration} fps={30} width={W} height={H} />
        ))}
      </Folder>
      <Composition id="HKUX-Scenarios" component={HKUXScenarios} durationInFrames={TOTAL} fps={30} width={W} height={H} />
      {([1, 2, 3, 4, 5] as const).map((stage) => (
        <Folder key={stage} name={`Stage-${stage}-${STAGES[stage].name}`}>
          {PLANS.filter((p) => p.ep.stage === stage).map(({ep, plan, audio}) => (
            <Composition
              key={ep.id}
              id={compId(ep.id)}
              component={EpisodeVideo}
              durationInFrames={plan.total}
              fps={30}
              width={W}
              height={H}
              defaultProps={{ep, plan, audio}}
            />
          ))}
        </Folder>
      ))}
    </>
  );
};
