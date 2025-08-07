import { BaseNode } from '@/nodes/BaseNode';
/**
 * Filter node - filters data packets based on conditions
 */
export class FilterNode extends BaseNode {
    filterFn;
    async onInitialize() {
        // Compile the filter function
        try {
            // Create a safe function from the string
            // In production, this should use a sandboxed environment
            this.filterFn = new Function('data', 'metadata', this.config.filterFunction);
        }
        catch (error) {
            throw new Error(`Failed to compile filter function: ${error}`);
        }
    }
    async onStart() {
        // No special start logic needed
    }
    async onPause() {
        // No special pause logic needed
    }
    async onResume() {
        // No special resume logic needed
    }
    async onStop() {
        // No special stop logic needed
    }
    async processPacket(packet) {
        if (!this.filterFn) {
            throw new Error('Filter function not initialized');
        }
        try {
            // Apply the filter
            const shouldPass = await Promise.resolve(this.filterFn(packet.data, packet.metadata));
            if (shouldPass) {
                // Add filter metadata and pass through
                return {
                    ...packet,
                    metadata: {
                        ...packet.metadata,
                        filteredBy: this.config.id,
                        filteredAt: Date.now(),
                    },
                };
            }
            else {
                // Packet filtered out
                this.metrics.packetsDropped++;
                return null;
            }
        }
        catch (error) {
            // On error, pass the packet through with error info
            return {
                ...packet,
                error: error,
                metadata: {
                    ...packet.metadata,
                    filterError: this.config.id,
                    errorAt: Date.now(),
                },
            };
        }
    }
}
/**
 * Pre-built filter functions
 */
export class FilterFunctions {
    /**
     * Filter by amount threshold
     */
    static byAmount(operator, threshold) {
        return `
      const amount = data.amount || 0;
      switch ('${operator}') {
        case 'greater':
          return amount > ${threshold};
        case 'less':
          return amount < ${threshold};
        case 'equals':
          return amount === ${threshold};
        default:
          return false;
      }
    `;
    }
    /**
     * Filter by date range
     */
    static byDateRange(startDate, endDate) {
        return `
      const date = new Date(data.timestamp || data.date);
      const dateMs = date.getTime();
      
      ${startDate ? `const start = new Date('${startDate}').getTime();` : 'const start = 0;'}
      ${endDate ? `const end = new Date('${endDate}').getTime();` : 'const end = Date.now();'}
      
      return dateMs >= start && dateMs <= end;
    `;
    }
    /**
     * Filter by field existence
     */
    static hasField(field) {
        return `
      return data.${field} !== undefined && data.${field} !== null;
    `;
    }
    /**
     * Filter by field value
     */
    static byFieldValue(field, value) {
        return `
      return data.${field} === ${JSON.stringify(value)};
    `;
    }
    /**
     * Filter by regex pattern
     */
    static byPattern(field, pattern, flags = 'i') {
        return `
      const value = String(data.${field} || '');
      const regex = new RegExp('${pattern}', '${flags}');
      return regex.test(value);
    `;
    }
    /**
     * Filter by multiple conditions (AND)
     */
    static and(conditions) {
        return `
      const conditions = [
        ${conditions.map((c) => `(${c})`).join(',\n        ')}
      ];
      return conditions.every(c => c);
    `;
    }
    /**
     * Filter by multiple conditions (OR)
     */
    static or(conditions) {
        return `
      const conditions = [
        ${conditions.map((c) => `(${c})`).join(',\n        ')}
      ];
      return conditions.some(c => c);
    `;
    }
    /**
     * Filter out errors
     */
    static noErrors() {
        return `
      return !data.error && !metadata?.error;
    `;
    }
    /**
     * Filter for specific categories
     */
    static byCategory(categories) {
        return `
      const category = data.category || metadata?.category;
      return ${JSON.stringify(categories)}.includes(category);
    `;
    }
    /**
     * Rate limiting filter
     */
    static rateLimit(maxPerSecond) {
        return `
      // This would need state management in practice
      const now = Date.now();
      const lastEmit = metadata?.lastEmit || 0;
      const minInterval = 1000 / ${maxPerSecond};
      
      return (now - lastEmit) >= minInterval;
    `;
    }
    /**
     * Sample filter (only pass X% of packets)
     */
    static sample(percentage) {
        return `
      return Math.random() < ${percentage / 100};
    `;
    }
    /**
     * Deduplicate by field
     */
    static deduplicate(field) {
        return `
      // This would need state management to track seen values
      // For now, we'll pass all through with a warning
      console.warn('Deduplication requires state management');
      return true;
    `;
    }
}
