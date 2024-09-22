import {
    Component, OnInit, ViewChild, ElementRef, Renderer2,
    AfterViewInit, ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { ClassService } from 'src/app/services/classes/class.service';
import { ClassData } from 'src/app/shared/class/class';
import { ratingsToStrings, Review } from '../../shared/review/review';
import { environment } from 'src/environments/environment'
import {
    Firestore, collection, getDocs, limit, orderBy, OrderByDirection,
    query, startAfter, where
} from '@angular/fire/firestore';
import * as d3 from 'd3';
import { SEOService } from '../../services/seo/seo.service';

@Component({
    selector: 'app-course-detail',
    templateUrl: './course-detail.component.html',
    styleUrls: ['./course-detail.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class CourseDetailComponent implements OnInit, AfterViewInit {
    courseName: string = "";
    courseNumber: string = "";
    course?: ClassData;
    cards = [
        { title: '# Reviews', subtitle: '', value: 0 },
        { title: 'Avg. Difficulty (1-5)', subtitle: '', value: 0 },
        { title: 'Avg. Workload (hrs/wk)', subtitle: 'Hours Per Week', value: 0 },
        { title: 'Avg. Rating (1-5)', subtitle: '', value: 0 },
    ];
    orderByOptions = [
        { displayText: "Newest", field: "timestamp", order: "desc" },
        { displayText: "Oldest", field: "timestamp", order: "asc" },
    ];
    reviewDataStack: any[] = [];
    reviewData: Review[] = [];
    disableNext: boolean = false;
    disablePrev: boolean = false;
    pageLength: number = 5;
    maxLength: number = 99999;
    isLoggedIn: boolean = false;
    selectedSort = this.orderByOptions[0];
    loading: boolean = true;

    @ViewChild('imageContainer') imageContainer!: ElementRef;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private afs: Firestore,
        private auth: AuthService,
        private renderer: Renderer2,
        private classService: ClassService,
        private seoService: SEOService
    ) { }

    ngAfterViewInit(): void {
        if (!this.course) {
            this.getClassData();
        }
    }
    async createGPAChart(): Promise<void> {
        if (!this.course) return;

        const files = [
            'fa2019.csv', 'fa2020.csv', 'fa2021.csv', 'fa2022.csv', 'fa2023.csv', 
            'sp2019.csv', 'sp2020.csv', 'sp2021.csv', 'sp2022.csv', 'sp2023.csv', 
            'su2019.csv', 'su2020.csv', 'su2021.csv', 'su2022.csv', 'su2023.csv',
            'wi2019_2020.csv', 'wi2020_2021.csv', 'wi2021_2022.csv', 'wi2022_2023.csv', 'wi2023_2024.csv'
        ];

        const data = await Promise.all(files.map(async (file) => {
            const fileData = await d3.csv(`assets/gpa-data/${file}`);
            const courseData = fileData.filter(row => 
                row['Subject']?.trim() === this.course?.Department && 
                (row['Course']?.trim() === this.course?.CourseNumValue.toString() || row['Course ']?.trim() === this.course?.CourseNumValue.toString())
            );
            return courseData;
        }));

        const combinedData = ([] as d3.DSVRowString<string>[]).concat(...data);
        const combinedDSVData: d3.DSVRowArray<string> = combinedData as d3.DSVRowArray<string>;

        const filteredData = combinedDSVData.filter((row: any) =>
            row['Subject']?.trim() === this.course?.Department &&
            (row['Course']?.trim() === this.course?.CourseNumValue.toString() || row['Course ']?.trim() === this.course?.CourseNumValue.toString())
        );

        console.log('Filtered Data:', filteredData);

        if (filteredData.length === 0) return;

        const { aggregatedInstructors, totalA, totalB, totalC, totalD, totalF } = this.aggregateData(filteredData);

        // this part calculates overall avg GPA and total students
        let totalGrades: number[] = [];
        let totalStudents = 0;
        let overallAvgGPA = 0;

        totalStudents = aggregatedInstructors.reduce((sum, d) => {
            totalGrades = totalGrades.concat(d.grades);
            return sum + d.students;
        }, 0);

        overallAvgGPA = aggregatedInstructors.reduce((sum, d) => sum + (d.gpa * d.students), 0) / totalStudents;

        // to sort instructors by avg gpa
        aggregatedInstructors.sort((a, b) => b.gpa - a.gpa);

        // additional line for all instructors
        aggregatedInstructors.unshift({
            instructor: "All instructors",
            gpa: overallAvgGPA,
            students: totalStudents,
            sections: "",
            grades: totalGrades,
            A: totalA,
            B: totalB,
            C: totalC,
            D: totalD,
            F: totalF
        });

        const width = 1000;
        const height = 20 * aggregatedInstructors.length + 40;
        const svg = d3.select("#gpaChart")
            .html("")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        const x = d3.scaleLinear()
            .domain([0, 4])
            .range([240, width - 260]);

        const y = d3.scaleBand()
            .domain(aggregatedInstructors.map((_, i) => i.toString()))
            .range([40, height])
            .padding(0.2);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "5px")
            .style("pointer-events", "none")
            .style("z-index", 1000);

        svg.append("text")
            .attr("x", 10)
            .attr("y", 20)
            .attr("class", "chart-label")
            .text("Instructor");

        svg.append("text")
            .attr("x", x(4) + 60)
            .attr("y", 20)
            .attr("class", "chart-label")
            .text("Students");

        svg.append("text")
            .attr("x", x(4) + 150)
            .attr("y", 20)
            .attr("class", "chart-label")
            .text("Avg. GPA");

        svg.append("g")
            .attr("transform", "translate(280,0)")
            .call(d3.axisLeft(y).tickSize(0).tickFormat(() => ""))
            .select(".domain").remove();

        svg.append("g")
            .attr("transform", `translate(0,30)`)
            .call(d3.axisTop(x).ticks(5));

        aggregatedInstructors.forEach((d, i) => {
            console.log(`Processing data for instructor: ${d.instructor}`);
            console.log("Grades:", d.grades);
            console.log("GPA:", d.gpa);

            const percentiles = this.calculatePercentiles(d.grades);
            const deviation = d.gpa - overallAvgGPA;
            let color = "#d0e1f9"; 

            if (d.instructor === "All instructors") {
                color = "#d0e1f9"; 
            } else {
                if (deviation < -0.3) {
                    color = "#ffe6e6"; 
                } else if (deviation < -0.20001) {
                    color = "#ffd6d6"; 
                } else if (deviation < -0.10001) {
                    color = "#f2e1f7";
                } else if (deviation < 0) {
                    color = "#e9e1ff"; 
                }
            }

            const component = this; 

            percentiles.forEach((p, j) => {
                svg.append("rect")
                    .attr("x", x(p.start))
                    .attr("y", y(i.toString())!)
                    .attr("width", x(p.end) - x(p.start))
                    .attr("height", y.bandwidth())
                    .attr("fill", color)
                    .attr("rx", y.bandwidth() / 2)
                    .attr("ry", y.bandwidth() / 2)
                    .style("mix-blend-mode", "multiply")
                    .on("mouseover", function(event) {
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(`
                            <div style="text-align: center;">
                                <strong>${component.course?.CourseNumber}</strong><br>
                                <span>${d.instructor}</span>
                                <hr style="border: none; border-top: 1px dotted #ccc; margin: 5px 0;">
                                <strong>Average GPA: ${d.gpa.toFixed(2)}</strong><br>
                                <span>${deviation.toFixed(2)}σ from overall course average</span><br>
                                <span>Data on ${d.students} students</span>
                                <hr style="border: none; border-top: 1px dotted #ccc; margin: 5px 0;">
                                <div style="display: flex; justify-content: space-around;">
                                    <div>As<br>${((d.A / d.students) * 100).toFixed(1)}%</div>
                                    <div>Bs<br>${((d.B / d.students) * 100).toFixed(1)}%</div>
                                    <div>Cs<br>${((d.C / d.students) * 100).toFixed(1)}%</div>
                                    <div>Ds<br>${((d.D / d.students) * 100).toFixed(1)}%</div>
                                    <div>Fs<br>${((d.F / d.students) * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        `)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function() {
                        tooltip.transition().duration(500).style("opacity", 0);
                    })
                    .on("mousemove", function(event) {
                        tooltip.style("left", (event.pageX + 5) + "px")
                               .style("top", (event.pageY - 120) + "px");
                    });
            });

            svg.append("line")
                .attr("x1", x(d.gpa))
                .attr("x2", x(d.gpa))
                .attr("y1", y(i.toString())! -0.05)
                .attr("y2", y(i.toString())! + y.bandwidth() + 0.05)
                .attr("stroke", "black")
                .attr("stroke-width", 2.3);

            svg.append("text")
                .attr("x", 10)
                .attr("y", y(i.toString())! + y.bandwidth() / 2)
                .attr("dy", ".35em")
                .attr("class", "chart-label")
                .text(d.instructor);

            svg.append("text")
                .attr("x", x(4) + 60)
                .attr("y", y(i.toString())! + y.bandwidth() / 2)
                .attr("dy", ".35em")
                .attr("class", "chart-label")
                .text(d.students);

            svg.append("text")
                .attr("x", x(4) + 150)
                .attr("y", y(i.toString())! + y.bandwidth() / 2)
                .attr("dy", ".35em")
                .attr("class", "chart-label")
                .text(d.gpa.toFixed(2));
                if (d.instructor === "All instructors") {
                    svg.append("line")
                        .attr("x1", 0)
                        .attr("x2", width)
                        .attr("y1", y(i.toString())! + y.bandwidth()+1.5)
                        .attr("y2", y(i.toString())! + y.bandwidth() + 1.5)
                        .attr("stroke", "black")
                        .attr("stroke-dasharray", "4")
                        .attr("stroke-width", 1);
                }

        });
    }

    aggregateData(data: any[]): { aggregatedInstructors: any[], totalA: number, totalB: number, totalC: number, totalD: number, totalF: number } {
        type GradeKey = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';

        const gradeToGPA: Record<GradeKey, number> = {
            'A+': 4.00, 'A': 4.00, 'A-': 3.67,
            'B+': 3.33, 'B': 3.00, 'B-': 2.67,
            'C+': 2.33, 'C': 2.00, 'C-': 1.67,
            'D+': 1.33, 'D': 1.00, 'D-': 0.67,
            'F': 0.00
        };

        const instructors: { [key: string]: { grades: number[], A: number, B: number, C: number, D: number, F: number } } = {};
        let totalA = 0, totalB = 0, totalC = 0, totalD = 0, totalF = 0;

        data.forEach(row => {
            const instructor = row['Primary Instructor'];

            if (!instructors[instructor]) {
                instructors[instructor] = { grades: [], A: 0, B: 0, C: 0, D: 0, F: 0 };
            }

            Object.keys(gradeToGPA).forEach((grade) => {
                const count = parseInt(row[grade as GradeKey]) || 0;
                instructors[instructor].grades.push(...Array(count).fill(gradeToGPA[grade as GradeKey]));
            });

            instructors[instructor].A += (parseInt(row['A']) || 0) + (parseInt(row['A+']) || 0) + (parseInt(row['A-']) || 0);
            instructors[instructor].B += (parseInt(row['B']) || 0) + (parseInt(row['B+']) || 0) + (parseInt(row['B-']) || 0);
            instructors[instructor].C += (parseInt(row['C']) || 0) + (parseInt(row['C+']) || 0) + (parseInt(row['C-']) || 0);
            instructors[instructor].D += (parseInt(row['D']) || 0) + (parseInt(row['D+']) || 0) + (parseInt(row['D-']) || 0);
            instructors[instructor].F += (parseInt(row['F']) || 0);

            totalA += (parseInt(row['A']) || 0) + (parseInt(row['A+']) || 0) + (parseInt(row['A-']) || 0);
            totalB += (parseInt(row['B']) || 0) + (parseInt(row['B+']) || 0) + (parseInt(row['B-']) || 0);
            totalC += (parseInt(row['C']) || 0) + (parseInt(row['C+']) || 0) + (parseInt(row['C-']) || 0);
            totalD += (parseInt(row['D']) || 0) + (parseInt(row['D+']) || 0) + (parseInt(row['D-']) || 0);
            totalF += (parseInt(row['F']) || 0);
        });

        const aggregatedInstructors = Object.keys(instructors).map(key => ({
            instructor: key,
            gpa: instructors[key].grades.reduce((sum, gpa) => sum + gpa, 0) / instructors[key].grades.length,
            students: instructors[key].grades.length,
            sections: Math.floor(Math.random() * 5) + 1, // random, could possibly calculate from data but left out for now
            grades: instructors[key].grades,
            A: instructors[key].A,
            B: instructors[key].B,
            C: instructors[key].C,
            D: instructors[key].D,
            F: instructors[key].F
        }));

        return {
            aggregatedInstructors,
            totalA,
            totalB,
            totalC,
            totalD,
            totalF
        };
    }



    calculatePercentiles(grades: number[]): { start: number, end: number }[] {
        grades.sort((a, b) => a - b);
        console.log("Sorted Grades:", grades);

        const percentiles = [
            { start: grades[0], end: grades[Math.floor(0.95 * grades.length)] },
            { start: grades[Math.floor(0.05 * grades.length)], end: grades[Math.floor(0.95 * grades.length)] },
            { start: grades[Math.floor(0.125 * grades.length)], end: grades[Math.floor(0.875 * grades.length)] },
            { start: grades[Math.floor(0.25 * grades.length)], end: grades[Math.floor(0.75 * grades.length)] }
        ];

        console.log("Calculated Percentiles:", percentiles);
        return percentiles;
    }




    ngOnInit(): void {
        const param = this.route.snapshot.paramMap.get('courseId') || ""
        if (param != "") {
            const pos = param.split('-', 2).join('-').length;
            this.courseName = param.substring(pos + 1).replace(/-/g, ' ')
        }
        this.auth.isLoggedIn.subscribe(state => { this.isLoggedIn = state });
        this.getClassData();
        this.getFirstPage();
        document.getElementsByClassName("mat-drawer-content")[0].scroll(0, 0);
    }

    getClassData(): void {
        this.classService.classes.subscribe(data => {
            this.course = data.find(x => x.ClassName == this.courseName);
            console.log('Retrieved Class Data:', this.course);
            
            if (!this.course) {
                this.router.navigate(['404']);
            } else {
                this.courseNumber = this.course!.CourseNumber;
                this.createGPAChart();
                this.setTitle()
                if (this.course.Description) {
                    this.seoService.updateDescription(this.course.Description);
                }
                this.updateCards(this.course!)
                this.updateGraphicStyles()
            }
        });
    }

    setTitle() {
        var preTitle = ""
        if (this.courseName != "" && this.courseName != "") {
            preTitle = `${this.courseNumber} - ${this.courseName}`
        }
        else if (this.courseName != "") {
            preTitle = this.courseName
        }
        else if (this.courseNumber != "") {
            preTitle = this.courseNumber
        }
        else {
            preTitle = ""
        }
        var title = ""
        if (preTitle != "") {
            title = `${preTitle} | ${environment.websiteName}`
        } else {
            title = environment.websiteName
        }
        this.seoService.updateTitle(title);
    }
    
    updateGraphicStyles(): void {
        if (this.imageContainer?.nativeElement) {
            this.renderer.setStyle(this.imageContainer?.nativeElement, 'background-image', this.course?.GraphicUrl)
        }
    }

    async getFirstPage() {
        this.loading = true
        this.disablePrev = true
        this.disableNext = false
        this.reviewDataStack = []
        const ref = collection(this.afs, 'Reviews')
        var q = query(ref)
        q = query(q,
            where("ClassName", '==', this.courseName),
            limit(this.pageLength),
            orderBy(this.selectedSort.field, this.selectedSort.order as
                OrderByDirection))

        const response = await getDocs(q)
        this.reviewData = []
        if (!response.docs.length) {
            // console.warn("Course Detail: No reviews exist")
            this.disableNext = true
            this.disablePrev = true
            this.loading = false
            return
        }
        for (let item of response.docs) {
            const review = item.data() as Review
            review.reviewId = item.id
            this.reviewData.push(review)
        }
        this.reviewDataStack.push(response)
        if (response.docs.length < 5) {
            this.disableNext = true
            this.maxLength = this.reviewData.length
        }
        this.reviewData = ratingsToStrings(this.reviewData)
        this.loading = false
    }

    async nextPage() {
        this.loading = true
        this.disablePrev = false
        const lastReview = this.reviewDataStack[this.reviewDataStack.length - 1].docs[this.pageLength - 1]

        const ref = collection(this.afs, 'Reviews')
        var q = query(ref)
        q = query(q,
            where("ClassName", '==', this.courseName),
            limit(this.pageLength),
            orderBy(this.selectedSort.field, this.selectedSort.order as
                OrderByDirection),
            startAfter(lastReview))

        const response = await getDocs(q)
        if (!response.docs.length) {
            // console.warn("Course Detail: No reviews exist")
            this.disableNext = true
            this.loading = false
            return
        }
        for (let item of response.docs) {
            const review = item.data() as Review
            review.reviewId = item.id
            this.reviewData.push(review)
        }
        this.reviewDataStack.push(response)
        if (response.docs.length < 5 || this.reviewData.length >= this.course!.RatingCount) {
            this.disableNext = true
            this.maxLength = this.reviewData.length
        }
        this.reviewData = ratingsToStrings(this.reviewData)
        this.loading = false
    }

    updateCards(course: ClassData): void {
        this.cards[0].value = course.RatingCount
        this.cards[1].value = course.DifficultyAvg
        this.cards[2].value = course.WorkloadAvg
        this.cards[3].value = course.RatingAvg
    }

    semesterMatch(season: string, semesters: string[]): string {
        return semesters.filter(function (k) { return ~k.indexOf(season) }).toString().split(',').join('\n')
    }

    newSort(event: any): void {
        this.getFirstPage()
    }
}
