import { DayOfWeek } from './types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
];

export const DAYS_SHORT: Record<DayOfWeek, string> = {
    MONDAY: 'Mon',
    TUESDAY: 'Tue',
    WEDNESDAY: 'Wed',
    THURSDAY: 'Thu',
    FRIDAY: 'Fri',
    SATURDAY: 'Sat',
    SUNDAY: 'Sun'
};

export const LESSON_COLORS = [
    '#FFD3B6', '#DCEDC8', '#FFD180', '#FFECB3', '#CFD8DC',
    '#B3E5FC', '#B2DFDB', '#C8E6C9', '#F8BBD0', '#E1BEE7',
    '#D1C4E9', '#BBDEFB'
];