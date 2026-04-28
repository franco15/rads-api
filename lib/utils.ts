import { CycleDuration, EmotionType } from "./interfaces";

export function addDays(days: number, date = new Date()) {
	// const dateCopy = new Date(date.getTime());
	// dateCopy.setDate(dateCopy.getDate() + days);
	// return dateCopy;
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// gets the monday of the week of the date passed
export function getMonday(date: Date) {
	date = new Date(date);
	const day = date.getDay(),
		diff = date.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
	return new Date(date.setDate(diff));
}

export function getCycleDates(date: Date, duration: CycleDuration) {
	date.setHours(0, 0, 0, 0);
	let startDate = getMonday(date);
	let endDate = addDays(7, startDate);
	switch (duration) {
		// case CycleDuration.Weekly:
		// 	break;
		case CycleDuration.Biweekly:
			startDate = getMonday(date);
			endDate = addDays(14, startDate);
			break;
		case CycleDuration.Monthly:
			startDate = new Date(date.getFullYear(), date.getMonth(), 1);
			endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
			// endDate.setHours(23, 59, 59, 999);
			// //handle if month is december
			// if (date.getMonth() == 11) {
			// 	endDate.setFullYear(date.getFullYear() + 1);
			// }
			break;
	}
	return {
		startDate,
		endDate,
	};
}

export function getDaysDifference(startDate: Date, endDate: Date) {
	const diffMs = endDate.getTime() - startDate.getTime();
	const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	return diffDays;
}

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const getEmotionTypeKey = (value: any) => {
	return Object.keys(EmotionType).find(
		(key) => EmotionType[key as any] === value
	);
};

export const Months = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
