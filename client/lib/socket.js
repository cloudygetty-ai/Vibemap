/**
 * Shared Socket.io client singleton.
 *
 * Importing this module from multiple components gives them the same connection,
 * so only one WebSocket is opened per browser tab regardless of how many
 * components import it.
 */
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SERVER_URL);

export default socket;
