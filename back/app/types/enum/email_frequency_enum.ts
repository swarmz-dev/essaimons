export enum EmailFrequencyEnum {
    INSTANT = 'instant', // Send immediately (default for admins/critical notifications)
    HOURLY = 'hourly', // Batch and send once per hour
    DAILY = 'daily', // Batch and send once per day
    WEEKLY = 'weekly', // Batch and send once per week
}
