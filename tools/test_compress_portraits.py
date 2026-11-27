"""Real encoder and migration tests; only disposable temporary files are changed."""
import io
import json
from pathlib import Path
import tempfile
import unittest
import importlib.util
from PIL import Image
spec = importlib.util.spec_from_file_location("compress_portraits", Path(__file__).with_name("compress-portraits.py"))
compression = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compression)
encode_photo, optimize = compression.encode_photo, compression.optimize


class PortraitTests(unittest.TestCase):
    def test_orientation_dimensions_and_byte_budget(self):
        image = Image.new("RGB", (180, 300), "#245c88")
        exif = Image.Exif()
        exif[274] = 6
        original = io.BytesIO()
        image.save(original, "JPEG", exif=exif)
        with Image.open(io.BytesIO(original.getvalue())) as source:
            data, size = encode_photo(source, (960, 1200), 180 * 1024)
        self.assertEqual(size, (300, 180))
        with Image.open(io.BytesIO(data)) as result:
            self.assertEqual(result.size, size)
            self.assertFalse(result.getexif())
        noise = Image.effect_noise((1400, 1900), 100).convert("RGB")
        data, size = encode_photo(noise, (960, 1200), 40 * 1024)
        self.assertLessEqual(len(data), 40 * 1024)
        self.assertLessEqual(size[0], 960)
        self.assertLessEqual(size[1], 1200)
        self.assertAlmostEqual(size[0] / size[1], 1400 / 1900, delta=.01)

    def test_dry_run_backups_references_and_repeat_run(self):
        with tempfile.TemporaryDirectory(prefix="biohai-photo-test-") as directory:
            root = Path(directory).resolve()
            self.assertEqual(root.parent, Path(tempfile.gettempdir()).resolve())
            self.assertTrue(root.name.startswith("biohai-photo-test-"))
            (root / "images/people").mkdir(parents=True)
            (root / "assets/data").mkdir(parents=True)
            source = root / "images/people/member.png"
            Image.effect_noise((1200, 1600), 75).convert("RGB").save(source, "PNG")
            before = source.read_bytes()
            people = [{"name": "测试成员", "role": "phd", "cohort": "2025", "custom": {"keep": True}, "image": "images/people/member.png"}]
            people_path = root / "assets/data/people.json"
            people_path.write_text(json.dumps(people), encoding="utf-8")
            (root / "assets/data/lab-content.json").write_text(json.dumps({"image": people[0]["image"]}), encoding="utf-8")
            (root / "People.html").write_text('<img src="images/people/member.png">', encoding="utf-8")
            dry = optimize(root)
            self.assertEqual(dry["photos"], 1)
            self.assertEqual(source.read_bytes(), before)
            self.assertEqual(json.loads(people_path.read_text(encoding="utf-8")), people)
            result = optimize(root, apply=True)
            self.assertGreater(result["savedBytes"], 0)
            backup = Path(result["backup"])
            self.assertEqual((backup / "images/people/member.png").read_bytes(), before)
            self.assertEqual(json.loads((backup / "assets/data/people.json").read_text(encoding="utf-8")), people)
            updated = json.loads(people_path.read_text(encoding="utf-8"))[0]
            self.assertEqual(updated["custom"], {"keep": True})
            self.assertEqual(updated["cohort"], "2025")
            self.assertTrue((root / updated["image"]).is_file())
            self.assertTrue((root / updated["thumbnail"]).is_file())
            self.assertFalse(source.exists())
            self.assertIn(updated["image"], (root / "People.html").read_text(encoding="utf-8"))
            self.assertEqual(json.loads((root / "assets/data/lab-content.json").read_text(encoding="utf-8"))["image"], updated["image"])
            self.assertEqual(optimize(root, apply=True)["photos"], 0)


if __name__ == "__main__":
    unittest.main()
