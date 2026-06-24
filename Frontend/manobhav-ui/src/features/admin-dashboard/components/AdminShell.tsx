import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import SearchIcon from '@mui/icons-material/Search';
import { Bell, Home, Menu as MenuIcon, Settings } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { adminModules } from '../data';
import { getAdminNotifications, markAdminNotificationRead } from '../adminDashboardApi';
import { adminTheme, toneStyles } from '../adminTheme';
import type { AdminModule, AdminNotification } from '../types';

type AdminShellProps = {
  activeModule: AdminModule;
  moduleTitle: string;
  moduleHelper: string;
  search: string;
  onSearchChange: (value: string) => void;
  children: ReactNode;
};

export function AdminShell({
  activeModule,
  moduleTitle,
  moduleHelper,
  search,
  onSearchChange,
  children,
}: AdminShellProps) {
  const nav = useDisclosure();

  return (
    <Flex minH="100dvh" bg={adminTheme.shellBg} color={adminTheme.text} fontFamily={adminTheme.font}>
      <Box display={{ base: 'none', lg: 'block' }} w="280px" flex="0 0 280px">
        <AdminSidebar activeModule={activeModule} />
      </Box>

      <Drawer isOpen={nav.isOpen} placement="left" onClose={nav.onClose} size="xs">
        <DrawerOverlay bg="rgba(45, 55, 72, 0.24)" backdropFilter="blur(3px)" />
        <DrawerContent bg={adminTheme.panelBg}>
          <DrawerBody p={0}>
            <AdminSidebar activeModule={activeModule} onNavigate={nav.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex minW={0} flex="1" direction="column">
        <Flex
          as="header"
          h={{ base: 'auto', lg: '82px' }}
          minH="82px"
          align={{ base: 'stretch', md: 'center' }}
          justify="space-between"
          direction={{ base: 'column', md: 'row' }}
          gap={4}
          borderBottom="1px solid"
          borderColor={adminTheme.border}
          bg="rgba(255, 255, 255, 0.82)"
          px={{ base: 4, md: 6, xl: 8 }}
          py={{ base: 4, md: 0 }}
          backdropFilter="blur(18px)"
          position="sticky"
          top={0}
          zIndex={10}
        >
          <HStack spacing={4} minW={0}>
            <IconButton
              aria-label="Open admin navigation"
              icon={<MenuIcon size={20} />}
              display={{ base: 'inline-flex', lg: 'none' }}
              onClick={nav.onOpen}
              borderRadius="12px"
              variant="outline"
            />
            <Box minW={0}>
              <Text color={adminTheme.muted} fontSize="sm" fontWeight="700">
                Manobhav Admin
              </Text>
              <Text color={adminTheme.text} fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" lineHeight="1.1">
                {moduleTitle}
              </Text>
              <Text color={adminTheme.muted} fontSize="sm" mt={1}>
                {moduleHelper}
              </Text>
            </Box>
          </HStack>

          <HStack spacing={3} align="center">
            <InputGroup display={{ base: 'none', md: 'block' }} w={{ md: '260px', xl: '340px' }}>
              <InputRightElement pointerEvents="none">
                <SearchIcon style={{ fontSize: 17, color: adminTheme.grey.dark }} />
              </InputRightElement>
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search admin records"
                bg={adminTheme.panelBg}
                borderColor={adminTheme.border}
                borderRadius="14px"
                _focusVisible={{ borderColor: adminTheme.sage.DEFAULT, boxShadow: `0 0 0 1px ${adminTheme.sage.DEFAULT}` }}
              />
            </InputGroup>
            <AdminNotificationsMenu />
            <Menu>
              <MenuButton
                as={Button}
                aria-label="Open admin profile menu"
                bg={adminTheme.panelBg}
                border="1px solid"
                borderColor={adminTheme.border}
                borderRadius="999px"
                boxShadow="0 12px 30px rgba(45, 55, 72, 0.08)"
                h="42px"
                minW="42px"
                p={1}
                _hover={{ bg: adminTheme.grey.light }}
              >
                <Avatar name="Admin" size="sm" bg={adminTheme.sage.DEFAULT} color="white" />
              </MenuButton>
              <MenuList borderColor={adminTheme.border} borderRadius="16px" boxShadow="0 22px 50px rgba(45, 55, 72, 0.16)" p={2}>
                <MenuItem icon={<Settings size={16} />}>Admin settings</MenuItem>
                <MenuItem as={RouterLink} to="/" icon={<Home size={16} />}>
                  Back to website
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>

          <InputGroup display={{ base: 'block', md: 'none' }}>
            <InputRightElement pointerEvents="none">
              <SearchIcon style={{ fontSize: 17, color: adminTheme.grey.dark }} />
            </InputRightElement>
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search admin records"
              bg={adminTheme.panelBg}
              borderColor={adminTheme.border}
              borderRadius="14px"
            />
          </InputGroup>
        </Flex>

        <Box as="main" minH={0} flex="1" overflowY="auto" px={{ base: 4, md: 6, xl: 8 }} py={{ base: 5, md: 7 }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}

function AdminNotificationsMenu() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const hoverTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const unreadCount = notifications.filter((notification) => !notification.readAtUtc).length;

  useEffect(() => {
    const controller = new AbortController();
    const timers = hoverTimers.current;
    getAdminNotifications(controller.signal)
      .then((response) => {
        setNotifications(response.filter((notification) => !notification.readAtUtc));
        setStatus('ready');
      })
      .catch(() => {
        setNotifications([]);
        setStatus('error');
      });

    return () => {
      controller.abort();
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const markReadAfterDwell = (notification: AdminNotification) => {
    clearHoverTimer(notification.id);
    hoverTimers.current[notification.id] = setTimeout(() => {
      markAdminNotificationRead(notification.id)
        .then(() => {
          setNotifications((current) => current.filter((item) => item.id !== notification.id));
        })
        .catch(() => undefined);
    }, 1000);
  };

  const clearHoverTimer = (notificationId: string) => {
    const timer = hoverTimers.current[notificationId];
    if (timer) {
      clearTimeout(timer);
      delete hoverTimers.current[notificationId];
    }
  };

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={IconButton}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, no unread'}
        icon={(
          <Box position="relative" h="22px" w="22px">
            <Bell size={19} />
            {unreadCount > 0 && (
              <Flex
                position="absolute"
                top="-7px"
                right="-8px"
                minH="16px"
                minW="16px"
                align="center"
                justify="center"
                borderRadius="full"
                bg={toneStyles.rose.accent}
                color="white"
                border="2px solid white"
                fontSize="9px"
                fontWeight="900"
                lineHeight="1"
              >
                {unreadCount}
              </Flex>
            )}
          </Box>
        )}
        borderRadius="999px"
        bg="white"
        color={toneStyles.rose.color}
        border="1px solid"
        borderColor={adminTheme.border}
        boxShadow="0 12px 30px rgba(45, 55, 72, 0.08)"
        _hover={{ bg: toneStyles.rose.bg }}
      />
      <MenuList
        minW="330px"
        maxW="360px"
        borderColor={adminTheme.border}
        borderRadius="16px"
        boxShadow="0 24px 56px rgba(45, 55, 72, 0.18)"
        p={2}
        position="relative"
        _before={{
          content: '""',
          position: 'absolute',
          top: '-7px',
          right: '22px',
          h: '14px',
          w: '14px',
          bg: 'white',
          borderLeft: '1px solid',
          borderTop: '1px solid',
          borderColor: adminTheme.border,
          transform: 'rotate(45deg)',
        }}
      >
        <Text color={adminTheme.text} fontSize="sm" fontWeight="900" px={3} py={2}>
          Notifications
        </Text>
        {notifications.map((notification) => (
          <MenuItem
            key={notification.id}
            as={RouterLink}
            to={notification.linkPath || '/dashboard/admin'}
            alignItems="flex-start"
            borderRadius="12px"
            gap={3}
            px={3}
            py={3}
            onMouseEnter={() => markReadAfterDwell(notification)}
            onMouseLeave={() => clearHoverTimer(notification.id)}
          >
            <Box mt={1} h={2.5} w={2.5} flex="0 0 auto" borderRadius="full" bg={toneStyles.rose.accent} />
            <Box minW={0}>
              <Text color={adminTheme.text} fontSize="sm" fontWeight="900" lineHeight="1.25">
                {notification.title}
              </Text>
              <Text color={adminTheme.muted} fontSize="sm" mt={1} lineHeight="1.45">
                {notification.body}
              </Text>
            </Box>
          </MenuItem>
        ))}
        {notifications.length === 0 && (
          <MenuItem borderRadius="12px">
            <Text color={adminTheme.muted} fontSize="sm" fontWeight="700">
              {status === 'error' ? 'Unable to load notifications.' : 'No unread notifications.'}
            </Text>
          </MenuItem>
        )}
      </MenuList>
    </Menu>
  );
}

type AdminSidebarProps = {
  activeModule: AdminModule;
  onNavigate?: () => void;
};

function AdminSidebar({ activeModule, onNavigate }: AdminSidebarProps) {
  return (
    <Flex
      h="100dvh"
      direction="column"
      borderRight="1px solid"
      borderColor={adminTheme.border}
      bg={adminTheme.panelBg}
      px={4}
      py={5}
    >
      <HStack spacing={3} px={2} pb={5}>
        <Flex h="42px" w="42px" align="center" justify="center" borderRadius="14px" bg={adminTheme.sage.light} overflow="hidden">
          <Box
            as="img"
            src="/Manobhav_Logo.png"
            alt="Manobhav admin"
            h="100%"
            w="100%"
            objectFit="cover"
          />
        </Flex>
        <Box>
          <Text color={adminTheme.text} fontSize="lg" fontWeight="900">
            Manobhav
          </Text>
          <Text color={adminTheme.muted} fontSize="xs" fontWeight="700">
            Admin command center
          </Text>
        </Box>
      </HStack>

      <Divider borderColor={adminTheme.border} />

      <Stack spacing={1.5} mt={5} flex="1" overflowY="auto" pr={1}>
        {adminModules.map((module) => (
          <AdminSidebarButton
            key={module.id}
            isActive={activeModule === module.id}
            module={module}
            onNavigate={onNavigate}
          />
        ))}
      </Stack>

      <Box mt={5} border="1px solid" borderColor={toneStyles.blue.border} bg={toneStyles.blue.bg} borderRadius="16px" p={4}>
        <Text color={toneStyles.blue.color} fontSize="sm" fontWeight="900">
          Super admin access
        </Text>
        <Text color={adminTheme.muted} fontSize="xs" mt={2} lineHeight="1.6">
          Clinical and compensation records are available in dedicated protected surfaces.
        </Text>
      </Box>
    </Flex>
  );
}

function AdminSidebarButton({
  isActive,
  module,
  onNavigate,
}: {
  isActive: boolean;
  module: (typeof adminModules)[number];
  onNavigate?: () => void;
}) {
  const IconComponent = module.icon;

  return (
    <Button
      as={RouterLink}
      to={module.path}
      onClick={onNavigate}
      variant="ghost"
      justifyContent="flex-start"
      h="58px"
      borderRadius="14px"
      px={3}
      bg={getSidebarButtonBg(isActive)}
      color={getSidebarButtonColor(isActive)}
      _hover={{ bg: getSidebarButtonHoverBg(isActive) }}
      leftIcon={<SidebarButtonIcon IconComponent={IconComponent} isActive={isActive} />}
    >
      <Box textAlign="left" minW={0}>
        <Text fontSize="sm" fontWeight="800" lineHeight="1.1">
          {module.label}
        </Text>
        <Text fontSize="xs" fontWeight="500" opacity={0.75} noOfLines={1}>
          {module.helper}
        </Text>
      </Box>
    </Button>
  );
}

function SidebarButtonIcon({ IconComponent, isActive }: { IconComponent: (typeof adminModules)[number]['icon']; isActive: boolean }) {
  return (
    <Flex
      h="34px"
      w="34px"
      align="center"
      justify="center"
      borderRadius="10px"
      bg={isActive ? 'white' : adminTheme.grey.light}
      color={getSidebarButtonColor(isActive)}
    >
      <Icon as={IconComponent} boxSize={4} />
    </Flex>
  );
}

function getSidebarButtonBg(isActive: boolean): string {
  return isActive ? adminTheme.sage.light : 'transparent';
}

function getSidebarButtonColor(isActive: boolean): string {
  return isActive ? adminTheme.sage.dark : adminTheme.muted;
}

function getSidebarButtonHoverBg(isActive: boolean): string {
  return isActive ? adminTheme.sage.light : adminTheme.grey.light;
}
