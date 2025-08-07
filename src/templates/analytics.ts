import { GraphDefinition } from "../core/types";
import { js } from "../utils";

/**
 * Analytics pipeline template
 * Processes events for real-time analytics
 */
export const analyticsTemplate: GraphDefinition = {
  id: "analytics-pipeline",
  name: "Analytics Pipeline",
  version: "1.0.0",
  description: "Real-time event analytics with aggregation",
  nodes: [
    {
      id: "event-source",
      type: "source",
      name: "Event Stream",
      sourceType: "http",
      config: {
        url: "/events"
      }
    },
    {
      id: "validate",
      type: "filter",
      name: "Validate Events",
      filterFunction: js`
        return data && 
               data.eventType && 
               data.timestamp && 
               data.userId;
      `
    },
    {
      id: "enrich",
      type: "transform",
      name: "Enrich Event",
      transformFunction: js`
        return {
          ...data,
          processedAt: Date.now(),
          hour: new Date(data.timestamp).getHours(),
          dayOfWeek: new Date(data.timestamp).getDay()
        };
      `,
      outputSchema: {}
    },
    {
      id: "aggregate-by-type",
      type: "aggregate",
      name: "Aggregate by Event Type",
      windowType: "time",
      windowSize: 60000, // 1 minute windows
      emitStrategy: "onComplete",
      aggregateFunction: js`
        const counts = {};
        values.forEach(event => {
          counts[event.eventType] = (counts[event.eventType] || 0) + 1;
        });
        return {
          window: {
            start: metadata[0]?.timestamp,
            end: metadata[metadata.length - 1]?.timestamp
          },
          eventCounts: counts,
          totalEvents: values.length,
          uniqueUsers: new Set(values.map(e => e.userId)).size
        };
      `
    },
    {
      id: "store",
      type: "sink",
      name: "Store Analytics",
      sinkType: "database",
      config: {
        table: "analytics_aggregates"
      }
    },
    {
      id: "dashboard",
      type: "sink",
      name: "Dashboard Updates",
      sinkType: "http",
      config: {
        url: "https://dashboard.example.com/api/updates",
        method: "POST"
      }
    }
  ],
  edges: [
    { id: "e1", from: "event-source", to: "validate" },
    { id: "e2", from: "validate", to: "enrich" },
    { id: "e3", from: "enrich", to: "aggregate-by-type" },
    { id: "e4", from: "aggregate-by-type", to: "store" },
    { id: "e5", from: "aggregate-by-type", to: "dashboard" }
  ],
  config: {
    errorStrategy: "continue"
  }
};

export default analyticsTemplate;
