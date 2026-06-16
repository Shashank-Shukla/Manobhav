import type { ReactNode } from 'react';
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
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { Bell, ChevronDown, Home, Menu as MenuIcon, Search, Settings } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { adminModules } from '../data';
import { adminTheme, toneStyles } from '../adminTheme';
import type { AdminModule } from '../types';

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
        <DrawerContent bg="white">
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
              <InputLeftElement pointerEvents="none">
                <Search size={17} color={adminTheme.grey.dark} />
              </InputLeftElement>
              <Input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search admin records"
                bg="white"
                borderColor={adminTheme.border}
                borderRadius="14px"
                _focusVisible={{ borderColor: adminTheme.sage.DEFAULT, boxShadow: `0 0 0 1px ${adminTheme.sage.DEFAULT}` }}
              />
            </InputGroup>
            <IconButton
              aria-label="Notifications"
              icon={<Bell size={19} />}
              borderRadius="14px"
              bg={toneStyles.rose.bg}
              color={toneStyles.rose.color}
              _hover={{ bg: '#F2D8DC' }}
            />
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDown size={15} />}
                variant="ghost"
                borderRadius="14px"
                px={2}
              >
                <HStack spacing={3}>
                  <Avatar name="Admin" size="sm" bg={adminTheme.sage.DEFAULT} color="white" />
                  <Box display={{ base: 'none', xl: 'block' }} textAlign="left">
                    <Text fontSize="sm" fontWeight="800">
                      Super Admin
                    </Text>
                    <Text fontSize="xs" color={adminTheme.muted}>
                      Operations
                    </Text>
                  </Box>
                </HStack>
              </MenuButton>
              <MenuList borderColor={adminTheme.border}>
                <MenuItem icon={<Settings size={16} />}>Admin settings</MenuItem>
                <MenuItem as={RouterLink} to="/" icon={<Home size={16} />}>
                  Back to website
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>

          <InputGroup display={{ base: 'block', md: 'none' }}>
            <InputLeftElement pointerEvents="none">
              <Search size={17} color={adminTheme.grey.dark} />
            </InputLeftElement>
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search admin records"
              bg="white"
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
      bg="white"
      px={4}
      py={5}
    >
      <HStack spacing={3} px={2} pb={5}>
        <Flex h="42px" w="42px" align="center" justify="center" borderRadius="14px" bg={adminTheme.sage.light}>
          <Text color={adminTheme.sage.dark} fontWeight="900">
            M
          </Text>
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
