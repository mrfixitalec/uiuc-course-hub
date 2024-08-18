import { Component, ElementRef, AfterViewInit, ViewChild, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Chart, registerables } from "chart.js";
import randomColor from 'randomcolor';
import { ClassService } from 'src/app/services/classes/class.service';
import { getRouterLink } from 'src/app/shared/class/class';
import { courseCategories } from 'src/app/shared/class/class';


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

  constructor(private courses: ClassService, private router: Router) {
    Chart.register(...registerables);
  }

  // Define options for the dropdowns
  public departmentOptions: any[] = [''].concat(courseCategories); // Example department codes
  public courseLevelOptions: any[] = ['',100, 200, 300, 400, 500, 600]; // Example course levels

  public onDepartmentChange(department: string): void {
    this.selectedDepartment = department;
    this.applyFilters();
  }
  
  public onCourseLevelChange(level: number): void {
    this.selectedCourseLevel = level;
    this.applyFilters();
  }

  public applyFilters(): void {
    let filteredData = this.courseData;
  
    // Filter by department
    if (this.selectedDepartment) {
      filteredData = filteredData.filter(item => item.classData.Department === this.selectedDepartment);
    }
  
    // Filter by course level
    if (this.selectedCourseLevel) {
      const lowerBound = this.selectedCourseLevel;
      const upperBound = lowerBound + 99;
      filteredData = filteredData.filter(item => {
        const courseNum = parseInt(item.classData.CourseNumValue, 10);
        return courseNum >= lowerBound && courseNum <= upperBound;
      });
    }
  
    // Update the chart with filtered data
    this.redrawChart(filteredData);
  }

  public ngOnInit(): void {
    this.courses.classes.subscribe(classes => {
      this.courseData = classes.map(classData => ({
        label: classData.CourseNumber,
        data: [{
          x: classData.DifficultyAvg,
          y: classData.RatingAvg,
          r: classData.RatingCount,
        }],
        backgroundColor: randomColor(),
        classData: classData,
      }));
      this.applyFilters();
    });
  }

  public ngAfterViewInit(): void {
    this.applyFilters();
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
