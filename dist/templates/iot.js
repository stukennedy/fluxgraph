import { js } from "@/utils";
/**
 * IoT sensor data processing template
 */
export const iotTemplate = {
    id: "iot-pipeline",
    name: "IoT Sensor Pipeline",
    version: "1.0.0",
    description: "Process and analyze IoT sensor data streams",
    nodes: [
        {
            id: "sensor-input",
            type: "source",
            name: "Sensor Data Stream",
            sourceType: "websocket",
            config: {
                url: "wss://iot-gateway.example.com/sensors"
            }
        },
        {
            id: "parse",
            type: "transform",
            name: "Parse Sensor Data",
            transformFunction: js `
        // Parse sensor data format
        if (typeof data === 'string') {
          try {
            return JSON.parse(data);
          } catch (e) {
            throw new Error('Invalid sensor data format');
          }
        }
        return data;
      `,
            outputSchema: {
                sensorId: "string",
                temperature: "number",
                humidity: "number",
                pressure: "number",
                timestamp: "number"
            }
        },
        {
            id: "validate-range",
            type: "filter",
            name: "Validate Sensor Ranges",
            filterFunction: js `
        // Filter out invalid sensor readings
        return data.temperature > -50 && data.temperature < 150 &&
               data.humidity >= 0 && data.humidity <= 100 &&
               data.pressure > 800 && data.pressure < 1200;
      `
        },
        {
            id: "detect-anomalies",
            type: "transform",
            name: "Anomaly Detection",
            transformFunction: js `
        // Simple threshold-based anomaly detection
        const anomalies = [];
        
        if (data.temperature > 40 || data.temperature < -10) {
          anomalies.push('temperature');
        }
        if (data.humidity > 90 || data.humidity < 20) {
          anomalies.push('humidity');
        }
        if (data.pressure < 950 || data.pressure > 1050) {
          anomalies.push('pressure');
        }
        
        return {
          ...data,
          hasAnomaly: anomalies.length > 0,
          anomalies,
          severity: anomalies.length >= 2 ? 'high' : 
                   anomalies.length === 1 ? 'medium' : 'none'
        };
      `,
            outputSchema: {}
        },
        {
            id: "aggregate-stats",
            type: "aggregate",
            name: "Calculate Statistics",
            windowType: "time",
            windowSize: 300000, // 5 minute windows
            emitStrategy: "onComplete",
            aggregateFunction: js `
        // Calculate statistics for sensor readings
        const stats = {
          sensorId: values[0]?.sensorId,
          count: values.length,
          temperature: {
            min: Math.min(...values.map(v => v.temperature)),
            max: Math.max(...values.map(v => v.temperature)),
            avg: values.reduce((sum, v) => sum + v.temperature, 0) / values.length
          },
          humidity: {
            min: Math.min(...values.map(v => v.humidity)),
            max: Math.max(...values.map(v => v.humidity)),
            avg: values.reduce((sum, v) => sum + v.humidity, 0) / values.length
          },
          pressure: {
            min: Math.min(...values.map(v => v.pressure)),
            max: Math.max(...values.map(v => v.pressure)),
            avg: values.reduce((sum, v) => sum + v.pressure, 0) / values.length
          },
          anomalyCount: values.filter(v => v.hasAnomaly).length,
          window: {
            start: values[0]?.timestamp,
            end: values[values.length - 1]?.timestamp
          }
        };
        
        return stats;
      `
        },
        {
            id: "alert-anomalies",
            type: "filter",
            name: "Filter Anomalies for Alerts",
            filterFunction: js `
        return data.hasAnomaly && data.severity !== 'none';
      `
        },
        {
            id: "store-readings",
            type: "sink",
            name: "Store Sensor Data",
            sinkType: "database",
            config: {
                table: "sensor_readings"
            }
        },
        {
            id: "send-alerts",
            type: "sink",
            name: "Send Alerts",
            sinkType: "http",
            config: {
                url: "https://alerts.example.com/api/notify",
                method: "POST"
            }
        },
        {
            id: "store-stats",
            type: "sink",
            name: "Store Statistics",
            sinkType: "database",
            config: {
                table: "sensor_statistics"
            }
        }
    ],
    edges: [
        { id: "e1", from: "sensor-input", to: "parse" },
        { id: "e2", from: "parse", to: "validate-range" },
        { id: "e3", from: "validate-range", to: "detect-anomalies" },
        { id: "e4", from: "detect-anomalies", to: "aggregate-stats" },
        { id: "e5", from: "detect-anomalies", to: "alert-anomalies" },
        { id: "e6", from: "detect-anomalies", to: "store-readings" },
        { id: "e7", from: "alert-anomalies", to: "send-alerts" },
        { id: "e8", from: "aggregate-stats", to: "store-stats" }
    ],
    config: {
        errorStrategy: "continue"
    }
};
export default iotTemplate;
