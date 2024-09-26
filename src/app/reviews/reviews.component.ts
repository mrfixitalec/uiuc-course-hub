import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { ClassService } from '../services/classes/class.service';
import { ClassData, courseCategories, departments } from '../shared/class/class'; // Add `courseCategories` import
import { Review, ratingsToStrings } from '../shared/review/review';
import { Firestore, collection } from '@angular/fire/firestore';
import { DocumentData, getDocs, limit, orderBy, OrderByDirection, 
    query, QueryDocumentSnapshot, startAfter, where } from '@angular/fire/firestore';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

interface FilterOption {
    value: string;
    view: string;
  }

@Component({
    selector: 'app-reviews',
    templateUrl: './reviews.component.html',
    styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit {
    constructor(
        private afs: Firestore,
        private auth: AuthService,
        private classService: ClassService,
    ) { 
        this.deptOptions = this.makeOptions(departments);
    }

    reviewData: Review[] = []
    latestDoc: any | null = null
    limit: number = 5
    pageLength: number = 55
    isLoggedIn: boolean = false
    noMore: boolean = false
    courses: ClassData[] = []
    courseId: string = ''
    public selectedDepartment: string = '';
    deptControl = new FormControl('');
    deptOptions: FilterOption[];
    filteredDeptOptions!: Observable<FilterOption[]>;
    orderByOptions = [
        { displayText: "Newest", field: "timestamp", order: "desc" },
        { displayText: "Oldest", field: "timestamp", order: "asc" },
    ]

    selectedSort: { displayText: string, field: string, order: string } = this.orderByOptions[0]
    selectedDepartmentFilter: ClassData[] | '' = ''


    ngOnInit(): void {
        this.auth.isLoggedIn.subscribe(state => { this.isLoggedIn = state })
        this.classService.getClassesByDepartment(this.selectedDepartment)
        this.classService.classes.subscribe(data => { this.courses = data })
        this.filteredDeptOptions = this.deptControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterDeptOptions(value!))
          );
        this.initLoad()
    }

    public onDepartmentChange(department: string): void {
        this.selectedDepartment = department;
        this.initLoad()
      }

    private _filterDeptOptions(value: string): FilterOption[] {
        const filterValue = value.toLowerCase();
        return this.deptOptions.filter(option => option.view.toLowerCase().includes(filterValue));
      }

    makeOptions(cats: string[]): FilterOption[] {
    return [{ value: '', view: '' }].concat(
        cats.map((a) => ({
        value: a,
        view: a.replace(/MCS |MCSDS /g, ''),
        }))
    );
    }

    initLoad() {
        this.latestDoc = null
        this.reviewData = []
        this.getMore()
    }

    updateReviewArray(docs: Array<QueryDocumentSnapshot<DocumentData>>) {
        for (let item of docs) {
            const review = item.data() as Review
            review.reviewId = item.id
            const course = this.courses.find(item => item.Department == review.Department)
            if (course) {
                review.classNumber = course.CourseNumber
            }
            this.reviewData.push(review)
        }
        this.reviewData = ratingsToStrings(this.reviewData)
    }

    async getMore() {
        const ref = collection(this.afs, 'Reviews')

        var q = query(ref)
        if (this.selectedDepartment) {
            q = query(q, where("Department", "==", this.selectedDepartment))
        }

        q = query(q,
            orderBy(this.selectedSort.field,
                this.selectedSort.order as
                OrderByDirection)
        )

        if (this.latestDoc) {
            q = query(q, startAfter(this.latestDoc))
        }

        q = query(q, limit(this.limit))
        const response = await getDocs(q)
        if (response.empty) {
            this.noMore = true
            return
        }
        var docs = response.docs as Array<QueryDocumentSnapshot<DocumentData>>
        this.noMore = docs.length < this.limit
        this.latestDoc = docs[docs.length - 1]
        this.updateReviewArray(docs)
    }
}
