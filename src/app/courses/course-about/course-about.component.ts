import {
  Component, OnInit, ViewChild, ElementRef, Renderer2,
  AfterViewInit, ViewEncapsulation
} from '@angular/core';

@Component({
  selector: 'app-course-about',
  templateUrl: './course-about.component.html',
  styleUrls: ['./course-about.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CourseAboutComponent implements OnInit {
  ngOnInit() {
    // Any initialization logic can go here
  }
}
