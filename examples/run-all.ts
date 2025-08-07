#!/usr/bin/env bun
/* eslint-disable no-console */

/**
 * Runner script for all FluxGraph AI examples
 * Demonstrates various AI workflow patterns
 */

import { runChatbot } from './ai/chatbot-with-memory';
import { runRAGPipeline } from './ai/rag-pipeline';
import { runReActAgent } from './ai/react-agent';
import { runMultiAgentSystem } from './ai/multi-agent-system';
import { runToolCallingDemo, demonstrateDynamicTools } from './ai/tool-calling';

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function printHeader(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

function printSection(name: string) {
  console.log(`\n${colors.bright}${colors.blue}▶ Running: ${name}${colors.reset}\n`);
}

function printSuccess(message: string) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function printError(message: string) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function printInfo(message: string) {
  console.log(`${colors.yellow}ℹ ${message}${colors.reset}`);
}

async function runExample(name: string, fn: () => Promise<void>) {
  printSection(name);
  
  try {
    await fn();
    printSuccess(`${name} completed successfully`);
  } catch (error) {
    printError(`${name} failed: ${error}`);
    console.error(error);
  }
  
  // Give some breathing room between examples
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function checkEnvironment() {
  printHeader('Environment Check');
  
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  
  if (hasOpenAI) {
    printSuccess('OpenAI API key found');
  } else {
    printInfo('OpenAI API key not found (set OPENAI_API_KEY)');
  }
  
  if (hasAnthropic) {
    printSuccess('Anthropic API key found');
  } else {
    printInfo('Anthropic API key not found (set ANTHROPIC_API_KEY)');
  }
  
  if (hasGemini) {
    printSuccess('Gemini API key found');
  } else {
    printInfo('Gemini API key not found (set GEMINI_API_KEY)');
  }
  
  if (!hasOpenAI && !hasAnthropic && !hasGemini) {
    printError('No API keys found. Examples will run with simulated responses.');
    printInfo('For real LLM responses, set at least one API key.');
  }
  
  return hasOpenAI || hasAnthropic || hasGemini;
}

async function selectExamples() {
  printHeader('FluxGraph AI Examples');
  
  console.log('Available examples:');
  console.log('1. Chatbot with Memory');
  console.log('2. RAG Pipeline');
  console.log('3. ReAct Agent');
  console.log('4. Multi-Agent System');
  console.log('5. Tool Calling');
  console.log('6. Run All Examples');
  console.log('0. Exit');
  
  const selection = prompt('\nSelect an example (0-6): ');
  
  switch (selection) {
    case '1':
      await runExample('Chatbot with Memory', runChatbot);
      break;
    case '2':
      await runExample('RAG Pipeline', runRAGPipeline);
      break;
    case '3':
      await runExample('ReAct Agent', runReActAgent);
      break;
    case '4':
      await runExample('Multi-Agent System', runMultiAgentSystem);
      break;
    case '5':
      await runExample('Tool Calling', async () => {
        await runToolCallingDemo();
        await demonstrateDynamicTools();
      });
      break;
    case '6':
      await runAllExamples();
      break;
    case '0':
      console.log('\nGoodbye! 👋');
      process.exit(0);
    default:
      printError('Invalid selection');
  }
  
  // Ask if they want to run another
  const again = prompt('\nRun another example? (y/n): ');
  if (again?.toLowerCase() === 'y') {
    await selectExamples();
  }
}

async function runAllExamples() {
  printHeader('Running All FluxGraph AI Examples');
  
  const hasAPIKeys = await checkEnvironment();
  
  if (!hasAPIKeys) {
    printInfo('\nNote: Examples will use simulated responses without API keys.');
    const proceed = prompt('Continue anyway? (y/n): ');
    if (proceed?.toLowerCase() !== 'y') {
      return;
    }
  }
  
  // Run each example in sequence
  await runExample('1. Chatbot with Memory', runChatbot);
  await runExample('2. RAG Pipeline', runRAGPipeline);
  await runExample('3. ReAct Agent', runReActAgent);
  await runExample('4. Multi-Agent System', runMultiAgentSystem);
  await runExample('5. Tool Calling', async () => {
    await runToolCallingDemo();
    await demonstrateDynamicTools();
  });
  
  printHeader('All Examples Completed!');
  console.log('\n📚 Summary:');
  console.log('- Chatbot: Demonstrated conversation memory and context retention');
  console.log('- RAG: Showed document retrieval and augmented generation');
  console.log('- ReAct: Exhibited autonomous reasoning and tool usage');
  console.log('- Multi-Agent: Displayed agent collaboration and delegation');
  console.log('- Tools: Illustrated parallel and sequential function calling');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Try modifying the examples for your use case');
  console.log('2. Deploy to Cloudflare Workers for edge execution');
  console.log('3. Integrate with your existing systems');
  console.log('4. Check out the documentation for more patterns');
}

// Interactive mode when run directly
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all') || args.includes('-a')) {
    // Run all examples non-interactively
    await runAllExamples();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
FluxGraph AI Examples Runner

Usage:
  bun run examples/run-all.ts [options]

Options:
  --all, -a     Run all examples non-interactively
  --help, -h    Show this help message

Interactive mode:
  Run without options to select examples interactively

Individual examples:
  bun run example:chatbot     # Chatbot with memory
  bun run example:rag         # RAG pipeline
  bun run example:react       # ReAct agent
  bun run example:multi-agent # Multi-agent system
  bun run example:tools       # Tool calling demo
`);
  } else {
    // Interactive selection
    await selectExamples();
  }
  
  console.log('\n✨ Thanks for trying FluxGraph AI examples!');
}

// Run if this is the main module
if (import.meta.main) {
  main().catch(error => {
    printError(`Fatal error: ${error}`);
    console.error(error);
    process.exit(1);
  });
}

export { runAllExamples };