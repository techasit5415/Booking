export interface Booking {
	id: string;
	title: string;
	start_time: string;
	end_time: string;
	date?: string;
	status: string;
	field: string;
	bookerName?: string;
	bookerEmail?: string;
	booker_email?: string;
	detailLabel?: string;
}

export interface BookingItem {
	id: string;
	title: string;
	detailLabel: string;
	startTime: string;
	startEpoch?: number | null;
	endTime: string;
	endEpoch?: number | null;
	status: 'confirmed' | 'pending' | 'cancelled';
	bookerName: string;
	bookerEmail?: string;
	booker_email?: string;
}
