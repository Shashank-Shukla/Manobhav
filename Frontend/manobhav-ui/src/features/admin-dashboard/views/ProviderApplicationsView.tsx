import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { getProviderApplication, getProviderApplications } from '../adminDashboardApi';
import { adminTheme } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { StatusBadge } from '../components/StatusBadge';
import type { ProviderApplication } from '../types';
import { DetailRow, SectionCard } from './shared';
import { includesSearch } from './viewUtils';

type ProviderApplicationsViewProps = {
  applicationId?: string;
  search: string;
};

export function ProviderApplicationsView({ applicationId, search }: ProviderApplicationsViewProps) {
  return applicationId
    ? <ProviderApplicationDetail applicationId={applicationId} />
    : <ProviderApplicationList search={search} />;
}

function ProviderApplicationList({ search }: { search: string }) {
  const [applications, setApplications] = useState<ProviderApplication[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const filteredApplications = useMemo(
    () => applications
      .filter((application) => application.status === 'Submitted')
      .filter((application) => includesSearch([
        getProviderName(application),
        getProviderEmail(application),
        application.status,
        application.currentStep ?? '',
      ], search)),
    [applications, search],
  );

  useEffect(() => {
    const controller = new AbortController();
    getProviderApplications(controller.signal)
      .then((response) => {
        setApplications(response);
        setStatus('ready');
      })
      .catch(() => {
        setApplications([]);
        setStatus('error');
      });

    return () => controller.abort();
  }, []);

  const columns: AdminDataTableColumn<ProviderApplication>[] = [
    {
      header: 'Applicant',
      render: (application) => (
        <Box>
          <Text color={adminTheme.text} fontWeight="900">
            {getProviderName(application)}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm">
            {getProviderEmail(application) || 'Email not provided'}
          </Text>
        </Box>
      ),
    },
    {
      header: 'Status',
      render: (application) => <StatusBadge label={application.status} tone="blue" />,
    },
    {
      header: 'Submitted',
      render: (application) => (
        <Text color={adminTheme.muted} fontSize="sm">
          {formatDate(application.submittedAtUtc ?? application.updatedAtUtc ?? application.createdAtUtc)}
        </Text>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (application) => (
        <Button
          as={RouterLink}
          to={`/dashboard/admin/provider-applications/${application.id}`}
          size="sm"
          borderRadius="10px"
          rightIcon={<ArrowUpRight size={14} />}
          aria-label={`Open application for ${getProviderName(application)}`}
        >
          Open
        </Button>
      ),
    },
  ];

  return (
    <SectionCard title="Pending provider applications" helper="Submitted onboarding applications awaiting admin review">
      <AdminDataStatus status={status} />
      <AdminDataTable
        columns={columns}
        data={filteredApplications}
        getKey={(application) => application.id}
        emptyLabel="No pending provider applications."
      />
    </SectionCard>
  );
}

function ProviderApplicationDetail({ applicationId }: { applicationId: string }) {
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    getProviderApplication(applicationId, controller.signal)
      .then((response) => {
        setApplication(response);
        setStatus('ready');
      })
      .catch(() => {
        setApplication(null);
        setStatus('error');
      });

    return () => controller.abort();
  }, [applicationId]);

  if (status !== 'ready' || !application) {
    return (
      <SectionCard title="Provider application review" helper="Loading submitted details">
        <AdminDataStatus status={status} />
      </SectionCard>
    );
  }

  const sectionEntries = Object.entries(application.sections ?? {});

  return (
    <Stack spacing={5}>
      <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
        <Box>
          <Button
            as={RouterLink}
            to="/dashboard/admin/provider-applications"
            size="sm"
            variant="ghost"
            leftIcon={<ArrowLeft size={15} />}
            borderRadius="10px"
            mb={3}
          >
            Back to applications
          </Button>
          <Text as="h2" color={adminTheme.text} fontSize={{ base: '2xl', md: '3xl' }} fontWeight="900" lineHeight="1.1">
            {getProviderName(application)}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm" mt={1}>
            Provider application review
          </Text>
        </Box>
        <StatusBadge label={application.status} tone="blue" />
      </HStack>

      <SectionCard title="Application summary" helper="Submitted identity and review metadata">
        <DetailRow label="Email" value={getProviderEmail(application) || 'Not provided'} />
        <DetailRow label="Current step" value={application.currentStep ?? 'Not provided'} />
        <DetailRow label="Submitted" value={formatDate(application.submittedAtUtc ?? application.updatedAtUtc ?? application.createdAtUtc)} />
      </SectionCard>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        {sectionEntries.map(([sectionKey, sectionValue]) => (
          <SectionCard key={sectionKey} title={formatSectionTitle(sectionKey)}>
            <SectionValue value={sectionValue} />
          </SectionCard>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function SectionValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <Stack spacing={3}>
        {value.map((item, index) => (
          <Box key={index} border="1px solid" borderColor={adminTheme.border} bg="white" borderRadius="12px" p={3}>
            <SectionValue value={item} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <Stack spacing={0} divider={<Divider borderColor={adminTheme.border} />}>
        {Object.entries(value as Record<string, unknown>).map(([key, child]) => (
          <DetailRow key={key} label={formatSectionTitle(key)} value={<SectionValue value={child} />} />
        ))}
      </Stack>
    );
  }

  return (
    <Text color={adminTheme.text} fontSize="sm" fontWeight="700">
      {value === null || value === undefined || value === '' ? 'Not provided' : String(value)}
    </Text>
  );
}

function AdminDataStatus({ status }: { status: 'loading' | 'ready' | 'error' }) {
  if (status === 'ready') {
    return null;
  }

  return (
    <Box
      mb={4}
      border="1px solid"
      borderColor={status === 'loading' ? 'rgba(176, 206, 214, 0.42)' : 'rgba(190, 75, 75, 0.28)'}
      bg={status === 'loading' ? '#EEF7F9' : '#FCE8E8'}
      color={status === 'loading' ? '#416E78' : '#A74747'}
      borderRadius="12px"
      px={4}
      py={3}
      fontSize="sm"
      fontWeight="800"
    >
      {status === 'loading' ? 'Loading provider applications...' : 'Unable to load provider applications.'}
    </Box>
  );
}

function getProviderName(application: ProviderApplication) {
  const basicIdentity = getObjectSection(application, 'basicIdentity');
  return readString(basicIdentity, 'displayName') ??
    readString(basicIdentity, 'legalName') ??
    `Provider application ${application.id.slice(0, 8)}`;
}

function getProviderEmail(application: ProviderApplication) {
  return readString(getObjectSection(application, 'basicIdentity'), 'email') ?? '';
}

function getObjectSection(application: ProviderApplication, sectionKey: string) {
  const section = application.sections?.[sectionKey];
  return section && typeof section === 'object' && !Array.isArray(section)
    ? section as Record<string, unknown>
    : {};
}

function readString(value: Record<string, unknown>, key: string) {
  const item = value[key];
  return typeof item === 'string' && item.trim() ? item : undefined;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatSectionTitle(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}
