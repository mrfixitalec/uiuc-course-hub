import firebase_admin
from firebase_admin import credentials, firestore
import datetime
import pandas as pd

service_account_key_path = 'scripts/uiuc-coursehub-firebase-key.json'

cred = credentials.Certificate(service_account_key_path)
firebase_admin.initialize_app(cred)

db = firestore.client()

csv_file_path = '/home/alec/uiuc-course-hub/src/assets/final_courses.csv'  
courses_df = pd.read_csv(csv_file_path)

def determine_season(row):
    return {
        'spring': bool(row['Spring']),
        'summer': bool(row['Summer']),
        'fall': bool(row['Fall'])
    }

random_rows = courses_df.sample(n=1)
ece_courses = [110, 120, 210, 220, 391, 445, 330]

cs_rows = courses_df[(courses_df['Subject'] == 'ECE') & (courses_df['Number'].isin(ece_courses))]

selected_rows =  cs_rows #pd.concat([random_rows, cs_rows])

for index, row in selected_rows.iterrows():
    season = determine_season(row)
    season_str = [k for k, v in season.items() if v]

    class_name = row['Name']
    class_name = class_name.replace('&amp;', '&')
    if pd.notna(row['Section Title']) and row['Section Title'].strip():
        class_name = f"{row['Section Title']}"
    class_name.replace('-', " ")
    print(f"Adding document for {class_name}...")
    doc_ref = db.collection('Class').document()  
    doc_ref.set({
        'courseId': '',
        'ClassName': class_name,
        'CourseNumber': f"{row['Subject']} {row['Number']}",
        'CourseNumValue': int(row['Number']),
        'Description': '',
        'DifficultyAvg': 0,  
        'DifficultyCount': 0,  
        'GraphicUrl': "url(https://ws.engr.illinois.edu/images/block.i.color.png)",  
        'RatingAvg': 0, 
        'Department': row['Subject'],
        'RatingCount': 0,  
        'SampleSyllabus': '', 
        'WorkloadAvg': 0,  
        'WorkloadCount': 0,  
        'languages': [], 
        'lastUpdated': datetime.datetime.now(),
        'season': season,
        'season_str': []
    })




# danc_223 = courses_df[(courses_df['Subject'] == 'MATH') & (courses_df['Number'] == 220)].iloc[0]
# season = determine_season(danc_223)
# season_str = [k for k, v in season.items() if v]

# class_name = danc_223['Name']
# if pd.notna(danc_223['Section Title']) and danc_223['Section Title'].strip():
#     class_name = f"{danc_223['Section Title']}"
# class_name = class_name.replace('-', " ")

# print(f"Adding document for {class_name}...")
# doc_ref = db.collection('Class').document()
# doc_ref.set({
#     'courseId': '',
#     'ClassName': class_name,
#     'CourseNumber': f"{danc_223['Subject']} {danc_223['Number']}",
#     'CourseNumValue': int(danc_223['Number']),
#     'Description': '',
#     'DifficultyAvg': 0,
#     'DifficultyCount': 0,
#     'GraphicUrl': "url(https://ws.engr.illinois.edu/images/block.i.color.png)",
#     'RatingAvg': 0,
#     'Department': danc_223['Subject'],
#     'RatingCount': 0,
#     'SampleSyllabus': '',
#     'WorkloadAvg': 0,
#     'WorkloadCount': 0,
#     'languages': [],
#     'lastUpdated': datetime.datetime.now(),
#     'season': season,
#     'season_str': []
# })

# print('Documents added successfully!')


# print('Last 10 docs added successfully!')
