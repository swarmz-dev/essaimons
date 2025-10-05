import { HttpContext } from '@adonisjs/core/http';
import transmit from '@adonisjs/transmit/services/main';

export default class DebugTransmitController {
    async listSubscriptions({ response }: HttpContext) {
        // Try to access internal state if available
        const subscriptions = (transmit as any)._transport?.subscriptions || {};

        return response.ok({
            message: 'Active Transmit subscriptions',
            subscriptions: Object.keys(subscriptions),
            count: Object.keys(subscriptions).length,
        });
    }

    async testBroadcast({ request, response }: HttpContext) {
        const { channel } = request.qs();

        if (!channel) {
            return response.badRequest({ error: 'Channel query parameter required' });
        }

        const payload = {
            type: 'test',
            message: 'Test broadcast from debug endpoint',
            timestamp: new Date().toISOString(),
        };

        await transmit.broadcast(channel, payload);

        return response.ok({
            message: `Test broadcast sent to channel: ${channel}`,
            payload,
        });
    }
}
