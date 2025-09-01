package tech.nicorp.pm.pipelines.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.pipelines.domain.JobStatus;
import tech.nicorp.pm.pipelines.domain.PipelineJob;
import tech.nicorp.pm.pipelines.domain.PipelineLogChunk;
import tech.nicorp.pm.pipelines.domain.WhenType;
import tech.nicorp.pm.pipelines.repo.PipelineJobRepository;
import tech.nicorp.pm.pipelines.repo.PipelineLogChunkRepository;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RunnerService {
    private final PipelineJobRepository jobRepository;
    private final PipelineLogChunkRepository logRepository;
    private final java.util.concurrent.ConcurrentHashMap<UUID, SseEmitter> emitters = new java.util.concurrent.ConcurrentHashMap<>();

    @Transactional
    public Optional<PipelineJob> leaseJob(Map<String, Object> runnerInfo) {
        // naive implementation: pick first queued job that is not manual/delayed or whose delay elapsed
        List<PipelineJob> jobs = jobRepository.findAll();
        OffsetDateTime now = OffsetDateTime.now();
        return jobs.stream()
                .filter(j -> j.getStatus() == JobStatus.QUEUED)
                .filter(j -> j.getWhenType() != WhenType.MANUAL || j.isManualReleased())
                .filter(j -> j.getWhenType() != WhenType.DELAYED || (j.getStartAfterSeconds() == null || j.getCreatedAt().plusSeconds(j.getStartAfterSeconds()).isBefore(now)))
                .sorted(Comparator.comparing(PipelineJob::getCreatedAt))
                .findFirst()
                .map(j -> {
                    j.setStatus(JobStatus.RUNNING);
                    j.setStartedAt(now);
                    return jobRepository.save(j);
                });
    }

    @Transactional
    public void appendLogs(UUID jobId, String content) {
        PipelineJob job = jobRepository.findById(jobId).orElseThrow();
        PipelineLogChunk chunk = new PipelineLogChunk();
        chunk.setJob(job);
        chunk.setContent(content);
        logRepository.save(chunk);
        SseEmitter em = emitters.get(jobId);
        if (em != null) {
            try { em.send(SseEmitter.event().name("log").data(content)); } catch (Exception ignored) {}
        }
    }

    @Transactional
    public void updateStatus(UUID jobId, Map<String, Object> payload) {
        PipelineJob job = jobRepository.findById(jobId).orElseThrow();
        Object status = payload.get("status");
        if (status != null) {
            job.setStatus(JobStatus.valueOf(status.toString()));
        }
        if (payload.containsKey("finished")) {
            job.setFinishedAt(OffsetDateTime.now());
        }
        jobRepository.save(job);
        SseEmitter em = emitters.get(jobId);
        if (em != null) {
            try { em.send(SseEmitter.event().name("status").data(job.getStatus().name())); } catch (Exception ignored) {}
            if (job.getStatus() == JobStatus.SUCCESS || job.getStatus() == JobStatus.FAILED || job.getStatus() == JobStatus.CANCELED) {
                em.complete();
                emitters.remove(jobId);
            }
        }
    }

    public SseEmitter streamLogs(UUID jobId) {
        SseEmitter em = new SseEmitter(0L);
        emitters.put(jobId, em);
        em.onCompletion(() -> emitters.remove(jobId));
        em.onTimeout(() -> emitters.remove(jobId));
        return em;
    }
}


