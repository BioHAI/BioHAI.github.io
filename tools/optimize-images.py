"""Create lightweight, uncropped card previews; retain original paper figures."""
from pathlib import Path
import json
from PIL import Image, ImageOps
root=Path(__file__).resolve().parents[1]
data=root/'assets/data/publications.json'
papers=json.loads(data.read_text(encoding='utf8'))
target=root/'images/research/thumbs'
target.mkdir(exist_ok=True)
before=after=0
for paper in papers:
    if not paper.get('image'):continue
    source=root/paper['image']
    image=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    image.thumbnail((1100,800),Image.Resampling.LANCZOS)
    file=target/(paper['id']+'.webp')
    image.save(file,'WEBP',quality=90,method=6)
    paper['thumbnail']=file.relative_to(root).as_posix()
    before+=source.stat().st_size
    after+=file.stat().st_size
data.write_text(json.dumps(papers,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'{len([p for p in papers if p.get("thumbnail")])} uncropped previews: {before:,} -> {after:,} bytes ({100*(1-after/before):.1f}% smaller).')
people_file=root/'assets/data/people.json'
people=json.loads(people_file.read_text(encoding='utf8'))
photo_dir=root/'images/people/thumbs'
photo_dir.mkdir(exist_ok=True)
photo_before=photo_after=0
for i,person in enumerate(people):
    if not person.get('image'):continue
    source=root/person['image']
    image=ImageOps.exif_transpose(Image.open(source)).convert('RGB')
    image.thumbnail((360,450),Image.Resampling.LANCZOS)
    file=photo_dir/f'member-{i+1:03}.webp'
    image.save(file,'WEBP',quality=88,method=6)
    person['thumbnail']=file.relative_to(root).as_posix()
    photo_before+=source.stat().st_size
    photo_after+=file.stat().st_size
people_file.write_text(json.dumps(people,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'{len(people)} member photo previews: {photo_before:,} -> {photo_after:,} bytes.')
