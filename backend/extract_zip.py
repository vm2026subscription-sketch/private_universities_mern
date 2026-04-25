import zipfile
import os

zip_path = r"C:\Users\ankur\Downloads\Private universities data-20260425T154910Z-3-001.zip"
extract_path = r"C:\Users\ankur\Downloads\vm_private_universities\private_universities_mern\backend\data\extracted_clean"

if not os.path.exists(extract_path):
    os.makedirs(extract_path)

with zipfile.ZipFile(zip_path, 'r') as zf:
    for member in zf.infolist():
        # Clean the name to remove trailing spaces from any directory components
        parts = member.filename.split('/')
        cleaned_parts = [p.strip() for p in parts]
        target_path = os.path.join(extract_path, *cleaned_parts)
        
        if member.is_dir():
            if not os.path.exists(target_path):
                os.makedirs(target_path)
        else:
            # Create parent dirs
            parent = os.path.dirname(target_path)
            if not os.path.exists(parent):
                os.makedirs(parent)
            with zf.open(member) as source, open(target_path, "wb") as target:
                target.write(source.read())

print("Extraction completed.")
