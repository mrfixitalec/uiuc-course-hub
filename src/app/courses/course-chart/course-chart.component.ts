import { Component, ElementRef, AfterViewInit, ViewChild, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from "chart.js";
import randomColor from 'randomcolor';
import { ClassService } from 'src/app/services/classes/class.service';
import { courseCategories } from 'src/app/shared/class/class';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { getRouterLink, ClassData, departments, Semesters } from '../../shared/class/class';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { MatSort } from '@angular/material/sort';


interface FilterOption {
  value: string;
  view: string;
}

@Component({
  selector: 'app-course-chart',
  templateUrl: './course-chart.component.html',
  styleUrls: ['./course-chart.component.scss']
})
export class CourseChartComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas') public canvas?: ElementRef<HTMLCanvasElement>;
  public chart: Chart | undefined;
  public courseData: any[] = [];
  public selectedDepartment: string = '';
  public selectedCourseLevel: any = '';
  deptControl = new FormControl('');
  deptOptions: FilterOption[];
  filteredDeptOptions!: Observable<FilterOption[]>;
  dataSource = new MatTableDataSource<ClassData>([]);
  @ViewChild(MatSort) sort!: MatSort;
  classes: ClassData[] = [];

  constructor(private courses: ClassService, private router: Router) {
    Chart.register(...registerables);
    this.deptOptions = this.makeOptions(departments);
  }

  makeOptions(cats: string[]): FilterOption[] {
    return [{ value: '', view: '' }].concat(
      cats.map((a) => ({
        value: a,
        view: a.replace(/MCS |MCSDS /g, ''),
      }))
    );
  }

  // Define options for the dropdowns
  public departmentOptions: any[] = [''].concat(courseCategories); // Example department codes
  public courseLevelOptions: any[] = ['',100, 200, 300, 400, 500, 600]; // Example course levels

  public async onDepartmentChange(department: string): Promise<void> {
    this.selectedDepartment = department;
    await this.courses.getClassesByDepartment(this.deptControl.value || '');
    this.courses.classes.subscribe((data) => {
      const processedData = data.map((x) => {
        x.season_str = [];
        if (x.season.fall) x.season_str.push('fall');
        if (x.season.spring) x.season_str.push('spring');
        if (x.season.summer) x.season_str.push('summer');
        return x;
      });
      this.classes = processedData;

      this.courseData = data.map(classData => ({
        label: classData.CourseNumber,
        data: [{
          x: classData.DifficultyAvg,
          y: classData.RatingAvg,
          r: classData.RatingCount,
        }],
        backgroundColor: randomColor(),
        classData: classData,
      }));

      //this.applyFilters();  // Apply filters initially if needed
      this.dataSource.sort = this.sort;
    });
    this.applyFilters();
  }
  
  public onCourseLevelChange(level: number): void {
    this.selectedCourseLevel = level;
    this.applyFilters();
  }

  public applyFilters(): void {
    if (!this.deptControl.value) {
      this.dataSource.data = []; // use = this.classes instead to show all courses by default
      return;
    }

    let filteredData = this.courseData;
  
    // Filter by department
    // Apply department filter
    if (this.deptControl.value) {
      filteredData = filteredData.filter(item => {
        const department = item.classData.Department || '';  // Ensure Department is a string
        return (department.toLowerCase() === this.deptControl.value!.toLowerCase());
      });
    }
  
    // Filter by course level
    if (this.selectedCourseLevel) {
      const lowerBound = this.selectedCourseLevel;
      const upperBound = lowerBound + 99;
      filteredData = filteredData.filter(item => {
        const courseNum = item.classData.CourseNumValue;
        return courseNum >= lowerBound && courseNum <= upperBound;
      });
    }
  
    // Update the chart with filtered data
    this.redrawChart(filteredData);
    // Update dataSource with filtered data
    this.dataSource.data = filteredData;
  }

  public ngOnInit(): void {
    this.filteredDeptOptions = this.deptControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterDeptOptions(value!))
    );
  }

  public ngAfterViewInit(): void {
    this.courses.getClassesByDepartment(this.deptControl.value || '');
    this.courses.classes.subscribe((data) => {
      const processedData = data.map((x) => {
        x.season_str = [];
        if (x.season.fall) x.season_str.push('fall');
        if (x.season.spring) x.season_str.push('spring');
        if (x.season.summer) x.season_str.push('summer');
        return x;
      });
      this.classes = processedData;

      this.courseData = data.map(classData => ({
        label: classData.CourseNumber,
        data: [{
          x: classData.DifficultyAvg,
          y: classData.RatingAvg,
          r: classData.RatingCount,
        }],
        backgroundColor: randomColor(),
        classData: classData,
      }));

      //this.applyFilters();  // Apply filters initially if needed
      this.dataSource.sort = this.sort;
    });
  }

  private _filterDeptOptions(value: string): FilterOption[] {
    const filterValue = value.toLowerCase();
    return this.deptOptions.filter(option => option.view.toLowerCase().includes(filterValue));
  }

  @HostListener('window:resize', ['$event'])
  public onResize() {
    this.redrawChart(this.courseData);
  }

  public redrawChart(inputData: any[]): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }

    if (this.canvas) {
      this.chart = new Chart(this.canvas.nativeElement, {
        type: 'bubble',
        data: {
          datasets: inputData,
        },
        options: {
          animation: false,
          maintainAspectRatio: false,
          scales: {
            x: {
              title: {
                display: true,
                text: 'Difficultly (1-5)'
              }
            },
            y: {
              title: {
                display: true,
                text: 'Rating (1-5)'
              }
            },
          },
          onClick: (_, chartElements) => {
            const index = chartElements[0].datasetIndex;
            const link = getRouterLink(inputData[index].classData);
            this.router.navigate([link]);
          },
          onHover: (event, chartElements) => {
            (event!.native!.target as any).style.cursor = chartElements[0] ? 'pointer' : 'default';
          },
          plugins: {
            legend: {
              position: "bottom"
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const classData = inputData[context.datasetIndex].classData;
                  return [
                    `${classData.CourseNumber} ${classData.ClassName}`,
                    `Reviews: ${classData.RatingCount}`,
                    `Difficulty: ${classData.DifficultyAvg.toFixed(2)}`,
                    `Rating: ${classData.RatingAvg.toFixed(2)}`,
                  ];
                }
              }
            },
          }
        }
      });
    }
  }
}
