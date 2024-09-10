import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseAboutComponent } from './course-about.component';

describe('CourseAboutComponent', () => {
  let component: CourseAboutComponent;
  let fixture: ComponentFixture<CourseAboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CourseAboutComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CourseAboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
