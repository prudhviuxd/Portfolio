import {Composition, Folder} from 'remotion';
import {H, HKUXScenarios, SCENES, TOTAL, W} from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="HKUX-Scenes">
        {SCENES.map((sc) => (
          <Composition key={sc.id} id={sc.id} component={sc.component} durationInFrames={sc.duration} fps={30} width={W} height={H} />
        ))}
      </Folder>
      <Composition id="HKUX-Scenarios" component={HKUXScenarios} durationInFrames={TOTAL} fps={30} width={W} height={H} />
    </>
  );
};
