export interface IUser {
	id: string;
	uid: string;
	firstName: string;
	lastName: string;
	email: string;
	password?: string;
	rads: number;
	role: Roles;
	image: string;
	createdAt: string;
	teamId?: string;
	team?: ITeam;
	// firstPersons: Array<IPerson>;
	// thirdPersons: Array<IPerson>;
	guestCoffee: Array<ICoffee>;
	hostCoffee: Array<ICoffee>;
}

export interface ITeam {
	id: string;
	name: string;
	createdAt: string;
}

export interface ICoffee {
	id: string;
	date?: Date;
	description: string;
	drank: boolean;
	guestId: string;
	guest: IUser;
	hostId: string;
	host: IUser;
}

export interface INotification {
	Icon: string;
	Description: string;
}

// pending
export interface ICause {
	Users: IUser[];
}

export interface IRads {
	id: string;
	rads: number;
	senderId: string;
	sender: IUserCommunity;
	receiverId: string;
	receiver: IUserCommunity;
}

export interface ICycle {
	id: string;
	closed: boolean;
	startDate: Date;
	endDate: Date;
	rads: number;
	duration: CycleDuration;
	status: CycleStatus;
	communityId: string;
	community: ICommunity;
}

export interface ICommunity {
	id: string;
	name: string;
	description: string;
	image: string;
	members: Array<IUserCommunity>;
	total: number;
	cycle: ICycle;
}

export interface IUserCommunity {
	id: string;
	userId: string;
	communityId: string;
	user: IUser;
	community: ICommunity;
	radsSent: Array<IRads>;
	radsReceived: Array<IRads>;
}

export interface IInvite {
	id: string;
	createdAt: Date;
	inviterId: string;
	inviter: IUser;
	inviteeId: string;
	invitee: IUser;
	communityId: string;
	community: ICommunity;
}

export interface IRecognition {
	total: number;
	senderId: string;
	receiverId: string;
}

export interface IRecognitionMessage {
	note: string;
	senderId: string;
	receiverId: string;
	emotionType: EmotionType;
}

// not a table i db
export interface IUsersRads {
	UserId: string;
	Rads: number;
}

export enum Roles {
	User = "user",
	Admin = "admin",
	SuperAdmin = "superAdmin",
}

let RoleDisplayName: { [index: string]: string } = {};
RoleDisplayName[Roles.User] = "User";
RoleDisplayName[Roles.Admin] = "Admin";
RoleDisplayName[Roles.SuperAdmin] = "Super Admin";
export default RoleDisplayName;

export enum NotificationType {
	Talk,
	Invite,
	Recognition,
}

export enum CycleDuration {
	Weekly,
	Biweekly,
	Monthly,
	Daily,
}

export enum CycleStatus {
	Done,
	Current,
	Next,
}

export interface IDashboard {
	cyclesTotal: number;
	radsReceivedTotal: number;
	recognitionsSent: number;
	recognitionsReceived: number;
	recognitionsSentPercentage: number;
	highestInteraction: {
		total: number;
		user: IUser;
		member: IUser;
	};
}

export interface IPoll {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	keyToChange: ChangeType;
	oldValue: string;
	newValue: string;
	description: string;
	startDate: Date;
	endDate: Date;
	ongoing: boolean;
	communityId: string;
	community: ICommunity;
	votes: Array<IVote>;
}

export interface IPollViewModel {
	id: string;
	description: string;
	communityId: string;
	userId: string;
	key: ChangeType;
	oldValue: string;
	newValue: string;
}

export interface IVote {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	voted: VoteStatus;
	pollId: string;
	poll: IPoll;
	userId: string;
	user: IUser;
}

export enum VoteStatus {
	Pending,
	Yes,
	No,
}

export enum ChangeType {
	Name,
	Description,
	Image,
	CycleDuration,
	CycleRads,
}

export interface CommunityLog {
	id: string;
	createdAt: Date;
	oldValue: string;
	newValue: string;
	type: ChangeType;
	communityId: string;
	community: ICommunity;
	userId: string;
	user: IUser;
}

export enum EmotionType {
	Gratitude,
	Support,
	Inspired,
	Happiness,
}
