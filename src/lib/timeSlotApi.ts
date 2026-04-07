import apiClient from './api';
import { TimeSlot } from './types';

export const timeSlotApi = {
    getTimeSlots: async (): Promise<TimeSlot[]> => {
        const response = await apiClient.get<TimeSlot[]>('/api/time-slots');
        return response.data;
    },
};