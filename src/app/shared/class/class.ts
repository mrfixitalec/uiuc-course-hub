import { Timestamp } from '@angular/fire/firestore';

export const mcsdsCategories = [
  "MCSDS Advanced", "MCSDS Elective", "Machine Learning", "Data Mining",
  "Data Visualization", "Cloud Computing"
]

export const departments = [
  "AAS", "ABE", "ACCY", "ACE", "ACES", "ADV", "AE", "AFAS", "AFRO", "AFST", "AGCM", 
  "AGED", "AHS", "AIS", "ALEC", "ANSC", "ANTH", "ARAB", "ARCH", "ART", "ARTD", "ARTE", 
  "ARTF", "ARTH", "ARTJ", "ARTS", "ASRM", "ASST", "ASTR", "ATMS", "BADM", "BASQ", "BCOG", 
  "BCS", "BDI", "BIOC", "BIOE", "BIOP", "BSE", "BTW", "BUS", "CB", "CDB", "CEE", "CHBE", 
  "CHEM", "CHIN", "CHP", "CI", "CIC", "CLCV", "CLE", "CMN", "CPSC", "CS", "CSE", "CW", "CWL", 
  "CZCH", "DANC", "DTX", "EALC", "ECE", "ECON", "EDPR", "EDUC", "EIL", "ENG", "ENGL", "ENSU", 
  "ENVS", "EPOL", "EPSY", "ERAM", "ESE", "ESL", "ETMA", "EURO", "FAA", "FIN", "FLTE", "FR", 
  "FSHN", "GC", "GEOL", "GER", "GGIS", "GLBL", "GMC", "GRK", "GRKM", "GS", "GSD", "GWS", 
  "HDFS", "HEBR", "HIST", "HK", "HNDI", "HORT", "HT", "HUM", "IB", "IE", "INFO", "IS", 
  "ITAL", "JAPN", "JOUR", "JS", "KOR", "LA", "LAS", "LAST", "LAT", "LAW", "LCTL", "LEAD",
  "LER", "LING", "LLS", "MACS", "MATH", "MBA", "MCB", "MDIA", "MDVL", "ME", "MICR", "MILS",
  "MIP", "MSE", "MUS", "MUSC", "MUSE", "NE", "NEUR", "NPRE", "NRES", "NS", "NUTR", "PATH",
  "PERS", "PHIL", "PHYS", "PLPA", "POL", "PORT", "PS", "PSM", "PSYC", "QUEC", "REES", "REL",
  "RHET", "RMLG", "RST", "RUSS", "SAME", "SBC", "SCAN", "SE", "SHS", "SLAV", "SLCL", "SOC", 
  "SOCW", "SPAN", "SPED", "STAT", "SWAH", "TAM", "TE", "THEA", "TMGT", "TRST", "TURK", "UKR", 
  "UP", "VCM", "VM", "WLOF", "WRIT", "YDSH"
]

export const courseCategories = Array.from(
  new Set<string>(departments.concat(mcsdsCategories)))

export const courseLanguages = ["No longer using languages"] as const

const firstYear = 2014 // When was the first semester and year?
const currentYear = (new Date()).getFullYear()
export const Years: number[] = Array.from(
  { length: currentYear - firstYear + 1 },
  (_v, k) => k + firstYear)

export const Semesters: string[] = ["Spring", "Summer", "Fall"]

// MatriculateSemYear = ["2021 Fall", "2021 Summer", "2021 Spring", 
// "2020 Fall"...]
export const MatriculateSemYear: string[] = Years.map(String)
  .reduce((a, v): any =>
    [...a, ...Semesters.map(x => x + " " + v)],
    []).reverse();

export interface Difficulty {
  value: number;
  view: string;
}

export const Difficulties: Difficulty[] = [
  { value: 5, view: 'Very Hard' },
  { value: 4, view: 'Hard' },
  { value: 3, view: 'Medium' },
  { value: 2, view: 'Easy' },
  { value: 1, view: 'Very Easy' },
];

interface Rating {
  value: number;
  view: string;
}

export const Ratings: Rating[] = [
  { value: 5, view: 'Strongly Liked' },
  { value: 4, view: 'Liked' },
  { value: 3, view: 'Neutral' },
  { value: 2, view: 'Disliked' },
  { value: 1, view: 'Strongly Disliked' },
];

export interface ClassData {
  courseId: string,
  ClassName: string,
  CourseNumber: string,
  Description: string,
  DifficultyAvg: number,
  DifficultyCount: number,
  GraphicUrl: string,
  RatingAvg: number,
  RatingCount: number,
  SampleSyllabus: string,
  WorkloadAvg: number,
  WorkloadCount: number,
  Department: string[] | null,
  languages: string[] | null,
  lastUpdated: Timestamp,
  season: {
    spring: boolean,
    summer: boolean,
    fall: boolean
  },
  season_str: string[]
}

export function getRouterLink(course: ClassData): string {
  var ret = `/courses/${course.CourseNumber}-${course.ClassName}`
  ret = ret.replace(/ /g, '-')
  return ret
}