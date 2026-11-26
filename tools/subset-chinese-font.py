"""Subset the OFL Noto Sans SC variable font to the site's current text."""
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
cache=root.parent/'.research-cache'
sys.path.insert(0,str(cache/'python-libs'))
from fontTools import subset
from fontTools.ttLib import TTFont
corpus=''
for pattern in ['assets/data/*.json','assets/data/*.html','assets/js/*.js','*.html']:
    for file in root.glob(pattern):corpus+=file.read_text(encoding='utf8')
unicodes={ord(c) for c in corpus if ord(c)>=0x2e80}|set(range(0x20,0x7f))
font=TTFont(cache/'NotoSansSC-Variable.ttf')
options=subset.Options()
options.flavor='woff2'
options.layout_features=['*']
subsetter=subset.Subsetter(options=options)
subsetter.populate(unicodes=unicodes)
subsetter.subset(font)
font.flavor='woff2'
output=root/'assets/fonts/NotoSansSC-Site.woff2'
font.save(output)
print(f'{len(unicodes)} requested code points, {output.stat().st_size:,} bytes. Original OFL license retained.')
