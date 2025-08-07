import { describe, it, expect, beforeEach } from 'vitest';
import { TransformNode } from '../../nodes/TransformNode';
import { DataPacket } from '../../core/types';

describe('TransformNode', () => {
  let node: TransformNode;

  beforeEach(() => {
    node = new TransformNode({
      id: 'transform-node',
      type: 'transform',
      name: 'Test Transform',
      transformFunction: `
        return {
          ...data,
          doubled: data.value * 2,
          timestamp: Date.now()
        }
      `,
      outputSchema: {}
    });
  });

  describe('transformation', () => {
    it('should apply transformation function', async () => {
      await node.initialize();
      await node.start();

      const packet: DataPacket = {
        id: 'test-packet',
        timestamp: Date.now(),
        data: { value: 21 }
      };

      const processedPacket = await (node as any).processPacket(packet);
      
      expect(processedPacket).toBeDefined();
      expect(processedPacket.data.doubled).toBe(42);
      expect(processedPacket.data.value).toBe(21);

      await node.stop();
    });

    it('should handle complex transformations', async () => {
      const complexNode = new TransformNode({
        id: 'complex-transform',
        type: 'transform',
        name: 'Complex Transform',
        transformFunction: `
          const sum = data.numbers.reduce((a, b) => a + b, 0);
          const avg = sum / data.numbers.length;
          return {
            sum,
            average: avg,
            count: data.numbers.length,
            min: Math.min(...data.numbers),
            max: Math.max(...data.numbers)
          }
        `,
        outputSchema: {}
      });

      await complexNode.initialize();
      await complexNode.start();

      const packet: DataPacket = {
        id: 'complex-packet',
        timestamp: Date.now(),
        data: { numbers: [1, 2, 3, 4, 5] }
      };

      const result = await (complexNode as any).processPacket(packet);
      
      expect(result.data.sum).toBe(15);
      expect(result.data.average).toBe(3);
      expect(result.data.count).toBe(5);
      expect(result.data.min).toBe(1);
      expect(result.data.max).toBe(5);

      await complexNode.stop();
    });

    it('should handle async transformations', async () => {
      const asyncNode = new TransformNode({
        id: 'async-transform',
        type: 'transform',
        name: 'Async Transform',
        transformFunction: `
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ ...data, async: true });
            }, 10);
          });
        `,
        outputSchema: {}
      });

      await asyncNode.initialize();
      await asyncNode.start();

      const packet: DataPacket = {
        id: 'async-packet',
        timestamp: Date.now(),
        data: { value: 'test' }
      };

      const result = await (asyncNode as any).processPacket(packet);
      
      expect(result.data.async).toBe(true);
      expect(result.data.value).toBe('test');

      await asyncNode.stop();
    });

    it('should handle transformation errors', async () => {
      const errorNode = new TransformNode({
        id: 'error-transform',
        type: 'transform',
        name: 'Error Transform',
        transformFunction: `
          if (data.shouldError) {
            throw new Error('Transformation error');
          }
          return data;
        `,
        outputSchema: {}
      });

      await errorNode.initialize();
      await errorNode.start();

      const packet: DataPacket = {
        id: 'error-packet',
        timestamp: Date.now(),
        data: { shouldError: true }
      };

      const result = await (errorNode as any).processPacket(packet);
      
      // Should return packet with error property
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Transformation error');

      await errorNode.stop();
    });

    it('should preserve metadata', async () => {
      await node.initialize();
      await node.start();

      const packet: DataPacket = {
        id: 'metadata-packet',
        timestamp: Date.now(),
        data: { value: 10 },
        metadata: {
          source: 'test',
          priority: 'high'
        }
      };

      const result = await (node as any).processPacket(packet);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.source).toBe('test');
      expect(result.metadata.priority).toBe('high');
      expect(result.metadata.transformedBy).toBe('transform-node');

      await node.stop();
    });
  });

  describe('function compilation', () => {
    it('should handle invalid function syntax', async () => {
      const invalidNode = new TransformNode({
        id: 'invalid-transform',
        type: 'transform',
        name: 'Invalid Transform',
        transformFunction: 'this is not valid javascript {',
        outputSchema: {}
      });

      await expect(invalidNode.initialize()).rejects.toThrow();
    });

    it('should access metadata in transform function', async () => {
      const metadataNode = new TransformNode({
        id: 'metadata-transform',
        type: 'transform',
        name: 'Metadata Transform',
        transformFunction: `
          return {
            ...data,
            hasHighPriority: metadata?.priority === 'high'
          }
        `,
        outputSchema: {}
      });

      await metadataNode.initialize();
      await metadataNode.start();

      const packet: DataPacket = {
        id: 'test-packet',
        timestamp: Date.now(),
        data: { value: 1 },
        metadata: { priority: 'high' }
      };

      const result = await (metadataNode as any).processPacket(packet);
      
      expect(result.data.hasHighPriority).toBe(true);

      await metadataNode.stop();
    });
  });
});