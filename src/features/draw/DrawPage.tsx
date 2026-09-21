import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Button, Center, Loader, Stack, Text } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { pickCandidate } from '../../../shared/draw.js';
import type { Priority, Task } from '../../../shared/types.js';
import { useAcceptTask, useActiveTask, useTasks } from '../../hooks/useTasks.js';
import { ActiveJobCard } from '../active/ActiveJobCard.js';
import { FilterBar } from './FilterBar.js';
import { JobCard } from './JobCard.js';
import { EmptyState } from './EmptyState.js';

type ExitDirection = 'accept' | 'skip';

export function DrawPage() {
  const [maxMinutes, setMaxMinutes] = useState<number | null>(30);
  const [minPriority, setMinPriority] = useState<Priority | null>(null);
  const [skipSet, setSkipSet] = useState<Set<string>>(new Set());
  const [dealtTaskId, setDealtTaskId] = useState<string | null>(null);
  const [exitDirection, setExitDirection] = useState<ExitDirection>('skip');
  const [announcement, setAnnouncement] = useState('');

  const reducedMotion = useReducedMotion();
  const activeQuery = useActiveTask();
  const candidatesQuery = useTasks({
    status: 'pending',
    ...(minPriority !== null && { minPriority }),
    ...(maxMinutes !== null && { maxMinutes }),
  });
  const anyPendingQuery = useTasks({ status: 'pending' });
  const acceptTask = useAcceptTask();

  const candidates = candidatesQuery.data;
  const cardWrapperRef = useRef<HTMLDivElement>(null);

  // Filters changed: the old skip-set and dealt card belong to a
  // different pool, so start clean rather than carrying stale skips
  // (or a dealt task that may no longer match) across a filter change.
  // Reset during render (React's sanctioned pattern for this) rather
  // than in an effect, so it doesn't cost an extra commit.
  const filterKey = `${minPriority}:${maxMinutes}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setSkipSet(new Set());
    setDealtTaskId(null);
  }

  useEffect(
    () => {
      // This effect exists to sync local "which card is dealt" state
      // to an external, asynchronous source (the candidates query) —
      // a legitimate effect use, not state derivable during render,
      // since the draw is intentionally random and must not re-run
      // every render.
      /* eslint-disable react-hooks/set-state-in-effect */
      if (!candidates) return;
      const stillDealt = dealtTaskId !== null && candidates.some((t) => t.id === dealtTaskId);
      if (stillDealt) return;

      const result = pickCandidate(candidates, skipSet, Math.random);
      if (result.exhausted) {
        setSkipSet(new Set());
        notifications.show({ message: "You've seen them all — going round again", color: 'blue' });
      }
      setDealtTaskId(result.task?.id ?? null);
      if (result.task) setAnnouncement(`New job: ${result.task.title}`);
      /* eslint-enable react-hooks/set-state-in-effect */
    },
    // Only the candidate pool itself should retrigger this — skipSet
    // and dealtTaskId are read above but handleSkip already deals its
    // own next card synchronously, so they must not be deps too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates],
  );

  useEffect(() => {
    cardWrapperRef.current?.focus();
  }, [dealtTaskId]);

  const dealtTask: Task | undefined = candidates?.find((t) => t.id === dealtTaskId);

  function handleSkip() {
    if (!dealtTask || !candidates) return;
    setExitDirection('skip');

    const nextSkipSet = new Set(skipSet).add(dealtTask.id);
    const result = pickCandidate(candidates, nextSkipSet, Math.random);
    if (result.exhausted) {
      setSkipSet(new Set());
      notifications.show({ message: "You've seen them all — going round again", color: 'blue' });
    } else {
      setSkipSet(nextSkipSet);
    }
    setDealtTaskId(result.task?.id ?? null);
    if (result.task) setAnnouncement(`New job: ${result.task.title}`);
  }

  function handleAccept() {
    if (!dealtTask) return;
    setExitDirection('accept');
    acceptTask.mutate(dealtTask.id, {
      onError: (err) =>
        notifications.show({
          message: err instanceof Error ? err.message : 'Could not accept this job',
          color: 'red',
        }),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleAccept();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleSkip();
    }
  }

  if (activeQuery.isLoading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (activeQuery.data) {
    // Locked: the active job is the only thing on screen. No filter
    // bar, no card underneath — nothing else is reachable from here.
    return <ActiveJobCard task={activeQuery.data} />;
  }

  const isReady = candidatesQuery.isSuccess && anyPendingQuery.isSuccess;

  return (
    <Stack gap="lg">
      <FilterBar
        maxMinutes={maxMinutes}
        onMaxMinutesChange={setMaxMinutes}
        minPriority={minPriority}
        onMinPriorityChange={setMinPriority}
        matchCount={candidates?.length}
      />

      <div
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {announcement}
      </div>

      {!isReady && (
        <Center py="xl">
          <Loader />
        </Center>
      )}

      {isReady && !dealtTask && (
        <EmptyState
          hasAnyPendingTasks={(anyPendingQuery.data?.length ?? 0) > 0}
          onWidenFilters={() => {
            setMaxMinutes(null);
            setMinPriority(null);
          }}
        />
      )}

      {isReady && dealtTask && (
        <Stack
          align="center"
          gap="lg"
          ref={cardWrapperRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          style={{ outline: 'none' }}
        >
          <AnimatePresence mode="wait" custom={exitDirection}>
            <JobCard
              key={dealtTask.id}
              task={dealtTask}
              exitDirection={exitDirection}
              reducedMotion={!!reducedMotion}
              onAccept={handleAccept}
              onSkip={handleSkip}
            />
          </AnimatePresence>
          <Text size="sm" c="dimmed">
            Drag the card, use the buttons, or press ← / →
          </Text>
          <Stack gap="xs" w="100%" maw={420}>
            <Button size="xl" color="green" onClick={handleAccept} loading={acceptTask.isPending}>
              Accept
            </Button>
            <Button size="lg" variant="default" onClick={handleSkip}>
              Skip
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
