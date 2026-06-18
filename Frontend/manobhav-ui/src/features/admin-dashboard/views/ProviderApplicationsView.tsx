import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Divider, HStack, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, XCircle } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import {
  approveProviderApplication,
  getProviderApplication,
  getProviderApplications,
  rejectProviderApplication,
  saveProviderApplicationSectionReview,
} from '../adminDashboardApi';
import { adminTheme } from '../adminTheme';
import { AdminDataTable, type AdminDataTableColumn } from '../components/AdminDataTable';
import { StatusBadge } from '../components/StatusBadge';
import {
  PROVIDER_APPLICATION_REQUIRED_REVIEW_SECTION_KEYS,
  PROVIDER_APPLICATION_SECTION_REVIEW_COMMENT_MAX_LENGTH,
} from '../types';
import type { ProviderApplication, ProviderApplicationSectionReview, ProviderApplicationSectionReviewStatus, StatusTone } from '../types';
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
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [finalAction, setFinalAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getProviderApplication(applicationId, controller.signal)
      .then((response) => {
        applyApplicationResponse(response, setApplication, setSectionComments);
        setStatus('ready');
      })
      .catch(() => {
        setApplication(null);
        setSectionComments({});
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
  const sectionReviews = application.sectionReviews ?? {};
  const allSectionsApproved = PROVIDER_APPLICATION_REQUIRED_REVIEW_SECTION_KEYS.every((sectionKey) =>
    application.sections?.[sectionKey] !== undefined && sectionReviews[sectionKey]?.status === 'Approved');
  const hasRejectedSectionWithComment = PROVIDER_APPLICATION_REQUIRED_REVIEW_SECTION_KEYS.some((sectionKey) => {
    const review = sectionReviews[sectionKey];
    return application.sections?.[sectionKey] !== undefined &&
      review?.status === 'Rejected' &&
      Boolean(review.comment?.trim());
  });
  const canMakeFinalDecision = application.status === 'Submitted';
  const canReviewSections = application.status === 'Submitted';

  async function saveSectionReview(sectionKey: string, reviewStatus: ProviderApplicationSectionReviewStatus) {
    const rawComment = sectionComments[sectionKey] ?? '';
    const comment = rawComment.trim();
    if (!canReviewSections) {
      setReviewError('Provider application is no longer open for section review.');
      return;
    }

    if (rawComment.length > PROVIDER_APPLICATION_SECTION_REVIEW_COMMENT_MAX_LENGTH) {
      setReviewError(`Section review comments must be ${PROVIDER_APPLICATION_SECTION_REVIEW_COMMENT_MAX_LENGTH} characters or fewer.`);
      return;
    }

    if (reviewStatus === 'Rejected' && !comment) {
      setReviewError(`${formatSectionTitle(sectionKey)} requires a comment before rejection.`);
      return;
    }

    setReviewError(null);
    setSavingSection(`${sectionKey}:${reviewStatus}`);
    try {
      const updatedApplication = await saveProviderApplicationSectionReview({
        applicationId,
        sectionKey,
        status: reviewStatus,
        comment: comment || undefined,
      });
      applyApplicationResponse(updatedApplication, setApplication, setSectionComments);
    } catch (error: unknown) {
      setReviewError(getErrorMessage(error));
    } finally {
      setSavingSection(null);
    }
  }

  async function submitFinalDecision(action: 'approve' | 'reject') {
    setReviewError(null);
    setFinalAction(action);
    try {
      if (action === 'approve') {
        await approveProviderApplication(applicationId);
      } else {
        await rejectProviderApplication(applicationId);
      }

      const refreshedApplication = await getProviderApplication(applicationId);
      applyApplicationResponse(refreshedApplication, setApplication, setSectionComments);
    } catch (error: unknown) {
      setReviewError(getErrorMessage(error));
    } finally {
      setFinalAction(null);
    }
  }

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

      <SectionCard title="Final decision">
        <Stack spacing={4}>
          {reviewError && (
            <Box
              role="alert"
              border="1px solid"
              borderColor="rgba(190, 75, 75, 0.28)"
              bg="#FCE8E8"
              color="#A74747"
              borderRadius="12px"
              px={4}
              py={3}
              fontSize="sm"
              fontWeight="800"
            >
              {reviewError}
            </Box>
          )}
          <HStack spacing={3} flexWrap="wrap">
            <Button
              size="sm"
              borderRadius="10px"
              leftIcon={<CheckCircle2 size={15} />}
              onClick={() => void submitFinalDecision('approve')}
              isDisabled={!canMakeFinalDecision || !allSectionsApproved || finalAction !== null}
              isLoading={finalAction === 'approve'}
            >
              Approve application
            </Button>
            <Button
              size="sm"
              borderRadius="10px"
              variant="outline"
              colorScheme="red"
              leftIcon={<XCircle size={15} />}
              onClick={() => void submitFinalDecision('reject')}
              isDisabled={!canMakeFinalDecision || !hasRejectedSectionWithComment || finalAction !== null}
              isLoading={finalAction === 'reject'}
            >
              Reject application
            </Button>
          </HStack>
        </Stack>
      </SectionCard>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        {sectionEntries.map(([sectionKey, sectionValue]) => (
          <SectionCard key={sectionKey} title={formatSectionTitle(sectionKey)}>
            <Stack spacing={4}>
              <SectionValue value={sectionValue} />
              <SectionReviewControls
                comment={sectionComments[sectionKey] ?? ''}
                isDisabled={!canReviewSections}
                onCommentChange={(comment) => setSectionComments((current) => ({
                  ...current,
                  [sectionKey]: comment.slice(0, PROVIDER_APPLICATION_SECTION_REVIEW_COMMENT_MAX_LENGTH),
                }))}
                onSave={(reviewStatus) => void saveSectionReview(sectionKey, reviewStatus)}
                review={sectionReviews[sectionKey]}
                savingStatus={getSavingStatus(savingSection, sectionKey)}
                sectionKey={sectionKey}
              />
            </Stack>
          </SectionCard>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function SectionReviewControls({
  comment,
  isDisabled,
  onCommentChange,
  onSave,
  review,
  savingStatus,
  sectionKey,
}: {
  comment: string;
  isDisabled: boolean;
  onCommentChange: (comment: string) => void;
  onSave: (status: ProviderApplicationSectionReviewStatus) => void;
  review?: ProviderApplicationSectionReview;
  savingStatus: ProviderApplicationSectionReviewStatus | null;
  sectionKey: string;
}) {
  const sectionTitle = formatSectionTitle(sectionKey);
  const canReject = Boolean(comment.trim());

  return (
    <Box borderTop="1px solid" borderColor={adminTheme.border} pt={4}>
      <HStack justify="space-between" align="center" mb={3} gap={3}>
        <Text color={adminTheme.muted} fontSize="sm" fontWeight="800">
          Review status
        </Text>
        <StatusBadge
          label={review ? `Section ${review.status}` : 'Not reviewed'}
          tone={getSectionReviewTone(review)}
        />
      </HStack>
      {review?.comment && (
        <Text color={adminTheme.text} fontSize="sm" fontWeight="700" mb={3}>
          Saved comment: {review.comment}
        </Text>
      )}
      <Textarea
        aria-label={`Comment for ${sectionTitle}`}
        bg="white"
        borderColor={adminTheme.border}
        borderRadius="12px"
        minH="92px"
        isDisabled={isDisabled}
        maxLength={PROVIDER_APPLICATION_SECTION_REVIEW_COMMENT_MAX_LENGTH}
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
      />
      <HStack spacing={3} mt={3} flexWrap="wrap">
        <Button
          size="sm"
          borderRadius="10px"
          leftIcon={<CheckCircle2 size={14} />}
          aria-label={`Approve ${sectionTitle} section`}
          onClick={() => onSave('Approved')}
          isDisabled={isDisabled || savingStatus !== null}
          isLoading={savingStatus === 'Approved'}
        >
          Approve
        </Button>
        <Button
          size="sm"
          borderRadius="10px"
          variant="outline"
          colorScheme="red"
          leftIcon={<XCircle size={14} />}
          aria-label={`Reject ${sectionTitle} section`}
          onClick={() => onSave('Rejected')}
          isDisabled={isDisabled || savingStatus !== null || !canReject}
          isLoading={savingStatus === 'Rejected'}
        >
          Reject
        </Button>
      </HStack>
    </Box>
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

function applyApplicationResponse(
  response: ProviderApplication,
  setApplication: (application: ProviderApplication) => void,
  setSectionComments: (comments: Record<string, string>) => void,
) {
  setApplication(response);
  setSectionComments(buildSectionCommentDrafts(response));
}

function buildSectionCommentDrafts(application: ProviderApplication) {
  return Object.keys(application.sections ?? {}).reduce<Record<string, string>>((drafts, sectionKey) => {
    drafts[sectionKey] = application.sectionReviews?.[sectionKey]?.comment ?? '';
    return drafts;
  }, {});
}

function getSavingStatus(savingSection: string | null, sectionKey: string): ProviderApplicationSectionReviewStatus | null {
  if (!savingSection?.startsWith(`${sectionKey}:`)) {
    return null;
  }

  return savingSection.endsWith(':Approved') ? 'Approved' : 'Rejected';
}

function getSectionReviewTone(review?: ProviderApplicationSectionReview): StatusTone {
  if (review?.status === 'Approved') {
    return 'sage';
  }

  if (review?.status === 'Rejected') {
    return 'red';
  }

  return 'grey';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Unable to update provider application review.';
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
