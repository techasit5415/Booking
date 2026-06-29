export interface Room {
	id: string;
	name: string;
	location?: string;
}

export interface RoomItem {
	name: string;
	location: string;
	booking_url: string;
}
