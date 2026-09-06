import { Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { sendSuccess } from '../../utils/response';
import { RoommateService } from './roommate.service';

export const RoommateController = {
    upsertPreference: catchAsync(async (req: Request, res: Response) => {
        const pref = await RoommateService.upsertPreference(req.user!.userId, req.body);
        sendSuccess(res, { message: 'Roommate preference saved successfully', data: pref });
    }),

    myPreference: catchAsync(async (req: Request, res: Response) => {
        const pref = await RoommateService.myPreference(req.user!.userId);
        sendSuccess(res, { message: 'Preference fetched successfully', data: pref });
    }),

    findMatches: catchAsync(async (req: Request, res: Response) => {
        const matches = await RoommateService.findMatches(req.user!.userId);
        sendSuccess(res, { message: 'Roommate matches fetched successfully', data: matches });
    }),

    findMatchingRooms: catchAsync(async (req: Request, res: Response) => {
        const rooms = await RoommateService.findMatchingRooms(req.user!.userId);
        sendSuccess(res, { message: 'Matching rooms fetched successfully', data: rooms });
    }),
};
