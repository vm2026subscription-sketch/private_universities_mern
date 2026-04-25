import os
import sys

# use openpyxl to get columns safely since no pandas is installed
try:
    import openpyxl
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl"])
    import openpyxl

base_dir = r"C:\Users\ankur\Downloads\vm_private_universities\private_universities_mern\backend\data\extracted_clean\Private universities data"

for root, dirs, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.xlsx'):
            path = os.path.join(root, file)
            print(f"\nFile: {file}")
            try:
                wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
                sheet = wb.active
                cols = []
                for row in sheet.iter_rows(min_row=1, max_row=1, values_only=True):
                    cols = row
                    break
                print("Columns:", cols)
            except Exception as e:
                print("Error reading:", e)

