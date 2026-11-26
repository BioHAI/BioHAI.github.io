from pathlib import Path
import json, re
import pdfplumber
import pypdfium2 as pdfium
from PIL import Image, ImageDraw

cache=Path(__file__).resolve().parents[2]/'.research-cache'
previews=[]
for file in sorted(cache.glob('*.pdf')):
    try:
        with pdfplumber.open(file) as doc:
            found=[]
            for i,page in enumerate(doc.pages[:9]):
                text=page.extract_text() or ''
                matches=[m for m in re.finditer(r'(?:Figure|Fig\.?)[\s\n]*1\b[\s:|.]',text)]
                if not matches: continue
                lines=page.extract_text_lines()
                caps=[{'text':l['text'][:180],'y':round(l['top'],1),'x':round(l['x0'],1)} for l in lines if re.match(r'(?:Figure|Fig\.?)[\s]*1\b',l['text'])]
                if not caps: continue
                print(json.dumps({'id':file.stem,'page':i,'size':[page.width,page.height],'caption':caps,'title':(doc.pages[0].extract_text() or '')[:170]},ensure_ascii=False))
                pdf=pdfium.PdfDocument(str(file))
                bitmap=pdf[i].render(scale=0.75).to_pil().convert('RGB')
                bitmap.thumbnail((430,600))
                panel=Image.new('RGB',(450,640),'#edf0ec')
                ImageDraw.Draw(panel).text((12,8),f'{file.stem} / page {i+1}',fill='black')
                panel.paste(bitmap,((450-bitmap.width)//2,30))
                previews.append(panel)
                break
    except Exception as e:print(file.stem,str(e)[:120])
sheet=Image.new('RGB',(450*3,640*((len(previews)+2)//3)),'white')
for n,panel in enumerate(previews):sheet.paste(panel,((n%3)*450,(n//3)*640))
sheet.save(cache/'pdf-figure-review.jpg')
