import { BaseNode } from '@/nodes/BaseNode';
/**
 * Transform node - transforms data packets
 */
export class TransformNode extends BaseNode {
    transformFn;
    async onInitialize() {
        // Compile the transform function
        try {
            // Create a safe function from the string
            // In production, this should use a sandboxed environment
            this.transformFn = new Function('data', 'metadata', this.config.transformFunction);
        }
        catch (error) {
            throw new Error(`Failed to compile transform function: ${error}`);
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
        if (!this.transformFn) {
            throw new Error('Transform function not initialized');
        }
        try {
            // Apply the transformation
            const transformedData = await Promise.resolve(this.transformFn(packet.data, packet.metadata));
            // Validate against schema if provided
            if (this.config.outputSchema) {
                // TODO: Add JSON schema validation
                // This would use a library like ajv
            }
            // Return transformed packet
            return {
                ...packet,
                data: transformedData,
                metadata: {
                    ...packet.metadata,
                    transformedBy: this.config.id,
                    transformedAt: Date.now(),
                },
            };
        }
        catch (error) {
            // Add error to packet and pass it through
            return {
                ...packet,
                error: error,
                metadata: {
                    ...packet.metadata,
                    errorNode: this.config.id,
                    errorAt: Date.now(),
                },
            };
        }
    }
}
/**
 * Pre-built transform functions
 */
export class TransformFunctions {
    /**
     * Extract specific fields from data
     */
    static extractFields(fields) {
        return `
      const result = {};
      for (const field of ${JSON.stringify(fields)}) {
        if (field.includes('.')) {
          // Handle nested fields
          const parts = field.split('.');
          let value = data;
          for (const part of parts) {
            value = value?.[part];
          }
          result[field] = value;
        } else {
          result[field] = data[field];
        }
      }
      return result;
    `;
    }
    /**
     * Add timestamp to data
     */
    static addTimestamp() {
        return `
      return {
        ...data,
        timestamp: Date.now()
      };
    `;
    }
    /**
     * Convert currency amounts (pence to pounds)
     */
    static convertCurrency(field = 'amount') {
        return `
      return {
        ...data,
        ${field}: data.${field} / 100,
        ${field}_original: data.${field}
      };
    `;
    }
    /**
     * Filter by field value
     */
    static filterByValue(field, operator, value) {
        return `
      const fieldValue = data.${field};
      let passes = false;
      
      switch ('${operator}') {
        case 'equals':
          passes = fieldValue === ${JSON.stringify(value)};
          break;
        case 'not_equals':
          passes = fieldValue !== ${JSON.stringify(value)};
          break;
        case 'greater_than':
          passes = fieldValue > ${JSON.stringify(value)};
          break;
        case 'less_than':
          passes = fieldValue < ${JSON.stringify(value)};
          break;
        case 'contains':
          passes = String(fieldValue).includes(${JSON.stringify(value)});
          break;
        case 'in':
          passes = ${JSON.stringify(value)}.includes(fieldValue);
          break;
      }
      
      return passes ? data : null;
    `;
    }
    /**
     * Enrich with additional data
     */
    static enrich(enrichmentData) {
        return `
      return {
        ...data,
        enrichment: ${JSON.stringify(enrichmentData)},
        enrichedAt: Date.now()
      };
    `;
    }
    /**
     * Calculate running average
     */
    static calculateRunningAverage(field) {
        return `
      // This would need state management in practice
      const value = data.${field};
      const count = (metadata.count || 0) + 1;
      const previousAvg = metadata.average || 0;
      const newAverage = ((previousAvg * (count - 1)) + value) / count;
      
      return {
        ...data,
        average: newAverage,
        count: count
      };
    `;
    }
    /**
     * Format for output
     */
    static formatOutput(template) {
        return `
      // Simple template replacement
      let output = ${JSON.stringify(template)};
      
      for (const [key, value] of Object.entries(data)) {
        output = output.replace(new RegExp('{{' + key + '}}', 'g'), value);
      }
      
      return output;
    `;
    }
    /**
     * Categorize transactions
     */
    static categorizeTransaction() {
        return `
      const description = (data.description || '').toLowerCase();
      const amount = data.amount;
      
      let category = 'OTHER';
      
      // Income
      if (amount > 0) {
        if (description.includes('salary') || description.includes('wage')) {
          category = 'INCOME_SALARY';
        } else if (description.includes('refund')) {
          category = 'INCOME_REFUND';
        } else {
          category = 'INCOME_OTHER';
        }
      } 
      // Expenses
      else {
        if (description.includes('tesco') || description.includes('sainsbury') || description.includes('asda')) {
          category = 'EXPENSE_GROCERIES';
        } else if (description.includes('uber') || description.includes('taxi') || description.includes('transport')) {
          category = 'EXPENSE_TRANSPORT';
        } else if (description.includes('netflix') || description.includes('spotify') || description.includes('subscription')) {
          category = 'EXPENSE_SUBSCRIPTION';
        } else if (description.includes('restaurant') || description.includes('cafe') || description.includes('food')) {
          category = 'EXPENSE_DINING';
        } else {
          category = 'EXPENSE_OTHER';
        }
      }
      
      return {
        ...data,
        category,
        categorizedAt: Date.now()
      };
    `;
    }
}
