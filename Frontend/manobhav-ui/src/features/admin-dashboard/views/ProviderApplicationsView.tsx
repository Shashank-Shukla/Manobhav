import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Divider, Flex, HStack, ScaleFade, SimpleGrid, Stack, Text, Textarea } from '@chakra-ui/react';
import { ArrowLeft, ArrowUpRight, CheckCircle2, PencilLine, XCircle } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  approveProviderApplication,
  getProviderApplication,
  getProviderApplications,
  rejectProviderApplication,
  requestProviderApplicationRevisions,
  saveProviderApplicationSectionReview,
} from '../adminDashboardApi';
import { adminTheme, toneStyles } from '../adminTheme';
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
  const navigate = useNavigate();
  const [application, setApplication] = useState<ProviderApplication | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [finalAction, setFinalAction] = useState<FinalDecision | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [decisionComplete, setDecisionComplete] = useState<FinalDecision | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
    }
  }, []);

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
  const hasRejectedSection = PROVIDER_APPLICATION_REQUIRED_REVIEW_SECTION_KEYS.some(
    (sectionKey) => sectionReviews[sectionKey]?.status === 'Rejected',
  );
  // Approved providers can still be rejected (revoked), so the decision bar stays available for them.
  const canMakeFinalDecision = application.status === 'Submitted' || application.status === 'Approved';
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

  async function submitFinalDecision(action: FinalDecision) {
    setReviewError(null);
    setFinalAction(action);
    try {
      if (action === 'approve') {
        await approveProviderApplication(applicationId);
      } else if (action === 'reject') {
        await rejectProviderApplication(applicationId);
      } else {
        await requestProviderApplicationRevisions(applicationId);
      }

      // Show the confirmation animation, then return to the queue. The application has left the
      // "Submitted" state, so there is nothing more to do on this detail screen.
      setDecisionComplete(action);
      redirectTimer.current = setTimeout(() => navigate('/dashboard/admin/provider-applications'), 1600);
    } catch (error: unknown) {
      setReviewError(getErrorMessage(error));
      setFinalAction(null);
    }
  }

  return (
    <Box position="relative">
      <DecisionCompleteOverlay decision={decisionComplete} />
      <Box
        transition="opacity 0.4s ease, filter 0.4s ease"
        opacity={decisionComplete ? 0.2 : 1}
        filter={decisionComplete ? 'blur(2px)' : 'none'}
        pointerEvents={decisionComplete ? 'none' : 'auto'}
        aria-hidden={decisionComplete ? true : undefined}
      >
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

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5} pb="120px">
        {sectionEntries.map(([sectionKey, sectionValue]) => (
          <SectionCard key={sectionKey} title={formatSectionTitle(sectionKey)}>
            <Stack spacing={4}>
              <SectionValue value={sectionValue} />
              <SectionReviewControls
                comment={sectionComments[sectionKey] ?? ''}
                isDisabled={!canReviewSections || sectionReviews[sectionKey]?.status === 'Approved'}
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
      </Box>
      {canMakeFinalDecision && !decisionComplete && (
        <FinalDecisionBar
          allSectionsApproved={allSectionsApproved}
          finalAction={finalAction}
          hasRejectedSection={hasRejectedSection}
          onDecision={(action) => void submitFinalDecision(action)}
          reviewError={reviewError}
          status={application.status}
        />
      )}
    </Box>
  );
}

type FinalDecision = 'approve' | 'reject' | 'revise';

function FinalDecisionBar({
  allSectionsApproved,
  finalAction,
  hasRejectedSection,
  onDecision,
  reviewError,
  status,
}: {
  allSectionsApproved: boolean;
  finalAction: FinalDecision | null;
  hasRejectedSection: boolean;
  onDecision: (action: FinalDecision) => void;
  reviewError: string | null;
  status: string;
}) {
  const busy = finalAction !== null;
  const canApproveOrRevise = status === 'Submitted';

  return (
    <Box position="fixed" bottom={{ base: 3, md: 5 }} left={0} right={0} zIndex={25} px={4} pointerEvents="none">
      <Stack
        spacing={3}
        mx="auto"
        maxW="640px"
        pointerEvents="auto"
        bg="rgba(255, 255, 255, 0.96)"
        border="1px solid"
        borderColor={adminTheme.border}
        borderRadius="18px"
        boxShadow="0 24px 60px rgba(45, 55, 72, 0.22)"
        backdropFilter="blur(14px)"
        px={{ base: 4, md: 5 }}
        py={4}
      >
        {reviewError && (
          <Box
            role="alert"
            border="1px solid"
            borderColor="rgba(190, 75, 75, 0.28)"
            bg="#FCE8E8"
            color="#A74747"
            borderRadius="12px"
            px={4}
            py={2}
            fontSize="sm"
            fontWeight="800"
          >
            {reviewError}
          </Box>
        )}
        <HStack spacing={3} justify="center" flexWrap="wrap">
          {canApproveOrRevise && (
            <>
              <Button
                size="sm"
                borderRadius="10px"
                leftIcon={<CheckCircle2 size={15} />}
                onClick={() => onDecision('approve')}
                isDisabled={!allSectionsApproved || busy}
                isLoading={finalAction === 'approve'}
              >
                Approve application
              </Button>
              <Button
                size="sm"
                borderRadius="10px"
                variant="outline"
                leftIcon={<PencilLine size={15} />}
                onClick={() => onDecision('revise')}
                isDisabled={!hasRejectedSection || busy}
                isLoading={finalAction === 'revise'}
                color={toneStyles.amber.color}
                borderColor={toneStyles.amber.border}
                _hover={{ bg: toneStyles.amber.bg }}
              >
                Request revisions
              </Button>
            </>
          )}
          <Button
            size="sm"
            borderRadius="10px"
            variant="outline"
            colorScheme="red"
            leftIcon={<XCircle size={15} />}
            onClick={() => onDecision('reject')}
            isDisabled={busy}
            isLoading={finalAction === 'reject'}
          >
            {canApproveOrRevise ? 'Reject application' : 'Reject provider'}
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}

function DecisionCompleteOverlay({ decision }: { decision: FinalDecision | null }) {
  const visual = getDecisionVisual(decision);

  return (
    <ScaleFade in={decision !== null} initialScale={0.85} unmountOnExit>
      <Flex
        position="absolute"
        inset={0}
        zIndex={20}
        align="center"
        justify="center"
        direction="column"
        gap={4}
        borderRadius="16px"
        bg={visual.bg}
        backdropFilter="blur(2px)"
        textAlign="center"
        px={6}
        role="status"
      >
        <visual.Icon size={64} color={visual.accent} />
        <Box>
          <Text color={adminTheme.text} fontSize="xl" fontWeight="900">
            {visual.title}
          </Text>
          <Text color={adminTheme.muted} fontSize="sm" mt={1}>
            Returning to the applications queue…
          </Text>
        </Box>
      </Flex>
    </ScaleFade>
  );
}

function getDecisionVisual(decision: FinalDecision | null) {
  if (decision === 'approve') {
    return { Icon: CheckCircle2, accent: '#4F8A5B', bg: 'rgba(238, 244, 234, 0.96)', title: 'Application approved' };
  }

  if (decision === 'revise') {
    return { Icon: PencilLine, accent: '#8A6D24', bg: 'rgba(248, 240, 216, 0.96)', title: 'Revisions requested' };
  }

  return { Icon: XCircle, accent: '#A74747', bg: 'rgba(252, 232, 232, 0.96)', title: 'Application rejected' };
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
