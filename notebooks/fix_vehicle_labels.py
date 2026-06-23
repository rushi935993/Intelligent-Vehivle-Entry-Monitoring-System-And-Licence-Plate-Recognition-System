import os

BASE_DIR = "datasets/vehicle"

splits = ["train", "valid", "test"]

for split in splits:
    label_dir = os.path.join(BASE_DIR, split, "labels")
    if not os.path.exists(label_dir):
        continue

    for file in os.listdir(label_dir):
        if not file.endswith(".txt"):
            continue

        file_path = os.path.join(label_dir, file)

        new_lines = []
        with open(file_path, "r") as f:
            lines = f.readlines()

        for line in lines:
            parts = line.strip().split()
            if len(parts) != 5:
                continue

            # FORCE class_id to 0
            parts[0] = "0"
            new_lines.append(" ".join(parts))

        with open(file_path, "w") as f:
            f.write("\n".join(new_lines))

print("✅ All vehicle labels normalized to class 0 (car)")
