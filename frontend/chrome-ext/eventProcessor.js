// Shared event processing utilities for rrweb recording
// Used by both main page and iframe recording

// Make functions available globally for iframe usage
if (typeof window !== 'undefined') {
  window.TestChimpEventProcessor = {};
}

/**
 * Process rrweb events to filter out problematic attributes and optimize for replay
 * @param {Object} event - The rrweb event to process
 * @param {string} context - Context identifier for logging (e.g., 'MAIN' or 'IFRAME')
 * @returns {Object|null} - Processed event or null if filtered out
 */
function processEvent(event, context = 'MAIN') {
  if (event.type === 2) return event;

  // Filter out problematic attributes that can cause replay issues
  if (event.type === 3 && event.data.source === 0 && event.data.attributes?.length > 0) {
    const filteredAttributes = event.data.attributes.filter(attr => {
      const isTransform = attr.attributes?.style?.transform || attr.attributes?.transform;
      const isAnimation = attr.attributes?.style?.animation || attr.attributes?.animation;
      const isTransition = attr.attributes?.style?.transition || attr.attributes?.transition;
      
      // Filter out transform, animation, and transition properties that can cause replay issues
      if (isTransform || isAnimation || isTransition) {
        return false;
      }
      
      // Filter out verbose CSS properties and attributes
      if (attr.attributes?.style) {
        const style = attr.attributes.style;
        
        // Filter out CSS properties containing data URLs (SVG icons, images, etc.)
        for (const [key, value] of Object.entries(style)) {
          if (typeof value === 'string') {
            // Filter out data URLs (any property with data:image, data:svg, etc.)
            if (value.includes('data:image') || value.includes('data:svg')) {
              console.log(`[${context}] Filtering out CSS property with data URL: ${key}`);
              return false;
            }
            
            // Filter out base64 encoded content
            if (value.includes('base64,') && value.length > 200) {
              console.log(`[${context}] Filtering out CSS property with base64 content: ${key}`);
              return false;
            }
            
            // Filter out very long CSS values (likely verbose data)
            if (value.length > 500) {
              console.log(`[${context}] Filtering out long CSS property: ${key} (${value.length} chars)`);
              return false;
            }
            
            // Filter out CSS with excessive whitespace or repeated patterns
            if (value.length > 100 && (value.match(/\s{10,}/) || value.match(/(.{20,})\1{3,}/))) {
              console.log(`[${context}] Filtering out CSS property with excessive whitespace/repetition: ${key}`);
              return false;
            }
          }
        }
      }
      
      // Filter out verbose non-style attributes
      for (const [key, value] of Object.entries(attr.attributes || {})) {
        if (typeof value === 'string') {
          // Filter out data attributes with large values
          if (key.startsWith('data-') && value.length > 200) {
            console.log(`[${context}] Filtering out verbose data attribute: ${key} (${value.length} chars)`);
            return false;
          }
          
          // Filter out attributes with base64 content
          if (value.includes('base64,') && value.length > 100) {
            console.log(`[${context}] Filtering out attribute with base64 content: ${key}`);
            return false;
          }
          
          // Filter out very long attribute values
          if (value.length > 1000) {
            console.log(`[${context}] Filtering out long attribute: ${key} (${value.length} chars)`);
            return false;
          }
          
          // Filter out attributes with excessive JSON-like data
          if (value.startsWith('{') && value.endsWith('}') && value.length > 300) {
            console.log(`[${context}] Filtering out verbose JSON-like attribute: ${key}`);
            return false;
          }
        }
      }
      
      return true;
    });

    if (filteredAttributes.length === 0) return null;

    return {
      ...event,
      data: {
        ...event.data,
        attributes: filteredAttributes
      }
    };
  }

  return event;
}

/**
 * Convert document nodes to spans to avoid DOM conflicts during replay
 * @param {Object} event - The rrweb event to process
 * @param {string} context - Context identifier for logging (e.g., 'MAIN' or 'IFRAME')
 * @returns {Object} - Event with document nodes converted to spans
 */
function convertDocumentNodesToSpans(event, context = 'MAIN') {
  if (!event || !event.data) return event;
  
  // Create a deep copy of the event to avoid modifying the original
  const convertedEvent = JSON.parse(JSON.stringify(event));
  let hasDocumentNodes = false;
  
  // Process FullSnapshot events
  if (convertedEvent.type === 2 && convertedEvent.data.node) {
    const originalNode = convertedEvent.data.node;
    convertedEvent.data.node = convertNode(convertedEvent.data.node, context);
    if (originalNode !== convertedEvent.data.node) {
      hasDocumentNodes = true;
    }
  }
  
  // Process IncrementalSnapshot events
  if (convertedEvent.type === 3 && convertedEvent.data) {
    // Process adds
    if (convertedEvent.data.adds) {
      convertedEvent.data.adds.forEach((add, index) => {
        if (add.node) {
          const originalNode = add.node;
          add.node = convertNode(add.node, context);
          if (originalNode !== add.node) {
            hasDocumentNodes = true;
            console.log(`[${context}] Converted document node in adds[${index}]`);
          }
        }
      });
    }
    
    // Also check for document nodes in other parts of the event
    if (convertedEvent.data.removes) {
      convertedEvent.data.removes.forEach((remove, index) => {
        if (remove.node && remove.node.type === 11) {
          console.log(`[${context}] Found document node in removes[${index}], converting`);
          remove.node = convertNode(remove.node, context);
          hasDocumentNodes = true;
        }
      });
    }
  }
  
  if (hasDocumentNodes) {
    console.log(`[${context}] Converted document nodes in event type ${convertedEvent.type}`);
  }
  
  return convertedEvent;
}

/**
 * Convert document nodes to spans (only top-level, no recursion)
 * @param {Object} node - The node to convert
 * @param {string} context - Context identifier for logging
 * @returns {Object} - Converted node
 */
function convertNode(node, context = 'MAIN') {
  if (!node) return node;
  
  // Convert document nodes (type 11) to span elements (type 1)
  if (node.type === 11) {
    console.log(`[${context}] Converting document node to span`);
    return {
      type: 1, // Element
      id: node.id,
      tagName: 'span',
      attributes: {
        'data-rrweb-document-node': 'true',
        'data-original-type': 'document'
      },
      childNodes: node.childNodes || []
    };
  }
  
  return node;
}

/**
 * Process an event with both filtering and document node conversion
 * @param {Object} event - The rrweb event to process
 * @param {string} context - Context identifier for logging
 * @returns {Object|null} - Fully processed event or null if filtered out
 */
function processAndConvertEvent(event, context = 'MAIN') {
  const processedEvent = processEvent(event, context);
  if (!processedEvent) {
    console.log(`[${context}] Event filtered out by processEvent`);
    return null;
  }
  
  return convertDocumentNodesToSpans(processedEvent, context);
}

// Export for ES modules
export { processEvent, convertDocumentNodesToSpans, processAndConvertEvent };

// Make available globally for iframe usage
if (typeof window !== 'undefined') {
  window.TestChimpEventProcessor = {
    processEvent,
    convertDocumentNodesToSpans,
    processAndConvertEvent
  };
}
