import requests
import os
import json
# from bs4 import BeautifulSoup
import string
import xml.etree.ElementTree as ET
import csv
import threading
import queue
import time

# Base URL for course data
# base_url = "https://courses.illinois.edu/cisapp/explorer/schedule/2023/spring/"

csv_writer_lock = threading.Lock()

gen_cour_q = queue.Queue()
sect_q = queue.Queue()


def create_course_csvs(dept_num_to_start_at):

    # Parse the input XML data
    tree = ET.parse('data_parsing/XML_docs/fall_2024.xml')
    root = tree.getroot()

    # Create a list to store departments
    all_departments = []

    # Extract course information
    all_departments = root.find("subjects")

    # year_semester = year, semester
    # dept_info_list = abbreviation, deptname
    # course_info_list = courseNum, courseName, creditHours, description, genEdAttr
    # section_info_list = courseNum, crn, sectionName, sectionType, instructors

    # general course = course_info_list + dept_info_list
    # section attributes = section_info_list + dept_info_list + year_semester

    

    year_semester = []
    year_semester.append(root.find("parents").find("calendarYear").text)
    year_semester.append(root.find("label").text)

    """
    general_course = open('data_parsing/general_course_sp24.csv', 'w', newline='')
    section_attributes = open('data_parsing/section_attributes_sp24.csv', 'w', newline='')


    writer_general = csv.writer(general_course)
    writer_section = csv.writer(section_attributes)
    """

    depts = 0


    for dept in all_departments.findall("subject"):
        if (depts < dept_num_to_start_at or depts > dept_num_to_start_at + 9):
            depts+= 1
            continue
        depts+= 1

        dept_info = []
        dept_info.append(dept.get("id"))
        dept_info.append(dept.text)
        # Send an HTTP GET request to the dept link
        response = requests.get(dept.get("href"))

        # Check if the request was successful
        if response.status_code == 200:
            dept_root = ET.fromstring(response.text)

            # Extract course information
            courses = dept_root.find("courses")

            for course in courses.findall("course"):

                course_info = []
                print(dept.get("id"), course.get("id"), course.text)
                course_info.append(course.get("id"))
                course_info.append(course.text)

                # not sure if this needs to be a separate response var or not
                response = requests.get(course.get("href"))

                if response.status_code == 200:
                    course_root = ET.fromstring(response.text)

                    #course_info["creditHours"] = course.find("creditHours").text
                    #course_info["description"] = course.find("description").text
                    course_info.append(course_root.find("creditHours").text)
                    course_info.append(course_root.find("description").text)
                    try:
                        # not all courses have 'sectionDegreeAttributes'
                        #course_info["gen_ed_attr"] = course.find("sectionDegreeAttributes").text
                        course_info.append(course_root.find("sectionDegreeAttributes").text)
                    except:
                        #course_info["gen_ed_attr"] = ""
                        course_info.append("")

                    # make general course csv line here
                    # writer_general.writerow(course_info + dept_info)
                    gen_cour_q.put(course_info + dept_info)
                    time.sleep(1)
                    """
                    sections = course_root.find("sections")

                    for section in sections.findall("section"):

                        section_info = []
                        section_info.append(course.get("id"))
                        section_info.append(section.get("id"))
                        section_info.append(section.text)

                        response = requests.get(section.get("href"))

                        if response.status_code == 200:
                            section_root = ET.fromstring(response.text)

                            meetings = section_root.find("meetings")
                            instructors_string = ""
                            type_string = ""

                            for meeting in meetings.findall("meeting"):
                                #section_info["type"] = meeting.find("type").text
                                #section_info.append(meeting.find("type").text)
                                if type_string == "":
                                    type_string = meeting.find("type").text
                                else:
                                    type_string += (";" + meeting.find("type").text)

                                instructors = meeting.find("instructors")
                                
                                #instructors_string = ""
                                for instructor in instructors.findall("instructor"):
                                    if instructors_string == "":
                                        instructors_string = instructor.text
                                    else:
                                        instructors_string += (";" + instructor.text)
                                
                                #section_info["instructors"] = instructors_string
                                #section_info.append(instructors_string)

                                # make section CSV row
                                # writer_section.writerow(section_info + dept_info + year_semester)
                                #sect_q.put(section_info + dept_info + year_semester)

                                # csv_writer_lock.acquire()
                                # general_course.flush()
                                # section_attributes.flush()
                                # csv_writer_lock.release()

                            section_info.append(type_string)
                            section_info.append(instructors_string)
                            sect_q.put(section_info + dept_info + year_semester)

                        else: 
                            print(f"Failed to retrieve data for {section.get("href")}, status code: {response.status_code}")
                    """
                else:
                    print(f"Failed to retrieve data for {course.get("href")}, status code: {response.status_code}")
        else:
            print(f"Failed to retrieve data for {dept.get("href")}, status code: {response.status_code}")

    # Save all course data to a single JSON file
    # with open("all_courses.json", "w") as json_file:
    # json.dump(all_courses, json_file, indent=2)

    # print("Saved all course data to all_courses.json")

def handle_gen_queue():
    general_course = open('data_parsing/general_course_fa24.csv', 'w', newline='')
    writer_general = csv.writer(general_course)

    while(True):
        try:
            writer_general.writerow(gen_cour_q.get(timeout=10))
            general_course.flush()
        except queue.Empty:
            break
        except:
            continue

def handle_section_queue():
    section_attributes = open('data_parsing/section_attributes_fa24.csv', 'w', newline='')
    writer_section = csv.writer(section_attributes)
    while (True):
        try:
            writer_section.writerow(sect_q.get(timeout=10))
            section_attributes.flush()
        except queue.Empty:
            break
        except:
            continue



def make_threads():
    threads = []
    for i in range(1):  # Creating 3 threads as an example
        # thread_name = f"Thread-{i+1}"
        thread = threading.Thread(target=create_course_csvs, args=(i * 10,))
        threads.append(thread)

    thread = threading.Thread(target=handle_gen_queue)
    threads.append(thread)
    # thread = threading.Thread(target=handle_section_queue)
    # threads.append(thread)

    # Start threads
    for thread in threads:
        thread.start()
        time.sleep(1)
        
    # Wait for all threads to complete
    for thread in threads:
        thread.join()


if __name__ == "__main__":
    make_threads()