/**
 * Tool Calling Example
 *
 * This example demonstrates how to use the ToolNode for function
 * calling with parallel and sequential execution strategies.
 */

import { Graph, GraphDefinition, Tool } from '@fluxgraph/core';
import { js } from '@fluxgraph/core/utils';

// Define a comprehensive set of tools
const tools: Tool[] = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name or coordinates' },
        units: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature units' },
      },
      required: ['location'],
    },
    function: async ({ location, units = 'celsius' }: { location: string; units: string }) => {
      // Simulated weather API
      const weather = {
        location,
        temperature: Math.floor(Math.random() * 30) + 10,
        units,
        conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
        humidity: Math.floor(Math.random() * 40) + 40,
        windSpeed: Math.floor(Math.random() * 20) + 5,
      };
      return weather;
    },
  },

  {
    name: 'get_stock_price',
    description: 'Get current stock price and information',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Stock ticker symbol' },
        exchange: { type: 'string', description: 'Stock exchange (optional)' },
      },
      required: ['symbol'],
    },
    function: async ({ symbol, exchange }: { symbol: string; exchange: string }) => {
      // Simulated stock API
      const price = (Math.random() * 1000).toFixed(2);
      const change = ((Math.random() - 0.5) * 10).toFixed(2);
      return {
        symbol,
        exchange: exchange || 'NASDAQ',
        price: parseFloat(price),
        change: parseFloat(change),
        changePercent: ((parseFloat(change) / parseFloat(price)) * 100).toFixed(2),
        timestamp: new Date().toISOString(),
      };
    },
  },

  {
    name: 'send_email',
    description: 'Send an email message',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body content' },
        cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients' },
      },
      required: ['to', 'subject', 'body'],
    },
    function: async ({ to, subject, body, cc = [] }: { to: string; subject: string; body: string; cc: string[] }) => {
      // Simulated email sending
      console.log(`📧 Sending email to: ${to}`);
      console.log(`   Subject: ${subject}`);
      if (cc.length > 0) console.log(`   CC: ${cc.join(', ')}`);

      return {
        success: true,
        messageId: `msg-${Date.now()}`,
        recipients: [to, ...cc],
        sentAt: new Date().toISOString(),
      };
    },
  },

  {
    name: 'create_calendar_event',
    description: 'Create a calendar event',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        date: { type: 'string', description: 'Event date (YYYY-MM-DD)' },
        time: { type: 'string', description: 'Event time (HH:MM)' },
        duration: { type: 'number', description: 'Duration in minutes' },
        attendees: { type: 'array', items: { type: 'string' }, description: 'List of attendee emails' },
      },
      required: ['title', 'date', 'time'],
    },
    function: async ({ title, date, time, duration = 60, attendees = [] }: { title: string; date: string; time: string; duration: number; attendees: string[] }) => {
      return {
        eventId: `evt-${Date.now()}`,
        title,
        scheduledFor: `${date} ${time}`,
        duration,
        attendees,
        status: 'scheduled',
        meetingLink: `https://meet.example.com/${Date.now()}`,
      };
    },
  },

  {
    name: 'database_query',
    description: 'Query a database',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query or search query' },
        limit: { type: 'number', description: 'Maximum number of results' },
        database: { type: 'string', description: 'Database name' },
      },
      required: ['query'],
    },
    function: async ({ query, limit = 10, database = 'default' }: { query: string; limit: number; database: string }) => {
      // Simulated database query
      const results = [];
      for (let i = 1; i <= Math.min(limit, 5); i++) {
        results.push({
          id: i,
          name: `Record ${i}`,
          value: Math.floor(Math.random() * 1000),
          timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        });
      }

      return {
        database,
        query,
        results,
        count: results.length,
        executionTime: Math.floor(Math.random() * 100) + 10,
      };
    },
  },

  {
    name: 'translate_text',
    description: 'Translate text between languages',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to translate' },
        from: { type: 'string', description: 'Source language code' },
        to: { type: 'string', description: 'Target language code' },
      },
      required: ['text', 'to'],
    },
    function: async ({ text, from = 'auto', to }: { text: string; from: string; to: string }) => {
      // Simulated translation
      const translations = {
        es: 'Texto traducido al español',
        fr: 'Texte traduit en français',
        de: 'Ins Deutsche übersetzter Text',
        ja: '日本語に翻訳されたテキスト',
        zh: '翻译成中文的文本',
      };

      return {
        originalText: text,
        translatedText: translations[to as keyof typeof translations] || `[Translated to ${to}]: ${text}`,
        sourceLanguage: from,
        targetLanguage: to,
        confidence: 0.95,
      };
    },
  },
];

const toolCallingGraph: GraphDefinition = {
  id: 'tool-calling-demo',
  name: 'Tool Calling Demonstration',
  description: 'Shows parallel and sequential tool execution',

  nodes: [
    {
      id: 'user-request',
      type: 'source',
      name: 'User Request',
      sourceType: 'manual',
      config: {},
    },

    {
      id: 'request-analyzer',
      type: 'transform',
      name: 'Mock Request Analyzer',
      transformFunction: js`
        // Mock request analyzer that determines which tools to use
        const request = data.originalRequest || data.prompt;
        let toolCalls = [];
        
        if (request.includes('weather') || request.includes('temperature')) {
          toolCalls.push({
            toolName: 'get_weather',
            parameters: { location: 'New York', units: 'celsius' }
          });
        }
        
        if (request.includes('stock') || request.includes('price')) {
          toolCalls.push({
            toolName: 'get_stock_price',
            parameters: { symbol: 'AAPL', exchange: 'NASDAQ' }
          });
        }
        
        if (request.includes('email') || request.includes('send')) {
          toolCalls.push({
            toolName: 'send_email',
            parameters: { 
              to: 'user@example.com', 
              subject: 'Test Email', 
              body: 'This is a test email from the tool calling demo.' 
            }
          });
        }
        
        if (request.includes('calendar') || request.includes('event')) {
          toolCalls.push({
            toolName: 'create_calendar_event',
            parameters: { 
              title: 'Team Meeting', 
              date: '2024-01-15', 
              time: '14:00', 
              duration: 60 
            }
          });
        }
        
        if (request.includes('database') || request.includes('query')) {
          toolCalls.push({
            toolName: 'database_query',
            parameters: { query: 'SELECT * FROM users LIMIT 5' }
          });
        }
        
        if (request.includes('translate') || request.includes('language')) {
          toolCalls.push({
            toolName: 'translate_text',
            parameters: { text: 'Hello world', to: 'es' }
          });
        }
        
        // Default to weather if no specific tools identified
        if (toolCalls.length === 0) {
          toolCalls.push({
            toolName: 'get_weather',
            parameters: { location: 'San Francisco', units: 'celsius' }
          });
        }
        

        
        return {
          ...data,
          toolCalls,
          analysis: 'Mock analysis completed - tools identified for execution',
        };
      `,
    },

    {
      id: 'tool-executor',
      type: 'transform',
      name: 'Mock Tool Executor',
      transformFunction: js`
        // Mock tool executor that simulates tool execution
        const toolCalls = data.toolCalls || [];
        const results = [];
        

        
        for (const toolCall of toolCalls) {
          const { toolName, parameters } = toolCall;
          
          // Simulate tool execution based on tool name
          let result;
          let success = true;
          
          try {
            switch (toolName) {
              case 'get_weather':
                result = {
                  location: parameters.location,
                  temperature: Math.floor(Math.random() * 30) + 10,
                  units: parameters.units,
                  conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
                  humidity: Math.floor(Math.random() * 40) + 40,
                  windSpeed: Math.floor(Math.random() * 20) + 5,
                };
                break;
                
              case 'get_stock_price':
                const price = (Math.random() * 1000).toFixed(2);
                const change = ((Math.random() - 0.5) * 10).toFixed(2);
                result = {
                  symbol: parameters.symbol,
                  exchange: parameters.exchange || 'NASDAQ',
                  price: parseFloat(price),
                  change: parseFloat(change),
                  changePercent: ((parseFloat(change) / parseFloat(price)) * 100).toFixed(2),
                  timestamp: new Date().toISOString(),
                };
                break;
                
              case 'send_email':
                result = {
                  success: true,
                  messageId: 'msg-' + Date.now(),
                  recipients: [parameters.to],
                  sentAt: new Date().toISOString(),
                };
                break;
                
              case 'create_calendar_event':
                result = {
                  eventId: 'evt-' + Date.now(),
                  title: parameters.title,
                  scheduledFor: parameters.date + ' ' + parameters.time,
                  duration: parameters.duration,
                  status: 'scheduled',
                  meetingLink: 'https://meet.example.com/' + Date.now(),
                };
                break;
                
              case 'database_query':
                const queryResults = [];
                for (let i = 1; i <= 5; i++) {
                  queryResults.push({
                    id: i,
                    name: 'Record ' + i,
                    value: Math.floor(Math.random() * 1000),
                    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
                  });
                }
                result = {
                  database: 'default',
                  query: parameters.query,
                  results: queryResults,
                  count: queryResults.length,
                  executionTime: Math.floor(Math.random() * 100) + 10,
                };
                break;
                
              case 'translate_text':
                const translations = {
                  es: 'Texto traducido al español',
                  fr: 'Texte traduit en français',
                  de: 'Ins Deutsche übersetzter Text',
                  ja: '日本語に翻訳されたテキスト',
                  zh: '翻译成中文的文本',
                };
                result = {
                  originalText: parameters.text,
                  translatedText: translations[parameters.to] || '[Translated to ' + parameters.to + ']: ' + parameters.text,
                  sourceLanguage: parameters.from || 'auto',
                  targetLanguage: parameters.to,
                  confidence: 0.95,
                };
                break;
                
              default:
                result = { error: 'Unknown tool: ' + toolName };
                success = false;
            }
          } catch (error) {
            result = { error: error.message };
            success = false;
          }
          
          results.push({
            toolName,
            success,
            result,
            parameters,
          });
        }
        

        
        return {
          ...data,
          toolResults: results,
          parallelExecution: true,
        };
      `,
    },

    {
      id: 'result-formatter',
      type: 'transform',
      name: 'Result Formatter',
      transformFunction: js`

        const results = data.toolResults;

        if (!results) {
          return data;
        }

        // Format tool results for presentation
        const formattedResults = Array.isArray(results)
          ? results.map((r) => ({
              tool: r.toolName,
              success: r.success,
              data: r.result || r.error,
            }))
          : [
              {
                tool: data.toolName,
                success: true,
                data: results,
              },
            ];



        return {
          ...data,
          formattedResults,
          executionSummary: {
            totalTools: formattedResults.length,
            successful: formattedResults.filter((r) => r.success).length,
            failed: formattedResults.filter((r) => !r.success).length,
            parallel: data.parallelExecution || false,
          },
        };
      `,
    },

    {
      id: 'response-generator',
      type: 'transform',
      name: 'Mock Response Generator',
      transformFunction: js`
        // Mock response generator that synthesizes tool results
        const request = data.originalRequest;
        const results = data.formattedResults || [];
        
        let response = 'Tool execution completed successfully!\n\n';
        
        if (results.length > 0) {
          response += 'Results:\n';
          results.forEach((result, index) => {
            response += (index + 1) + '. ' + result.tool + ': ' + JSON.stringify(result.data, null, 2) + '\n';
          });
        }
        
        response += '\nSummary: All requested tools have been executed and results are ready.';
        
        return {
          ...data,
          response,
          model: 'mock-response-generator',
        };
      `,
    },

    {
      id: 'output',
      type: 'sink',
      name: 'Final Output',
      sinkType: 'custom',
      config: {
        callback: async (packet: any) => {
          const data = packet.data;

          console.log('\n╔══════════════════════════════════════════════╗');
          console.log('║            TOOL CALLING RESULTS             ║');
          console.log('╚══════════════════════════════════════════════╝\n');

          console.log('📝 Original Request:', data.originalRequest);

          if (data.executionSummary) {
            console.log('\n📊 Execution Summary:');
            console.log(`   Tools Called: ${data.executionSummary.totalTools}`);
            console.log(`   Successful: ${data.executionSummary.successful}`);
            console.log(`   Failed: ${data.executionSummary.failed}`);
            console.log(`   Execution Mode: ${data.executionSummary.parallel ? 'Parallel' : 'Sequential'}`);
          }

          if (data.formattedResults) {
            console.log('\n🔧 Tool Results:');
            data.formattedResults.forEach((result: any, i: number) => {
              console.log(`\n   ${i + 1}. ${result.tool}:`);
              console.log(`      Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
              console.log(
                `      Result:`,
                JSON.stringify(result.data, null, 2)
                  .split('\n')
                  .map((line) => '      ' + line)
                  .join('\n')
              );
            });
          }

          if (data.response) {
            console.log('\n💬 Final Response:');
            console.log(data.response);
          }

          console.log('\n' + '═'.repeat(50) + '\n');
        },
      },
    },
  ],

  edges: [
    { from: 'user-request', to: 'request-analyzer' },
    { from: 'request-analyzer', to: 'tool-executor' },
    { from: 'tool-executor', to: 'result-formatter' },
    { from: 'result-formatter', to: 'response-generator' },
    { from: 'response-generator', to: 'output' },
  ],

  config: {
    errorStrategy: 'continue',
    bufferSize: 10,
  },
};

// Usage example
async function runToolCallingDemo() {
  const graph = new Graph(toolCallingGraph);

  await graph.initialize();
  await graph.start();

  // Example requests that demonstrate different tool calling patterns
  const requests = [
    // Single tool call
    "What's the weather like in San Francisco?",

    // Multiple parallel tool calls
    'Get me the weather in New York and London, and also check the stock price of AAPL',

    // Sequential tool calls with dependencies
    "Check the weather in Tokyo, and if it's sunny, create a calendar event for tomorrow at 2 PM for an outdoor meeting",

    // Complex multi-tool scenario
    "I need to send an email to john@example.com about tomorrow's meeting. Include the weather forecast for Seattle and current MSFT stock price in the email.",

    // Database and translation
    'Query the database for the top 5 records and translate the results to Spanish',
  ];

  for (const request of requests) {
    await graph.inject('user-request', {
      prompt: request,
      originalRequest: request,
      timestamp: Date.now(),
    });

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  await graph.stop();
}

// Advanced example: Dynamic tool addition
async function demonstrateDynamicTools() {
  // For this demo, we'll create a modified graph with dynamic tools
  // In production, you would access the node through the graph's internal structure

  console.log('\n📊 Dynamic Tool Addition Demo');
  console.log('In a production environment, you can dynamically add tools to ToolNode instances.');
  console.log('This feature allows for runtime extension of agent capabilities.');

  // Example of what dynamic tool addition would look like:
  const customTool: Tool = {
    name: 'custom_calculation',
    description: 'Perform a custom calculation',
    parameters: {
      type: 'object',
      properties: {
        operation: { type: 'string', description: 'Math operation' },
        values: { type: 'array', items: { type: 'number' } },
      },
      required: ['operation', 'values'],
    },
    function: ({ operation, values }: { operation: string; values: number[] }) => {
      switch (operation) {
        case 'sum':
          return values.reduce((a, b) => a + b, 0);
        case 'product':
          return values.reduce((a, b) => a * b, 1);
        case 'average':
          return values.reduce((a, b) => a + b, 0) / values.length;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    },
  };

  console.log('Custom tool created:', customTool.name);
  console.log('This tool could be added to a ToolNode using: toolNode.addTool(customTool)');
}

// Run the examples with bun
if (import.meta.main) {
  runToolCallingDemo()
    .then(() => demonstrateDynamicTools())
    .catch(console.error);
}

export { toolCallingGraph, runToolCallingDemo, tools, demonstrateDynamicTools };
