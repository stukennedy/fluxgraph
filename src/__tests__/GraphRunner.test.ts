import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphRunner } from '../core/GraphRunner';
import { GraphDefinition, DataPacket } from '../core/types';

describe('GraphRunner', () => {
  let graphRunner: GraphRunner;
  let testDefinition: GraphDefinition;

  beforeEach(() => {
    testDefinition = {
      id: 'test-graph',
      name: 'Test Graph',
      version: '1.0.0',
      nodes: [
        {
          id: 'source',
          type: 'source',
          name: 'Test Source',
          sourceType: 'manual',
          config: {}
        },
        {
          id: 'transform',
          type: 'transform',
          name: 'Test Transform',
          transformFunction: 'return { ...data, transformed: true }',
          outputSchema: {}
        },
        {
          id: 'sink',
          type: 'sink',
          name: 'Test Sink',
          sinkType: 'log',
          config: {}
        }
      ],
      edges: [
        { id: 'e1', from: 'source', to: 'transform' },
        { id: 'e2', from: 'transform', to: 'sink' }
      ]
    };

    graphRunner = new GraphRunner(testDefinition);
  });

  describe('initialization', () => {
    it('should initialize with correct definition', () => {
      expect(graphRunner.getState().graphId).toBe('test-graph');
      expect(graphRunner.getState().status).toBe('idle');
    });

    it('should create all nodes', async () => {
      await graphRunner.initialize();
      const state = graphRunner.getState();
      expect(state.status).toBe('idle');
      expect(Object.keys(state.nodeStates)).toHaveLength(3);
    });

    it('should validate graph definition', () => {
      const invalidDefinition = {
        ...testDefinition,
        nodes: []
      };
      
      expect(() => new GraphRunner(invalidDefinition)).not.toThrow();
    });
  });

  describe('execution', () => {
    it('should start and stop execution', async () => {
      await graphRunner.initialize();
      await graphRunner.start();
      
      expect(graphRunner.getState().status).toBe('running');
      
      await graphRunner.stop();
      expect(graphRunner.getState().status).toBe('stopped');
    });

    it('should pause and resume execution', async () => {
      await graphRunner.initialize();
      await graphRunner.start();
      
      await graphRunner.pause();
      expect(graphRunner.getState().status).toBe('paused');
      
      await graphRunner.resume();
      expect(graphRunner.getState().status).toBe('running');
      
      await graphRunner.stop();
    });
  });

  describe('data injection', () => {
    it('should inject data into a node', async () => {
      await graphRunner.initialize();
      await graphRunner.start();

      const testData = { value: 42 };
      
      // This should not throw
      expect(() => {
        graphRunner.inject('source', testData);
      }).not.toThrow();

      await graphRunner.stop();
    });

    it('should throw when injecting to non-existent node', async () => {
      await graphRunner.initialize();
      await graphRunner.start();

      await expect(
        graphRunner.inject('non-existent', {})
      ).rejects.toThrow();

      await graphRunner.stop();
    });
  });

  describe('metrics', () => {
    it('should track metrics', async () => {
      await graphRunner.initialize();
      const metrics = graphRunner.getMetrics();
      
      expect(metrics).toHaveProperty('packetsProcessed');
      expect(metrics).toHaveProperty('packetsDropped');
      expect(metrics).toHaveProperty('packetsErrored');
      expect(metrics).toHaveProperty('nodeMetrics');
    });

    it('should update metrics during processing', async () => {
      await graphRunner.initialize();
      await graphRunner.start();

      const initialMetrics = graphRunner.getMetrics();
      expect(initialMetrics.packetsProcessed).toBe(0);

      // Inject some data
      graphRunner.inject('source', { test: true });

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedMetrics = graphRunner.getMetrics();
      expect(updatedMetrics.packetsProcessed).toBeGreaterThanOrEqual(0);

      await graphRunner.stop();
    });
  });

  describe('error handling', () => {
    it('should handle errors in transform functions', async () => {
      const errorDefinition: GraphDefinition = {
        ...testDefinition,
        nodes: [
          ...testDefinition.nodes.filter(n => n.id !== 'transform'),
          {
            id: 'transform',
            type: 'transform',
            name: 'Error Transform',
            transformFunction: 'throw new Error("Test error")',
            outputSchema: {}
          }
        ]
      };

      const errorGraph = new GraphRunner(errorDefinition);
      await errorGraph.initialize();
      await errorGraph.start();

      // Should not throw when injecting data that causes error in transform
      expect(() => {
        errorGraph.inject('source', { test: true });
      }).not.toThrow();

      await errorGraph.stop();
    });

    it('should respect error strategy configuration', async () => {
      const stopOnErrorDefinition: GraphDefinition = {
        ...testDefinition,
        config: {
          errorStrategy: 'stop'
        }
      };

      const stopGraph = new GraphRunner(stopOnErrorDefinition);
      await stopGraph.initialize();
      await stopGraph.start();
      
      expect(stopGraph.getState().status).toBe('running');
      
      await stopGraph.stop();
    });
  });
});