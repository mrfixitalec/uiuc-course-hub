import { Component, OnInit } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { doc, getDoc, updateDoc, addDoc } from '@angular/fire/firestore';
import { collection, getDocs, query, where } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { ClassService } from 'src/app/services/classes/class.service';
import { ClassData, Difficulties, Ratings, Semesters, getRouterLink, departments as depts } from 'src/app/shared/class/class';
import { DialogReviewSubmission } from 'src/app/shared/dialog/review-submission/dialog-review-submission.component';
import { DialogReviewTooShort } from 'src/app/shared/dialog/review-too-short/dialog-review-too-short.component';
import { Review, SemesterYear } from 'src/app/shared/review/review';
import { FbUser } from 'src/app/shared/user/user';
import { Observable, startWith, map } from 'rxjs';
import Papa from 'papaparse';  // Install via npm: npm install papaparse

@Component({
    selector: 'app-create-review',
    templateUrl: './review-create.component.html',
    styleUrls: ['./review-create.component.scss']
})

export class CreateReviewComponent implements OnInit {
    headerText: string = "Create Review"
    reviewId: string = ""
    error: any
    loading: boolean = false
    submitted: boolean = false
    departments = depts
    filteredDepartments!: Observable<string[]>
    pros: string[] = ["test"]
    cons: string[] = []
    currentYear: number = (new Date()).getFullYear()
    years: number[] = [this.currentYear, this.currentYear - 1,
    this.currentYear - 2, this.currentYear - 3, this.currentYear - 4
    ]
    semesters: string[] = Semesters.reverse()
    semesterYears: SemesterYear[] = []
    difficulties = Difficulties
    ratings = Ratings
    profRatings = Ratings

    // reviewPlaceholder = 'The good:\n1.\n2.\n\nThe bad:\n1.\n2.\n\nDetailed Review:\nI highly recommend this course. Here\'s why:'
    // Unfortunately the html5 spec doesn't support multiline placeholders.
    reviewPlaceholder = 'Pros/Cons, Structure, Grading, Content, Support, etc...'
    profReviewPlaceholder = 'NOTE: professor data is not being displayed on the site yet. Comment on your professor\'s teaching style, availability, grading, etc...'

    courses: ClassData[] | undefined
    filteredCourses: ClassData[] | undefined;
    filteredClassNames: ClassData[] = [];
    filteredProfessors: string[] = []
    reviewForm: FormGroup = new FormGroup({})
    completedReviews: string[] = []
    userData: FbUser | undefined
    minRating: number = 1
    maxRating: number = 5
    minWorkload: number = 1
    maxWorkload: number = 168

    minReviewCharLength: number = 100
    recommendedWordCount: number = 100
    wordCountEnforced: boolean = false

    constructor(
        private classService: ClassService,
        private formBuilder: FormBuilder,
        private auth: AuthService,
        public dialog: MatDialog,
        private afs: Firestore,
        private router: Router,
        private route: ActivatedRoute,
    ) { }

    compareSemyear(o1: SemesterYear, o2: SemesterYear): boolean {
        return (o1.semester === o2.semester) && (o1.year === o2.year);
    }

    ngOnInit(): void {
        for (var i = 0; i < this.years.length; i++) {
          for (var j = 0; j < this.semesters.length; j++) {
            this.semesterYears.push({ year: this.years[i], semester: this.semesters[j] });
          }
        }

        this.reviewId = this.route.snapshot.paramMap.get('id') || ""
        
        this.reviewForm.get('Department')?.valueChanges.subscribe(department => {
            if (department) {
              this.fetchCoursesByDepartment(department);
            }
          });

        this.auth.userData.subscribe(data => {
            this.userData = data
            this.getUserReviews()
        }).unsubscribe()
        this.initializeReviewForm()
        this.loadReview()

        // Filter departments as user types
        this.filteredDepartments = this.reviewForm.controls['Department'].valueChanges.pipe(
            startWith(''),
            map(value => this._filterDepartments(value || ''))
        );
  
        // Update filtered courses based on selected department
        this.reviewForm.controls['Department'].valueChanges.subscribe(department => {
            this.filterCoursesByDepartment(department);
        });

        // Update filtered class names based on selected CourseNumber
        this.reviewForm.controls['CourseNumber'].valueChanges.subscribe(courseNum => {
            this.filterClassNamesByCourseNumber(courseNum);
            });
        
        // Update filtered professors based on semester year selection
        this.reviewForm.controls['semyear'].valueChanges.subscribe(sy => {
            this.filteredProfessors = [];
            this.filterProfBySemYear();
            });

        // Make sure professors gets reset if CourseNumber is changes
        this.reviewForm.controls['ClassName'].valueChanges.subscribe(sy => {
            this.filteredProfessors = [];
            this.filterProfBySemYear();
            });
    }
    
    onDepartmentSelected(department: string) {
        if (department) {
          this.fetchCoursesByDepartment(department);
        }
      }

    async fetchCoursesByDepartment(department: string) {
        this.courses = await this.classService.getCoursesByDepartment(department);
        this.courses.sort((a, b) => (a.CourseNumber > b.CourseNumber) ? 1 : -1);
      }

    // Filter departments based on input value
    private _filterDepartments(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.departments.filter(department => department.toLowerCase().includes(filterValue));
    }

    // Filter courses based on selected department
    filterCoursesByDepartment(department: string) {
        if (!this.courses) return;
        const filteredSet = new Set(this.courses.filter(course => course.Department === department));
        this.filteredCourses = Array.from(filteredSet);
    }

    // Filter class names based on the selected CourseNumber
    filterClassNamesByCourseNumber(courseNum: string) {
        if (!this.courses) return;
        const filteredSet = new Set(this.courses.filter(course => course.CourseNumber === courseNum));
        this.filteredClassNames = Array.from(filteredSet);
    }

    filterProfBySemYear() {
        if (!this.reviewForm.controls['semyear']) return;
        this.loadProfessors();
    }

    async loadProfessors(): Promise<void> {
        if (!this.courses) return;
        const SemYear = this.reviewForm.controls['semyear'].value;
    
        const files = [
            'fa2019.csv', 'fa2020.csv', 'fa2021.csv', 'fa2022.csv', 'fa2023.csv', 
            'sp2019.csv', 'sp2020.csv', 'sp2021.csv', 'sp2022.csv', 'sp2023.csv', 
            'su2019.csv', 'su2020.csv', 'su2021.csv', 'su2022.csv', 'su2023.csv',
        ];
    
        await this.loadAndFilterCSV(files, SemYear);
    
    }

    // Function to load and filter data from CSV files using Papaparse
    async loadAndFilterCSV(files: string[], SemYear: any) {

        await Promise.all(files.map(async (file) => {
            const filePath = `assets/gpa-data/${file}`;
            const semesterMap: { [key: string]: string } = {
                'fa': 'Fall',
                'sp': 'Spring',
                'su': 'Summer'
            };

            const semesterCode = file.substring(0, 2);
            const year = parseInt(file.substring(2, 6), 10);
            const semester = semesterMap[semesterCode];

            if (SemYear['semester'] === semester && SemYear['year'] === year) {
                const fileData = await this.loadCSV(filePath);
                const courseNumber = this.reviewForm.controls["CourseNumber"].value.split(' ')[1];
                
                const courseData = fileData.filter(row =>
                    row['Subject']?.trim() === this.reviewForm.controls["Department"].value &&
                    (row['Course']?.trim() === courseNumber || row['Course ']?.trim() === courseNumber) &&
                    row['Course Title']?.trim() === this.reviewForm.controls["ClassName"].value
                );

                const uniqueProfessors = new Set<string>();
                courseData.forEach(row => {
                    if (row['Primary Instructor']) {
                        uniqueProfessors.add(row['Primary Instructor']);
                    }
                });
                this.filteredProfessors = Array.from(uniqueProfessors);
            }
        }));
    }

    // Utility to load a CSV file using Papaparse
    loadCSV(filePath: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(filePath, {
                download: true,
                header: true,
                complete: (result) => resolve(result.data),
                error: (error) => reject(error)
            });
        });
    }
  
    async loadReview() {
        if (!this.reviewId) {
            return
        }
        this.headerText = "Edit Review"
        const ref = doc(this.afs, "Reviews", this.reviewId as string)
        const docSnap = await getDoc(ref)
        if (!docSnap) return

        var docData = docSnap.data() as Review
        docData.semyear = { semester: docData.semester, year: docData.year }
        this.reviewForm.setValue(docData)
        this.f.CourseNumber.disable()
    }

    async getUserReviews() {
        const ref = collection(this.afs, 'Reviews')
        var q = query(ref, where("userId", '==', this.userData?.uid))
        const response = await getDocs(q)

        if (!response.docs.length) return

        this.completedReviews = []
        for (let item of response.docs) {
            const review = item.data() as Review
            this.completedReviews.push(review.CourseNumber)
        }
    }

    initializeReviewForm() {
        this.reviewForm = this.formBuilder.group({
            Department: ['', Validators.required],
            CourseNumber: ['', Validators.required],
            ClassName: ['', Validators.required],  
            semyear: ['', Validators.required],
            semester: [''],
            year: ['', [Validators.min(2010), Validators.max(this.currentYear + 1)]],
            difficulty: ['', [Validators.required, Validators.max(this.maxRating), Validators.min(this.minRating)]],
            workload: ['', [Validators.required, Validators.max(this.maxWorkload), Validators.min(this.minWorkload)]],
            rating: ['', [Validators.required, Validators.max(this.maxRating), Validators.min(this.minRating)]],
            profRating: ['', [Validators.required, Validators.max(this.maxRating), Validators.min(this.minRating)]],
            title: ['', Validators.required],
            review: ['', [Validators.required, Validators.minLength(this.minReviewCharLength)]],
            profReview: ['', [Validators.required, Validators.minLength(this.minReviewCharLength)]],
            userId: ['', Validators.required],
            timestamp: [new Date(), Validators.required],
            classId: ['', Validators.required],
            helpfulPositive: [1, Validators.required],
            helpfulNegative: [0, Validators.required],
            wilsonScore: [0.8, Validators.required],
            lastUpdated: [''],
            Professor: [''],
        });
        this.reviewForm.controls['timestamp'].setValue(new Date());
        this.auth.userData.subscribe(user => {
            if (user) {
                this.reviewForm.controls['userId'].setValue(user.uid);
            }
        }).unsubscribe();
    }

    get f() {
        return this.reviewForm?.controls
    }

    countReviewChars() {
        const len = this.f.review.value.length
        if (len == 1) {
            return "1 character"
        }
        return len + " characters"
    }

    countWords(s: string) {
        s = s.replace(/(^\s*)|(\s*$)/gi, "");//exclude  start and end white-space
        s = s.replace(/[ ]{2,}/gi, " ");//2 or more space to 1
        s = s.replace(/\n /, "\n"); // exclude newline with a start spacing
        return s.split(' ').filter(function (str) { return str != ""; }).length;
    }

    async onSubmit() {
        const CourseNumber = this.reviewForm.controls['CourseNumber'].value
        const course = this.courses?.find(item => item.CourseNumber === CourseNumber)
        const classId = course?.courseId
        this.reviewForm.controls['classId'].setValue(classId)
        this.submitted = true
        if (this.reviewForm?.invalid) {
            this.error = this.reviewForm.errors
            return
        }
        if (this.wordCountEnforced && this.countWords(this.f.review.value as string) < this.recommendedWordCount) {
            this.openShortReviewDialog()
            return
        }
        this.loading = true

        this.reviewForm.value.year = this.reviewForm.value.semyear.year
        this.reviewForm.value.semester = this.reviewForm.value.semyear.semester
        if (this.reviewId) {
            const ref = doc(this.afs, "Reviews", this.reviewId as string)
            await updateDoc(ref, this.reviewForm.value)
        } else {
            const ref = collection(this.afs, 'Reviews')
            await addDoc(ref, this.reviewForm.value)
        }
        this.loading = false
        this.openSubmittedDialog(course)

    }

    openSubmittedDialog(course?: ClassData) {
        // const classId = this.courses?.find(item => item.CourseNum === courseName)?.courseId
        const dialogRef = this.dialog.open(DialogReviewSubmission)
        dialogRef.afterClosed().subscribe(result => {
            if (course) {
                const link = getRouterLink(course)
                // this.router.navigate(['courses', this.reviewForm.controls['course'].value])
                this.router.navigate([link])
            }
            else {
                this.router.navigate([''])
            }
        })
    }

    openShortReviewDialog() {
        const dialogRef = this.dialog.open(DialogReviewTooShort)
        dialogRef.afterClosed().subscribe(result => {
            this.wordCountEnforced = result
            if (result) {
                window.location.hash = ""
                window.location.hash = "semester"
            }
        }).unsubscribe();
    }
}