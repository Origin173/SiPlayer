export interface RequestMetric {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}

export interface UpstreamMetric {
  path: string;
  statusCode?: number;
  durationMs: number;
  outcome: 'success' | 'error';
}

export interface MetricAggregate {
  count: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
}

export interface GatewayMetricsSnapshot {
  requests: Record<string, MetricAggregate>;
  upstream: Record<string, MetricAggregate>;
  errors: Record<string, number>;
  rateLimited: number;
}

function createAggregate(): MetricAggregate {
  return { count: 0, errorCount: 0, totalDurationMs: 0, maxDurationMs: 0 };
}

function recordAggregate(
  collection: Map<string, MetricAggregate>,
  key: string,
  durationMs: number,
  isError: boolean,
): void {
  const aggregate = collection.get(key) ?? createAggregate();
  aggregate.count += 1;
  if (isError) aggregate.errorCount += 1;
  aggregate.totalDurationMs += durationMs;
  aggregate.maxDurationMs = Math.max(aggregate.maxDurationMs, durationMs);
  collection.set(key, aggregate);
}

function toRecord(collection: Map<string, MetricAggregate>): Record<string, MetricAggregate> {
  return Object.fromEntries([...collection.entries()].map(([key, value]) => [key, { ...value }]));
}

export class GatewayMetrics {
  private readonly requests = new Map<string, MetricAggregate>();
  private readonly upstream = new Map<string, MetricAggregate>();
  private readonly errors = new Map<string, number>();
  private rateLimited = 0;

  recordRequest(metric: RequestMetric): void {
    recordAggregate(
      this.requests,
      `${metric.method} ${metric.route}`,
      Math.max(0, metric.durationMs),
      metric.statusCode >= 400,
    );
  }

  recordUpstream(metric: UpstreamMetric): void {
    recordAggregate(
      this.upstream,
      metric.path,
      Math.max(0, metric.durationMs),
      metric.outcome === 'error',
    );
  }

  recordError(code: string): void {
    this.errors.set(code, (this.errors.get(code) ?? 0) + 1);
  }

  recordRateLimit(): void {
    this.rateLimited += 1;
  }

  snapshot(): GatewayMetricsSnapshot {
    return {
      requests: toRecord(this.requests),
      upstream: toRecord(this.upstream),
      errors: Object.fromEntries(this.errors.entries()),
      rateLimited: this.rateLimited,
    };
  }
}
