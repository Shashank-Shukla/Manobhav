using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using WebApi.Controllers;

namespace UnitTests;

public sealed class IntakeWorkflowServiceTests
{
    [Fact]
    public async Task CreateSubmission_UsesVisitorCookieForPatientIntake()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var cookieVisitorId = Guid.NewGuid();
        var bodyVisitorId = Guid.NewGuid();
        var controller = CreateController(service, cookieVisitorId);

        var result = await controller.CreateSubmission(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, bodyVisitorId),
            CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result);
        var response = Assert.IsType<IntakeSubmissionDto>(created.Value);
        Assert.Equal(cookieVisitorId, response.VisitorSessionId);
    }

    [Fact]
    public async Task CreateSubmission_IgnoresBrowserVisitorIdForPatientIntakeWithoutCookie()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var controller = CreateController(service);

        var result = await controller.CreateSubmission(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result);
        var response = Assert.IsType<IntakeSubmissionDto>(created.Value);
        Assert.Null(response.VisitorSessionId);
    }

    [Fact]
    public async Task SaveAnswerAsync_StoresAnswerInIntakeRepository()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);

        await service.SaveAnswerAsync(
            submission.Id,
            "therapy_goals",
            new SaveIntakeAnswerRequest("I want better sleep.", "therapy_goals", 2400, DateTimeOffset.UtcNow),
            new IntakeOwnerContext(null, submission.VisitorSessionId),
            CancellationToken.None);

        var answer = Assert.Single(repository.Answers);
        Assert.Equal(submission.Id, answer.SubmissionId);
        Assert.Equal("therapy_goals", answer.QuestionKey);
        Assert.Contains("better sleep", answer.AnswerJsonb);
    }

    [Fact]
    public async Task SaveAnswer_RejectsSubmissionOwnedByDifferentVisitor()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);
        var controller = CreateController(service, Guid.NewGuid());

        var result = await controller.SaveAnswer(
            submission.Id,
            "therapy_goals",
            new SaveIntakeAnswerRequest("I want better sleep.", "therapy_goals", 2400, DateTimeOffset.UtcNow),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.Empty(repository.Answers);
    }

    [Fact]
    public async Task SaveAnswerAsync_StoresQuestionKeyCurrentStep()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);

        var saved = await service.SaveAnswerAsync(
            submission.Id,
            "therapy_goals",
            new SaveIntakeAnswerRequest("I want better sleep.", "therapy_goals", 2400, DateTimeOffset.UtcNow),
            new IntakeOwnerContext(null, submission.VisitorSessionId),
            CancellationToken.None);

        Assert.Equal("therapy_goals", saved.CurrentStep);
    }

    [Fact]
    public async Task SaveAnswerAsync_UpsertsRepeatedStepAnswers()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);

        await service.SaveAnswerAsync(
            submission.Id,
            "therapy_goals",
            new SaveIntakeAnswerRequest("First answer", "step-1", 100, DateTimeOffset.UtcNow, true, "step-1"),
            new IntakeOwnerContext(null, submission.VisitorSessionId),
            CancellationToken.None);
        await service.SaveAnswerAsync(
            submission.Id,
            "therapy_goals",
            new SaveIntakeAnswerRequest("Updated answer", "step-1", 200, DateTimeOffset.UtcNow, true, "step-1"),
            new IntakeOwnerContext(null, submission.VisitorSessionId),
            CancellationToken.None);

        var answer = Assert.Single(repository.Answers);
        Assert.Equal(submission.Id, answer.SubmissionId);
        Assert.Equal("therapy_goals", answer.QuestionKey);
        Assert.Contains("Updated answer", answer.AnswerJsonb);
    }

    [Fact]
    public async Task SaveAnswerAsync_RejectsMissingRequiredAnswerWhenAdvancing()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);

        var exception = await Assert.ThrowsAsync<IntakeValidationException>(() =>
            service.SaveAnswerAsync(
                submission.Id,
                "therapy_goals",
                new SaveIntakeAnswerRequest("   ", "therapy_goals", 100, DateTimeOffset.UtcNow, true),
                new IntakeOwnerContext(null, submission.VisitorSessionId),
                CancellationToken.None));

        Assert.Contains("required", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SaveAnswerAsync_RejectsUnknownQuestion()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);

        await Assert.ThrowsAsync<IntakeValidationException>(() =>
            service.SaveAnswerAsync(
                submission.Id,
                "missing_question",
                new SaveIntakeAnswerRequest("text", "missing_question", 100, DateTimeOffset.UtcNow),
                new IntakeOwnerContext(null, submission.VisitorSessionId),
                CancellationToken.None));
    }

    [Fact]
    public async Task SubmitPartialAsync_RequiresPolicyAcknowledgement()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);

        await Assert.ThrowsAsync<IntakeValidationException>(() =>
            service.SubmitPartialAsync(
                submission.Id,
                new SubmitPartialIntakeRequest(false),
                new IntakeOwnerContext(null, submission.VisitorSessionId),
                CancellationToken.None));
    }

    [Fact]
    public async Task SubmitPartial_RejectsSubmissionOwnedByDifferentVisitor()
    {
        var repository = new InMemoryIntakeRepository();
        var service = new IntakeWorkflowService(repository);
        var form = await repository.CreateFormAsync(CancellationToken.None);
        var submission = await service.CreateSubmissionAsync(
            new CreateIntakeSubmissionRequest("PatientIntake", form.Id, Guid.NewGuid()),
            new IntakeOwnerContext(null, null),
            CancellationToken.None);
        var controller = CreateController(service, Guid.NewGuid());

        var result = await controller.SubmitPartial(
            submission.Id,
            new SubmitPartialIntakeRequest(true),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
        Assert.NotEqual("PartiallySubmitted", repository.GetRequiredSubmission(submission.Id).Status);
    }

    private static IntakeController CreateController(IntakeWorkflowService service, Guid? visitorId = null)
    {
        var controller = new IntakeController(null!, service)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        if (visitorId.HasValue)
        {
            controller.Request.Headers.Cookie = $"mbv_vid={visitorId.Value:D}";
        }

        return controller;
    }

    private sealed class InMemoryIntakeRepository : IIntakeRepository
    {
        private readonly Dictionary<Guid, IntakeFormDefinition> _forms = new();
        private readonly Dictionary<Guid, IntakeSubmission> _submissions = new();

        public List<IntakeAnswer> Answers { get; } = [];

        public Task<IntakeFormDefinition> CreateFormAsync(CancellationToken cancellationToken)
        {
            var form = new IntakeFormDefinition
            {
                SubmissionKind = "PatientIntake",
                Name = "Patient Intake",
                Version = 1,
                Status = "Active",
                Sections =
                [
                    new IntakeFormSection
                    {
                        SectionKey = "therapy_goals",
                        Title = "Therapy Goals",
                        DisplayOrder = 1,
                        Questions =
                        [
                            new IntakeQuestion
                            {
                                QuestionKey = "therapy_goals",
                                Prompt = "What are your goals?",
                                DisplayOrder = 1,
                                IsRequired = true
                            }
                        ]
                    }
                ]
            };
            form.Sections[0].FormDefinitionId = form.Id;
            form.Sections[0].Questions[0].SectionId = form.Sections[0].Id;
            _forms[form.Id] = form;
            return Task.FromResult(form);
        }

        public Task<IntakeFormDefinition?> GetActiveFormAsync(string submissionKind, CancellationToken cancellationToken)
        {
            return Task.FromResult(_forms.Values.FirstOrDefault(form =>
                form.SubmissionKind == submissionKind && form.Status == "Active"));
        }

        public Task<IntakeFormDefinition?> GetFormAsync(Guid formDefinitionId, CancellationToken cancellationToken)
        {
            _forms.TryGetValue(formDefinitionId, out var form);
            return Task.FromResult(form);
        }

        public Task<IntakeSubmission?> GetSubmissionAsync(Guid submissionId, CancellationToken cancellationToken)
        {
            _submissions.TryGetValue(submissionId, out var submission);
            return Task.FromResult(submission);
        }

        public Task<IntakeQuestion?> GetQuestionByKeyAsync(Guid formDefinitionId, string questionKey, CancellationToken cancellationToken)
        {
            var question = _forms[formDefinitionId].Sections
                .SelectMany(section => section.Questions)
                .FirstOrDefault(item => item.QuestionKey == questionKey);
            return Task.FromResult(question);
        }

        public Task AddSubmissionAsync(IntakeSubmission submission, CancellationToken cancellationToken)
        {
            _submissions[submission.Id] = submission;
            return Task.CompletedTask;
        }

        public IntakeSubmission GetRequiredSubmission(Guid submissionId)
        {
            return _submissions[submissionId];
        }

        public Task UpsertAnswerAsync(
            IntakeSubmission submission,
            IntakeQuestion question,
            string answerJsonb,
            CancellationToken cancellationToken)
        {
            var answer = Answers.FirstOrDefault(item =>
                item.SubmissionId == submission.Id && item.QuestionKey == question.QuestionKey);
            if (answer is null)
            {
                answer = new IntakeAnswer
                {
                    SubmissionId = submission.Id,
                    QuestionId = question.Id,
                    QuestionKey = question.QuestionKey
                };
                Answers.Add(answer);
            }

            answer.AnswerJsonb = answerJsonb;
            answer.UpdatedAtUtc = DateTimeOffset.UtcNow;
            return Task.CompletedTask;
        }

        public Task AddConsentAsync(Consent consent, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task<User?> GetUserAsync(Guid userId, CancellationToken cancellationToken)
        {
            return Task.FromResult<User?>(null);
        }

        public Task EnsureActiveRoleAsync(Guid userId, string role, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
