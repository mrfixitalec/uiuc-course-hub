import { AfterViewInit, Component, ViewChild, OnInit } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { Router } from '@angular/router';
import { ClassService } from 'src/app/services/classes/class.service';
import { getRouterLink, ClassData, departments, Semesters } from '../../shared/class/class';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

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

  deptControl = new FormControl('');
  semesterControl = new FormControl('');
  filteredDeptOptions!: Observable<FilterOption[]>;
  filteredSemesterOptions!: Observable<FilterOption[]>;

  difficultyValue: string = '';
  workloadValue: string = '';
  ratingValue: string = '';

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
    // Initialize filtered options
    this.filteredDeptOptions = this.deptControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterDeptOptions(value!))
    );

    this.filteredSemesterOptions = this.semesterControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterSemesterOptions(value!))
    );
  }

  ngAfterViewInit(): void {
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
      this.dataSource.sort = this.sort;
    });
  }

  private _filterDeptOptions(value: string): FilterOption[] {
    const filterValue = value.toLowerCase();
    return this.deptOptions.filter(option => option.view.toLowerCase().includes(filterValue));
  }

  private _filterSemesterOptions(value: string): FilterOption[] {
    const filterValue = value.toLowerCase();
    return this.semesterOptions.filter(option => option.view.toLowerCase().includes(filterValue));
  }

  applyFilters(): void {
    if (!this.deptControl.value) {
      this.dataSource.data = []; // use = this.classes instead to show all courses by default
      return;
    }
  
    let filteredData = this.classes;
  
    // Apply department filter
    if (this.deptControl.value) {
      filteredData = filteredData.filter(item => {
        const department = item.Department || '';  // Ensure Department is a string
        return (department.toLowerCase() === this.deptControl.value!.toLowerCase());
      });
    }
  
    // Apply semester filter
    if (this.semesterControl.value) {
      filteredData = filteredData.filter(item =>
        item.season_str.some(season => season.toLowerCase().includes(this.semesterControl.value!.toLowerCase()))
      );
    }
  
    // Apply difficulty filter
    if (this.difficultyValue) {
      const difficultyNum = parseFloat(this.difficultyValue);
      if (!isNaN(difficultyNum)) {
        filteredData = filteredData.filter(item =>
          item.DifficultyAvg <= difficultyNum
        );
      }
    }
  
    // Apply workload filter
    if (this.workloadValue) {
      const workloadNum = parseFloat(this.workloadValue);
      if (!isNaN(workloadNum)) {
        filteredData = filteredData.filter(item =>
          item.WorkloadAvg <= workloadNum
        );
      }
    }
  
    // Apply rating filter
    if (this.ratingValue) {
      const ratingNum = parseFloat(this.ratingValue);
      if (!isNaN(ratingNum)) {
        filteredData = filteredData.filter(item =>
          item.RatingAvg >= ratingNum
        );
      }
    }
  
    // Update dataSource with filtered data
    this.dataSource.data = filteredData;
  }

  async onDeptFilterChange(value: string): Promise<void> {
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
      this.dataSource.sort = this.sort;
    });
    this.applyFilters();
  }

  onSemesterFilterChange(value: string): void {
    this.applyFilters();
  }

  onDifficultyFilterChange(value: string): void {
    this.difficultyValue = value;
    this.applyFilters();
  }
  
  onWorkloadFilterChange(value: string): void {
    this.workloadValue = value;
    this.applyFilters();
  }
  
  onRatingFilterChange(value: string): void {
    this.ratingValue = value;
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
