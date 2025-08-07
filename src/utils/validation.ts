import { GraphDefinition, NodeConfig, DataPacket } from '@/core/types';

/**
 * Validate a graph definition
 */
export function validateGraphDefinition(definition: GraphDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!definition.id) {
    errors.push('Graph definition must have an id');
  }
  if (!definition.name) {
    errors.push('Graph definition must have a name');
  }
  if (!definition.nodes || !Array.isArray(definition.nodes)) {
    errors.push('Graph definition must have a nodes array');
  }
  if (!definition.edges || !Array.isArray(definition.edges)) {
    errors.push('Graph definition must have an edges array');
  }

  // Validate nodes
  const nodeIds = new Set<string>();
  definition.nodes?.forEach((node: any, index: number) => {
    if (!node.id) {
      errors.push(`Node at index ${index} must have an id`);
    } else if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    } else {
      nodeIds.add(node.id);
    }

    if (!node.type) {
      const nodeIdentifier = node.id || `at index ${index}`;
      errors.push(`Node ${nodeIdentifier} must have a type`);
    }
    if (!node.name) {
      const nodeIdentifier = node.id || `at index ${index}`;
      errors.push(`Node ${nodeIdentifier} must have a name`);
    }
  });

  // Validate edges
  const edgeIds = new Set<string>();
  definition.edges?.forEach((edge, index) => {
    if (!edge.id) {
      errors.push(`Edge at index ${index} must have an id`);
    } else if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge id: ${edge.id}`);
    } else {
      edgeIds.add(edge.id);
    }

    if (!edge.from) {
      errors.push(`Edge ${edge.id} must have a 'from' node`);
    } else if (!nodeIds.has(edge.from)) {
      errors.push(`Edge ${edge.id} references unknown 'from' node: ${edge.from}`);
    }

    if (!edge.to) {
      errors.push(`Edge ${edge.id} must have a 'to' node`);
    } else if (!nodeIds.has(edge.to)) {
      errors.push(`Edge ${edge.id} references unknown 'to' node: ${edge.to}`);
    }
  });

  // Check for cycles (simple detection)
  if (hasCycles(definition)) {
    errors.push('Graph contains cycles');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a graph has cycles
 */
export function hasCycles(definition: GraphDefinition): boolean {
  const adjacency: Record<string, string[]> = {};

  // Build adjacency list
  definition.edges.forEach((edge) => {
    if (!adjacency[edge.from]) {
      adjacency[edge.from] = [];
    }
    adjacency[edge.from].push(edge.to);
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = adjacency[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of definition.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate a node configuration
 */
export function validateNodeConfig(config: NodeConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Node config must have an id');
  }
  if (!config.type) {
    errors.push('Node config must have a type');
  }
  if (!config.name) {
    errors.push('Node config must have a name');
  }

  // Type-specific validation
  switch (config.type) {
    case 'source':
      if (!('sourceType' in config)) {
        errors.push('Source node must have a sourceType');
      }
      break;
    case 'transform':
      if (!('transformFunction' in config)) {
        errors.push('Transform node must have a transformFunction');
      }
      break;
    case 'filter':
      if (!('filterFunction' in config)) {
        errors.push('Filter node must have a filterFunction');
      }
      break;
    case 'aggregate':
      if (!('aggregateFunction' in config)) {
        errors.push('Aggregate node must have an aggregateFunction');
      }
      if (!('windowType' in config)) {
        errors.push('Aggregate node must have a windowType');
      }
      break;
    case 'sink':
      if (!('sinkType' in config)) {
        errors.push('Sink node must have a sinkType');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a data packet
 */
export function validateDataPacket(packet: any): packet is DataPacket {
  return packet && typeof packet === 'object' && typeof packet.id === 'string' && typeof packet.timestamp === 'number' && 'data' in packet;
}

/**
 * Validate function syntax
 */
export function validateFunctionSyntax(functionString: string): { valid: boolean; error?: string } {
  try {
    new Function(functionString);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid function syntax',
    };
  }
}

export const validation = {
  validateGraphDefinition,
  validateNodeConfig,
  validateDataPacket,
  validateFunctionSyntax,
  hasCycles,
};
