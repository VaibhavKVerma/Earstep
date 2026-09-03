import { useState } from 'react';
import { useProgress } from './ui/context/ProgressContext';
import type { Screen } from './ui/nav';
import { DailyTraining, PracticeSetup, SessionComplete } from './ui/screens/Practice';
import {
  GuitarFind,
  HearSingFind,
  IntervalTraining,
  MelodyTraining,
  OctaveTraining,
  OneNoteMany,
  SongMode,
} from './ui/screens/Explore';
import { Home } from './ui/screens/Home';
import { LessonList, LessonView } from './ui/screens/Lessons';
import { Settings } from './ui/screens/Settings';
import { Stats } from './ui/screens/Stats';
import { Training } from './ui/screens/Training';
import { Onboarding, Welcome } from './ui/screens/Welcome';
import { SiteFooter } from './ui/components/widgets';

export default function App() {
  const { progress } = useProgress();
  const [screen, setScreen] = useState<Screen>(() =>
    progress.onboarded ? { id: 'home' } : { id: 'welcome' },
  );

  let body = <Home go={setScreen} />;
  if (screen.id === 'welcome') body = <Welcome go={setScreen} />;
  else if (screen.id === 'onboarding') body = <Onboarding go={setScreen} />;
  else if (screen.id === 'home') body = <Home go={setScreen} />;
  else if (screen.id === 'practice') body = <PracticeSetup go={setScreen} />;
  else if (screen.id === 'train') {
    body = <Training go={setScreen} config={screen.config} heading={screen.heading} />;
  } else if (screen.id === 'complete') {
    body = <SessionComplete go={setScreen} summary={screen.summary} config={screen.config} />;
  } else if (screen.id === 'lessons') body = <LessonList go={setScreen} />;
  else if (screen.id === 'lesson') body = <LessonView go={setScreen} lessonId={screen.lessonId} />;
  else if (screen.id === 'stats') body = <Stats go={setScreen} />;
  else if (screen.id === 'settings') body = <Settings go={setScreen} />;
  else if (screen.id === 'daily') body = <DailyTraining go={setScreen} />;
  else if (screen.id === 'one-note') body = <OneNoteMany go={setScreen} />;
  else if (screen.id === 'octave') body = <OctaveTraining go={setScreen} />;
  else if (screen.id === 'guitar-find') body = <GuitarFind go={setScreen} />;
  else if (screen.id === 'intervals') body = <IntervalTraining go={setScreen} />;
  else if (screen.id === 'melody') body = <MelodyTraining go={setScreen} />;
  else if (screen.id === 'song') body = <SongMode go={setScreen} />;
  else if (screen.id === 'hear-sing-find') body = <HearSingFind go={setScreen} />;

  return (
    <div className="app-root">
      <div className="app-main">{body}</div>
      <SiteFooter />
    </div>
  );
}
