import {
  ActionIcon,
  AppShell,
  Group,
  NavLink,
  Title,
  useMantineColorScheme,
} from '@mantine/core';
import { Route, Routes, NavLink as RouterNavLink } from 'react-router';
import { DrawPage } from './features/draw/DrawPage.js';
import { ListPage } from './features/list/ListPage.js';

function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? '☀️' : '🌙'}
    </ActionIcon>
  );
}

export function App() {
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Title order={4}>One Job</Title>
            <NavLink
              component={RouterNavLink}
              to="/"
              label="Job"
              variant="subtle"
              style={{ borderRadius: 'var(--mantine-radius-md)', width: 'auto' }}
              end
            />
            <NavLink
              component={RouterNavLink}
              to="/tasks"
              label="Tasks"
              variant="subtle"
              style={{ borderRadius: 'var(--mantine-radius-md)', width: 'auto' }}
            />
          </Group>
          <Group gap="sm">
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<DrawPage />} />
          <Route path="/tasks" element={<ListPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
