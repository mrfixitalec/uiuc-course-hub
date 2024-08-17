import { Component, OnInit } from '@angular/core';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ClassService } from 'src/app/services/classes/class.service';
import { getRouterLink, ClassData, courseCategories, courseLanguages } from 'src/app/shared/class/class';

@Component({
    selector: 'app-course-edit',
    templateUrl: './course-edit.component.html',
    styleUrls: ['./course-edit.component.scss'],
})
export class EditCourseComponent implements OnInit {
    courseName: string = ""
    languages = courseLanguages
    categories = courseCategories
    editForm!: FormGroup
    courseData: ClassData | undefined

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private courseService: ClassService,
        private afs: Firestore,
        private router: Router,
    ) {
    }

    ngOnInit(): void {
        this.courseName = this.route.snapshot.paramMap.get('courseId') || ""
        this.editForm = this.formBuilder.group({
            departments: ['', Validators.required],
            seasonSpring: [false, Validators.required],
            seasonSummer: [false, Validators.required],
            seasonFall: [false, Validators.required],
            languages: [''],
        })
        this.courseService.classes.subscribe(data => {
            this.courseData = data.find(x => x.ClassName == this.courseName)
            this.f.departments.setValue(this.courseData?.Department)
            this.f.seasonSpring.setValue(this.courseData?.season.spring)
            this.f.seasonSummer.setValue(this.courseData?.season.summer)
            this.f.seasonFall.setValue(this.courseData?.season.fall)
            this.f.languages.setValue(this.courseData?.languages)
        })
    }

    get f() {
        return this.editForm?.controls
    }

    async onSubmit() {
        const ref = doc(this.afs, "Class", this.courseData?.courseId as string)
        await updateDoc(ref,
            {
                Department: this.f.departments.value,
                season: {
                    spring: this.f.seasonSpring.value,
                    summer: this.f.seasonSummer.value,
                    fall: this.f.seasonFall.value
                },
                languages: this.f.languages.value,
            }
        )
        var link = ''
        if (this.courseData) {
            link = getRouterLink(this.courseData)
        }
        this.router.navigate([link])
    }
}
