import { motion, type PanInfo } from 'motion/react';
import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';
import { formatEstimate } from '../../../shared/estimate.js';
import { priorityColor, priorityLabel } from '../../../shared/priority.js';
import type { Task } from '../../../shared/types.js';

const DISTANCE_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 500;

type ExitDirection = 'accept' | 'skip';

const cardVariants = {
  enter: { opacity: 0, scale: 0.96, x: 0 },
  center: { opacity: 1, scale: 1, x: 0 },
  exit: (direction: ExitDirection) => ({
    opacity: 0,
    x: direction === 'accept' ? 320 : -320,
    rotate: direction === 'accept' ? 8 : -8,
  }),
};

interface JobCardProps {
  task: Task;
  exitDirection: ExitDirection;
  reducedMotion: boolean;
  onAccept: () => void;
  onSkip: () => void;
}

export function JobCard({ task, exitDirection, reducedMotion, onAccept, onSkip }: JobCardProps) {
  function handleDragEnd(_event: unknown, info: PanInfo) {
    if (info.offset.x > DISTANCE_THRESHOLD || info.velocity.x > VELOCITY_THRESHOLD) {
      onAccept();
    } else if (info.offset.x < -DISTANCE_THRESHOLD || info.velocity.x < -VELOCITY_THRESHOLD) {
      onSkip();
    }
  }

  return (
    <motion.div
      key={task.id}
      custom={exitDirection}
      variants={cardVariants}
      initial={reducedMotion ? false : 'enter'}
      animate="center"
      exit="exit"
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 26 }}
      drag={reducedMotion ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      style={{ touchAction: 'pan-y' }}
    >
      <Card withBorder radius="lg" shadow="md" padding="xl">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Title order={2}>{task.title}</Title>
            <Badge color={priorityColor(task.priority)} size="lg">
              {priorityLabel(task.priority)}
            </Badge>
          </Group>
          <Text size="lg" c="dimmed">
            {formatEstimate(task.estimateMinutes)}
          </Text>
          {task.notes && task.notes.length <= 280 && <Text>{task.notes}</Text>}
        </Stack>
      </Card>
    </motion.div>
  );
}
