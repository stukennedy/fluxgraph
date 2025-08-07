import { GraphBuilder } from "../core/GraphBuilder";
import { nodes } from "../core/NodeBuilder";
import { GraphDefinition } from "../core/types";
import { TransformFunctions } from "../nodes/TransformNode";
import { js } from "../utils";

/**
 * Create an anomaly detector for financial transactions
 */
export function createAnomalyDetector(config: {
  sourceUrl?: string;
  thresholds?: {
    amount?: number;
    frequency?: number;
  };
  alertUrl?: string;
}): GraphDefinition {
  const thresholds = {
    amount: config.thresholds?.amount || 1000,
    frequency: config.thresholds?.frequency || 10
  };

  return GraphBuilder.create("Financial Anomaly Detector")
    .description("Detects anomalous financial transactions in real-time")
    .nodes(
      nodes.source("input", {
        type: config.sourceUrl ? "websocket" : "manual",
        url: config.sourceUrl
      }),

      nodes.transform("normalize", {
        function: (data) => ({
          ...data,
          amount: data.amount / 100,
          timestamp: new Date(data.timestamp || data.date).getTime()
        })
      }),

      nodes.transform("detect", {
        function: js`
          const amount = Math.abs(data.amount);
          const hour = new Date(data.timestamp).getHours();
          
          let score = 0;
          if (amount > ${thresholds.amount}) score += 3;
          if (hour < 6 || hour > 23) score += 2;
          if (data.merchant && data.merchant.includes('FOREIGN')) score += 1;
          
          return {
            ...data,
            anomalyScore: score,
            isAnomaly: score >= 4
          };
        `
      }),

      nodes.filter("anomalies", {
        function: (data) => data.isAnomaly === true
      }),

      nodes.sink("alerts", {
        type: config.alertUrl ? "http" : "log",
        url: config.alertUrl,
        method: "POST"
      })
    )
    .flow("input", "normalize", "detect", "anomalies", "alerts")
    .config({
      errorStrategy: "continue",
      bufferStrategy: "sliding"
    })
    .build();
}

/**
 * Create a spending monitor
 */
export function createSpendingMonitor(config: {
  dailyLimit?: number;
  categories?: string[];
  alertUrl?: string;
}): GraphDefinition {
  const limit = config.dailyLimit || 100;

  return GraphBuilder.create("Spending Monitor")
    .description("Monitors spending against daily limits")
    .nodes(
      nodes.manual("input"),

      nodes.filter("expenses", {
        function: "return data.amount < 0"
      }),

      nodes.aggregate("daily", {
        window: "time",
        duration: 86400, // 24 hours
        function: js`
          const total = packets.reduce((sum, p) => 
            sum + Math.abs(p.data.amount), 0
          );
          return {
            date: new Date().toISOString().split('T')[0],
            total,
            count: packets.length,
            exceedsLimit: total > ${limit}
          };
        `,
        emit: "incremental"
      }),

      nodes.filter("exceeded", {
        function: "return data.exceedsLimit"
      }),

      nodes.sink("alert", {
        type: config.alertUrl ? "http" : "log",
        url: config.alertUrl
      })
    )
    .flow("input", "expenses", "daily", "exceeded", "alert")
    .build();
}

/**
 * Create a transaction categorizer
 */
export function createTransactionCategorizer(): GraphDefinition {
  return GraphBuilder.create("Transaction Categorizer")
    .description(
      "Categorizes transactions based on merchant and amount patterns"
    )
    .nodes(
      nodes.manual("input"),

      nodes.transform("categorize", {
        function: TransformFunctions.categorizeTransaction()
      }),

      nodes.aggregate("summary", {
        window: "count",
        size: 100,
        function: js`
          const categories = {};
          packets.forEach(p => {
            const cat = p.data.category;
            if (!categories[cat]) {
              categories[cat] = { count: 0, total: 0 };
            }
            categories[cat].count++;
            categories[cat].total += Math.abs(p.data.amount);
          });
          return { categories, timestamp: Date.now() };
        `
      }),

      nodes.log("output")
    )
    .flow("input", "categorize", "summary", "output")
    .build();
}

/**
 * Create a balance tracker
 */
export function createBalanceTracker(
  initialBalance: number = 0
): GraphDefinition {
  return GraphBuilder.create("Balance Tracker")
    .description("Tracks running balance from transaction stream")
    .nodes(
      nodes.manual("input"),

      nodes.transform("track", {
        function: js`
          // This would need state management in practice
          const previousBalance = metadata?.balance || ${initialBalance};
          const newBalance = previousBalance + data.amount;
          
          return {
            ...data,
            previousBalance,
            currentBalance: newBalance,
            change: data.amount
          };
        `
      }),

      nodes.filter("alerts", {
        function: js`
          return data.currentBalance < 0 || 
                 data.currentBalance < 100;
        `
      }),

      nodes.log("warnings")
    )
    .connect("input", "track")
    .branch("track", "alerts")
    .connect("alerts", "warnings")
    .build();
}
