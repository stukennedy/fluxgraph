import { describe, it, expect } from 'vitest';
import { validateGraphDefinition, validateNodeConfig, validateDataPacket, validateFunctionSyntax, hasCycles } from '@/utils/validation';
import { GraphDefinition } from '@/core/types';

describe('validation utils', () => {
  describe('validateGraphDefinition', () => {
    it('should validate a correct graph definition', () => {
      const validGraph: GraphDefinition = {
        id: 'test-graph',
        name: 'Test Graph',
        version: '1.0.0',
        nodes: [
          {
            id: 'node1',
            type: 'source',
            name: 'Source Node',
            sourceType: 'manual',
            config: {},
          },
          {
            id: 'node2',
            type: 'sink',
            name: 'Sink Node',
            sinkType: 'log',
            config: {},
          },
        ],
        edges: [{ id: 'edge1', from: 'node1', to: 'node2' }],
      };

      const result = validateGraphDefinition(validGraph);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidGraph = {
        nodes: [],
        edges: [],
      } as any;

      const result = validateGraphDefinition(invalidGraph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Graph definition must have an id');
      expect(result.errors).toContain('Graph definition must have a name');
    });

    it('should detect duplicate node IDs', () => {
      const duplicateGraph: GraphDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        nodes: [
          {
            id: 'node1',
            type: 'source',
            name: 'Node 1',
            sourceType: 'manual',
            config: {},
          },
          {
            id: 'node1', // Duplicate ID
            type: 'sink',
            name: 'Node 2',
            sinkType: 'log',
            config: {},
          },
        ],
        edges: [],
      };

      const result = validateGraphDefinition(duplicateGraph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate node id: node1');
    });

    it('should detect invalid edge references', () => {
      const invalidEdgeGraph: GraphDefinition = {
        id: 'test',
        name: 'Test',
        version: '1.0.0',
        nodes: [
          {
            id: 'node1',
            type: 'source',
            name: 'Node 1',
            sourceType: 'manual',
            config: {},
          },
        ],
        edges: [{ id: 'edge1', from: 'node1', to: 'nonexistent' }],
      };

      const result = validateGraphDefinition(invalidEdgeGraph);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Edge edge1 references unknown 'to' node: nonexistent");
    });
  });

  describe('hasCycles', () => {
    it('should detect cycles in graph', () => {
      const cyclicGraph: GraphDefinition = {
        id: 'cyclic',
        name: 'Cyclic Graph',
        version: '1.0.0',
        nodes: [
          { id: 'A', type: 'transform', name: 'A', transformFunction: '', outputSchema: {} },
          { id: 'B', type: 'transform', name: 'B', transformFunction: '', outputSchema: {} },
          { id: 'C', type: 'transform', name: 'C', transformFunction: '', outputSchema: {} },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B' },
          { id: 'e2', from: 'B', to: 'C' },
          { id: 'e3', from: 'C', to: 'A' }, // Creates cycle
        ],
      };

      expect(hasCycles(cyclicGraph)).toBe(true);
    });

    it('should not detect cycles in DAG', () => {
      const dagGraph: GraphDefinition = {
        id: 'dag',
        name: 'DAG Graph',
        version: '1.0.0',
        nodes: [
          { id: 'A', type: 'transform', name: 'A', transformFunction: '', outputSchema: {} },
          { id: 'B', type: 'transform', name: 'B', transformFunction: '', outputSchema: {} },
          { id: 'C', type: 'transform', name: 'C', transformFunction: '', outputSchema: {} },
        ],
        edges: [
          { id: 'e1', from: 'A', to: 'B' },
          { id: 'e2', from: 'A', to: 'C' },
          { id: 'e3', from: 'B', to: 'C' },
        ],
      };

      expect(hasCycles(dagGraph)).toBe(false);
    });
  });

  describe('validateNodeConfig', () => {
    it('should validate source node config', () => {
      const sourceNode = {
        id: 'source',
        type: 'source',
        name: 'Source Node',
        sourceType: 'manual',
        config: {},
      };

      const result = validateNodeConfig(sourceNode as any);
      expect(result.valid).toBe(true);
    });

    it('should validate transform node config', () => {
      const transformNode = {
        id: 'transform',
        type: 'transform',
        name: 'Transform Node',
        transformFunction: 'return data',
        outputSchema: {},
      };

      const result = validateNodeConfig(transformNode as any);
      expect(result.valid).toBe(true);
    });

    it('should detect missing required fields for node types', () => {
      const invalidTransform = {
        id: 'transform',
        type: 'transform',
        name: 'Transform Node',
        // Missing transformFunction
      };

      const result = validateNodeConfig(invalidTransform as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Transform node must have a transformFunction');
    });

    it('should validate aggregate node config', () => {
      const aggregateNode = {
        id: 'aggregate',
        type: 'aggregate',
        name: 'Aggregate Node',
        windowType: 'time',
        windowSize: 1000,
        aggregateFunction: 'return values',
        emitStrategy: 'onComplete',
      };

      const result = validateNodeConfig(aggregateNode as any);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDataPacket', () => {
    it('should validate correct data packet', () => {
      const packet = {
        id: 'packet-1',
        timestamp: Date.now(),
        data: { value: 42 },
      };

      expect(validateDataPacket(packet)).toBe(true);
    });

    it('should reject invalid data packets', () => {
      expect(validateDataPacket(null)).toBeFalsy();
      expect(validateDataPacket(undefined)).toBeFalsy();
      expect(validateDataPacket({})).toBe(false);
      expect(validateDataPacket({ id: 'test' })).toBe(false);
      expect(
        validateDataPacket({
          id: 'test',
          timestamp: 'not-a-number',
          data: {},
        })
      ).toBe(false);
    });

    it('should accept packets with metadata', () => {
      const packet = {
        id: 'packet-1',
        timestamp: Date.now(),
        data: { value: 42 },
        metadata: { source: 'test' },
      };

      expect(validateDataPacket(packet)).toBe(true);
    });
  });

  describe('validateFunctionSyntax', () => {
    it('should validate correct function syntax', () => {
      const validFunctions = [
        'return data',
        'return { ...data, processed: true }',
        'const x = data.value * 2; return { result: x }',
        'if (data.value > 0) return data; else return null',
      ];

      validFunctions.forEach((fn) => {
        const result = validateFunctionSyntax(fn);
        expect(result.valid).toBe(true);
      });
    });

    it('should detect invalid function syntax', () => {
      const invalidFunctions = ['return data {', 'this is not javascript', 'return (]', 'const x = '];

      invalidFunctions.forEach((fn) => {
        const result = validateFunctionSyntax(fn);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should handle multi-line functions', () => {
      const multiLine = `
        const sum = data.values.reduce((a, b) => a + b, 0);
        const avg = sum / data.values.length;
        return { sum, average: avg };
      `;

      const result = validateFunctionSyntax(multiLine);
      expect(result.valid).toBe(true);
    });
  });
});
