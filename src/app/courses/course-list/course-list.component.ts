import { AfterViewInit, Component, ViewChild, OnInit } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { Router } from '@angular/router';
import { ClassService } from 'src/app/services/classes/class.service';
import { getRouterLink, ClassData, departments, Semesters } from '../../shared/class/class';

interface FilterOption {
  value: string;
  view: string;
}

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss'],
})
export class CourseListComponent implements AfterViewInit, OnInit {
  classes: ClassData[] = [];
  dataSource = new MatTableDataSource<ClassData>([]);
  displayedColumns: string[] = [
    'CourseNumber',
    'ClassName',
    'RatingCount',
    'DifficultyAvg',
    'WorkloadAvg',
    'RatingAvg',
    'Semester',
  ];
  deptOptions: FilterOption[];
  semesterOptions: FilterOption[];

  deptValue: string = '';
  semesterValue: string = '';

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private courses: ClassService,
    private router: Router
  ) {
    this.deptOptions = this.makeOptions(departments);
    this.semesterOptions = this.makeOptions(Semesters);
  }

  makeOptions(cats: string[]): FilterOption[] {
    return [{ value: '', view: '' }].concat(
      cats.map((a) => ({
        value: a,
        view: a.replace(/MCS |MCSDS /g, ''),
      }))
    );
  }

  ngOnInit() {
    // No need to set filterPredicate as we're handling filtering manually
  }

  ngAfterViewInit(): void {
    this.courses.classes.subscribe((data) => {
      const processedData = data.map((x) => {
        x.season_str = [];
        if (x.season.fall) x.season_str.push('fall');
        if (x.season.spring) x.season_str.push('spring');
        if (x.season.summer) x.season_str.push('summer');
        return x;
      });
      this.classes = processedData;
      this.applyFilters();  // Apply filters initially if needed
      this.dataSource.sort = this.sort;
    });
  }

  applyFilters(): void {
    if (!this.deptValue) {
      // Clear the dataSource if no department filter is selected
      this.dataSource.data = [];
      return;
    }

    let filteredData = this.classes;

    // Apply department filter
    if (this.deptValue) {
      filteredData = filteredData.filter(item => {
        const department = item.Department || '';  // Ensure Department is a string
        return department.toLowerCase() === this.deptValue.toLowerCase();
      });
    }

    // Apply semester filter
    if (this.semesterValue) {
      filteredData = filteredData.filter(item =>
        item.season_str.includes(this.semesterValue.toLowerCase())
      );
    }

    // Update dataSource with filtered data
    this.dataSource.data = filteredData;
  }

  onDeptFilterChange(value: string): void {
    this.deptValue = value;
    this.applyFilters();
  }

  onSemesterFilterChange(value: string): void {
    this.semesterValue = value;
    this.applyFilters();
  }

  trackById(index: number, item: ClassData): string {
    return item.ClassName;
  }

  rowClick(ev: MouseEvent, course: ClassData): void {
    const link = getRouterLink(course);
    if (ev.ctrlKey || ev.metaKey) {
      this.router.navigate([]).then(() => {
        window.open(link);
      });
    } else {
      this.router.navigate([link]);
    }
  }
}
