"""Extract visually reviewed Figure 1 regions, retaining the source manifest."""
from pathlib import Path
import json
import pypdfium2 as pdfium
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
cache=root.parent/'.research-cache'
sources=json.loads((cache/'pdf-sources.json').read_text())
manifest=json.loads((root/'assets/data/figure-sources.json').read_text())
regions={
 'bindingmodes':(14,(122,80,498,450)),
 'safedrug':(2,(105,65,508,324)),
 'caml':(2,(70,56,527,235)),
 'm2po':(0,(306,213,527,380)),
 'mamo':(0,(319,260,560,419)),
 'trace':(0,(319,241,560,435)),
 'ppi':(3,(70,55,527,351)),
 'edg':(1,(51,56,564,183)),
 'peptidereview':(3,(45,65,450,503)),
 's2vm':(3,(106,66,506,242))
}
panels=[]
for id,(page,box) in regions.items():
 file=cache/(id+'.pdf')
 if not file.exists():continue
 doc=pdfium.PdfDocument(str(file))
 im=doc[page].render(scale=2.5).to_pil().convert('RGB')
 crop=im.crop(tuple(round(n*2.5) for n in box))
 crop.save(root/'images/research'/f'{id}.png',optimize=True)
 manifest[id]={'image':f'images/research/{id}.png','imageSource':sources[id],'articleSource':sources[id],'figure':'Figure 2' if id=='s2vm' else 'Figure 1','pdfPage':page+1,'cropPoints':list(box),'retrieved':'2026-11-26'}
 panel=Image.new('RGB',(450,360),'#f1f4ef')
 thumb=crop.copy();thumb.thumbnail((425,315))
 panel.paste(thumb,((450-thumb.width)//2,30+(315-thumb.height)//2));ImageDraw.Draw(panel).text((10,9),id+' / Figure 1',fill='black');panels.append(panel)
(root/'assets/data/figure-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
sheet=Image.new('RGB',(1350,360*((len(panels)+2)//3)),'white')
for i,p in enumerate(panels):sheet.paste(p,((i%3)*450,(i//3)*360))
sheet.save(cache/'pdf-cover-crops.jpg')
print('Extracted',len(panels),'reviewed figure crops.')
