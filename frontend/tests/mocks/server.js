/**
 * MSW Server Setup
 *
 * Creates a mock server for testing API calls
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create server with default handlers
export const server = setupServer(...handlers);

export default server;
