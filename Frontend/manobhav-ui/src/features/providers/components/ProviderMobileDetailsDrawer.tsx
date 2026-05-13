import type { ReactNode } from 'react';
import { Box, Button, Flex } from '@chakra-ui/react';

type ProviderMobileDetailsDrawerProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
};

export function ProviderMobileDetailsDrawer({ children, isOpen, onClose }: ProviderMobileDetailsDrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-40 bg-black/35 transition-opacity duration-300 lg:hidden ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[1.75rem] border border-white/60 bg-white px-5 pb-6 pt-4 shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <Flex align="center" justify="space-between" mb={4}>
          <Box className="mx-auto h-1.5 w-14 rounded-full bg-gray-300" />
          <Button size="sm" variant="ghost" className="!absolute right-3 top-3" onClick={onClose}>
            Close
          </Button>
        </Flex>
        {children}
      </div>
    </div>
  );
}
