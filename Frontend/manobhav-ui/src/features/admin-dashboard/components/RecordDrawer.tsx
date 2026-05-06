import type { ReactNode } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Text,
} from '@chakra-ui/react';
import { adminTheme } from '../adminTheme';

type RecordDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function RecordDrawer({ isOpen, onClose, title, subtitle, children }: RecordDrawerProps) {
  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size={{ base: 'full', md: 'lg' }}>
      <DrawerOverlay bg="rgba(45, 55, 72, 0.24)" backdropFilter="blur(3px)" />
      <DrawerContent bg="#FBFCFA">
        <DrawerCloseButton top={5} right={5} />
        <DrawerHeader borderBottomWidth="1px" borderColor={adminTheme.border} pr={14}>
          <Text color={adminTheme.text} fontSize="xl" fontWeight="800">
            {title}
          </Text>
          {subtitle && (
            <Text mt={1} color={adminTheme.muted} fontSize="sm" fontWeight="500">
              {subtitle}
            </Text>
          )}
        </DrawerHeader>
        <DrawerBody py={6}>{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
