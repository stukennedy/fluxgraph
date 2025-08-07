import { GraphDefinition } from '@/core/types';
import { js } from '@/utils';

/**
 * System monitoring and alerting template
 */
export const monitoringTemplate: GraphDefinition = {
  id: 'monitoring-pipeline',
  name: 'System Monitoring Pipeline',
  version: '1.0.0',
  description: 'Monitor system metrics and generate alerts',
  nodes: [
    {
      id: 'metrics-source',
      type: 'source',
      name: 'Metrics Stream',
      sourceType: 'timer',
      config: {
        interval: 10000, // Collect metrics every 10 seconds
      },
    },
    {
      id: 'collect-metrics',
      type: 'transform',
      name: 'Collect System Metrics',
      transformFunction: js`
        // Simulate collecting system metrics
        return {
          timestamp: Date.now(),
          cpu: {
            usage: Math.random() * 100,
            cores: 4
          },
          memory: {
            used: Math.random() * 16 * 1024 * 1024 * 1024, // bytes
            total: 16 * 1024 * 1024 * 1024,
            percentage: Math.random() * 100
          },
          disk: {
            used: Math.random() * 500 * 1024 * 1024 * 1024,
            total: 500 * 1024 * 1024 * 1024,
            percentage: Math.random() * 100
          },
          network: {
            bytesIn: Math.random() * 1024 * 1024,
            bytesOut: Math.random() * 1024 * 1024,
            packetsIn: Math.floor(Math.random() * 1000),
            packetsOut: Math.floor(Math.random() * 1000)
          },
          services: {
            api: Math.random() > 0.95 ? 'down' : 'up',
            database: Math.random() > 0.98 ? 'down' : 'up',
            cache: 'up'
          }
        };
      `,
      outputSchema: {},
    },
    {
      id: 'check-thresholds',
      type: 'transform',
      name: 'Check Alert Thresholds',
      transformFunction: js`
        const alerts = [];
        
        // CPU alerts
        if (data.cpu.usage > 80) {
          alerts.push({
            type: 'cpu',
            severity: data.cpu.usage > 90 ? 'critical' : 'warning',
            message: \`CPU usage at \${data.cpu.usage.toFixed(1)}%\`
          });
        }
        
        // Memory alerts
        if (data.memory.percentage > 85) {
          alerts.push({
            type: 'memory',
            severity: data.memory.percentage > 95 ? 'critical' : 'warning',
            message: \`Memory usage at \${data.memory.percentage.toFixed(1)}%\`
          });
        }
        
        // Disk alerts
        if (data.disk.percentage > 90) {
          alerts.push({
            type: 'disk',
            severity: data.disk.percentage > 95 ? 'critical' : 'warning',
            message: \`Disk usage at \${data.disk.percentage.toFixed(1)}%\`
          });
        }
        
        // Service alerts
        Object.entries(data.services).forEach(([service, status]) => {
          if (status === 'down') {
            alerts.push({
              type: 'service',
              severity: 'critical',
              service,
              message: \`Service \${service} is down\`
            });
          }
        });
        
        return {
          ...data,
          hasAlerts: alerts.length > 0,
          alerts,
          alertCount: alerts.length,
          criticalCount: alerts.filter(a => a.severity === 'critical').length
        };
      `,
      outputSchema: {},
    },
    {
      id: 'aggregate-metrics',
      type: 'aggregate',
      name: 'Aggregate Metrics',
      windowType: 'time',
      windowSize: 60000, // 1 minute windows
      emitStrategy: 'onComplete',
      aggregateFunction: js`
        // Calculate aggregated metrics
        const cpuValues = values.map(v => v.cpu.usage);
        const memoryValues = values.map(v => v.memory.percentage);
        const diskValues = values.map(v => v.disk.percentage);
        
        return {
          window: {
            start: values[0]?.timestamp,
            end: values[values.length - 1]?.timestamp,
            count: values.length
          },
          cpu: {
            min: Math.min(...cpuValues),
            max: Math.max(...cpuValues),
            avg: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length
          },
          memory: {
            min: Math.min(...memoryValues),
            max: Math.max(...memoryValues),
            avg: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length
          },
          disk: {
            min: Math.min(...diskValues),
            max: Math.max(...diskValues),
            avg: diskValues.reduce((a, b) => a + b, 0) / diskValues.length
          },
          network: {
            totalBytesIn: values.reduce((sum, v) => sum + v.network.bytesIn, 0),
            totalBytesOut: values.reduce((sum, v) => sum + v.network.bytesOut, 0)
          },
          alerts: {
            total: values.reduce((sum, v) => sum + (v.alertCount || 0), 0),
            critical: values.reduce((sum, v) => sum + (v.criticalCount || 0), 0)
          }
        };
      `,
    },
    {
      id: 'filter-alerts',
      type: 'filter',
      name: 'Filter for Alerts',
      filterFunction: js`
        return data.hasAlerts === true;
      `,
    },
    {
      id: 'store-metrics',
      type: 'sink',
      name: 'Store Metrics',
      sinkType: 'database',
      config: {
        table: 'system_metrics',
      },
    },
    {
      id: 'store-aggregates',
      type: 'sink',
      name: 'Store Aggregated Metrics',
      sinkType: 'database',
      config: {
        table: 'metrics_aggregates',
      },
    },
    {
      id: 'send-alerts',
      type: 'sink',
      name: 'Send Alert Notifications',
      sinkType: 'http',
      config: {
        url: 'https://alerts.example.com/api/system',
        method: 'POST',
      },
    },
  ],
  edges: [
    { id: 'e1', from: 'metrics-source', to: 'collect-metrics' },
    { id: 'e2', from: 'collect-metrics', to: 'check-thresholds' },
    { id: 'e3', from: 'check-thresholds', to: 'aggregate-metrics' },
    { id: 'e4', from: 'check-thresholds', to: 'filter-alerts' },
    { id: 'e5', from: 'check-thresholds', to: 'store-metrics' },
    { id: 'e6', from: 'aggregate-metrics', to: 'store-aggregates' },
    { id: 'e7', from: 'filter-alerts', to: 'send-alerts' },
  ],
  config: {
    errorStrategy: 'continue',
  },
};

export const createMonitoringPipeline = (config?: Partial<GraphDefinition['config']>) => ({
  ...monitoringTemplate,
  config: {
    ...monitoringTemplate.config,
    ...config,
  },
});

export default monitoringTemplate;
