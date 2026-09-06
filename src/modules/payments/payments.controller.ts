import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess, sendError } from '../../utils/response';
import { PaymentsService } from './payments.service';

export const PaymentsController = {
    initiate: catchAsync(async (req: Request, res: Response) => {
        const result = await PaymentsService.initiate(req.user!.userId, req.body.invoiceId);
        sendSuccess(res, { statusCode: 201, message: 'Payment session created', data: result });
    }),

    // Raw body is required here for Stripe signature verification - see app.ts
    // where this route is mounted with express.raw() BEFORE the JSON parser.
    webhook: async (req: Request, res: Response) => {
        const signature = req.headers['stripe-signature'] as string;
        try {
            await PaymentsService.handleWebhookEvent(req.body, signature);
            res.status(200).json({ received: true });
        } catch (err: any) {
            sendError(res, 400, err.message || 'Webhook error');
        }
    },

    getStatus: catchAsync(async (req: Request, res: Response) => {
        const isAdmin = req.user!.role === 'ADMIN';
        const payment = await PaymentsService.getStatus(req.user!.userId, isAdmin, req.params.id);
        sendSuccess(res, { message: 'Payment status fetched successfully', data: payment });
    }),

    myPayments: catchAsync(async (req: Request, res: Response) => {
        const payments = await PaymentsService.myPayments(req.user!.userId);
        sendSuccess(res, { message: 'Your payments fetched successfully', data: payments });
    }),

    successRedirect: (req: Request, res: Response) => {
        sendSuccess(res, { message: 'Payment completed. Thank you!', data: { invoiceId: req.query.invoiceId } });
    },

    cancelRedirect: (req: Request, res: Response) => {
        sendError(res, 200, 'Payment was cancelled.', []);
    },
};
