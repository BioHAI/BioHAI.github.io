"""Build uncropped award-card previews; keep every original for on-demand viewing."""
from pathlib import Path
import json
import warnings
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
data = root / 'assets/data/legacy-news.json'
news = json.loads(data.read_text(encoding='utf8'))
target = root / 'images/news/award-previews'
target.mkdir(exist_ok=True)
before = after = count = 0
for year, items in news['rewardInformation'].items():
    for index, item in enumerate(items, 1):
        source = root / item['image_file']
        # The existing 10,200 x 14,028 scan is a known local asset. JPEG draft
        # decoding avoids allocating its full 143 MP raster for a small card.
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', Image.DecompressionBombWarning)
            with Image.open(source) as original:
                original.draft('RGB', (1000, 800))
                image = ImageOps.exif_transpose(original).convert('RGB')
                image.thumbnail((1000, 800), Image.Resampling.LANCZOS)
                file = target / f'{year}-{index:02}.webp'
                image.save(file, 'WEBP', quality=86, method=6)
        item.update(thumbnail=file.relative_to(root).as_posix(),
                    thumbnailWidth=image.width, thumbnailHeight=image.height)
        before += source.stat().st_size
        after += file.stat().st_size
        count += 1
data.write_text(json.dumps(news, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
print(f'{count} award previews: {before:,} -> {after:,} bytes ({100*(1-after/before):.1f}% smaller). Originals retained.')
