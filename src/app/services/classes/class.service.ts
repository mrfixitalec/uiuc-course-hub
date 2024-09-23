import { Injectable } from '@angular/core';
import { ClassData } from 'src/app/shared/class/class';
import { collection, Firestore, onSnapshot, query, where, getDocs } from '@angular/fire/firestore';
import { Observable, ReplaySubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ClassService {
    private _classes: ReplaySubject<ClassData[]> = new ReplaySubject()
    public classes: Observable<ClassData[]> = this._classes.asObservable()

    constructor(
        private afs: Firestore,
    ) {
        const ref = collection(this.afs, 'Class')
        const unsubscribe = onSnapshot(ref, (querySnapshot) => {
            const classes: ClassData[] = [];
            querySnapshot.forEach((doc) => {
                var data = doc.data()
                data['courseId'] = doc.id
                classes.push(data as ClassData);
            });
            this._classes.next(classes)
        });
    }
    async getCoursesByDepartment(department: string): Promise<ClassData[]> {
        const ref = collection(this.afs, 'Class');
        const q = query(ref, where('Department', '==', department));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data() as ClassData;
            data.courseId = doc.id;
            return data;
        });
    }
}
