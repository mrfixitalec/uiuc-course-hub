export interface User {
    uid: string,
    email?: string,
    displayName?: string,
    photoUrl?: string,
    emailVerified?: boolean,
}

export interface FbUser extends firebase.default.User{
    firstName?: string,
    lastName?: string,
    firstSemester?: string,
    reviewFeedback?: {[key: string]: boolean}
}