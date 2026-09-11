#!/usr/bin/env python3
"""Genera un reference.docx para pandoc a partir del default, con:
- salto de página antes de cada Heading 1 (cada CU/sección en su propia hoja),
- interlineado del cuerpo más legible (1.15).
Uso:
  pandoc --print-default-data-file reference.docx > default.docx
  python make-reference.py default.docx reference.docx
"""
import sys, re, zipfile

src, dst = sys.argv[1], sys.argv[2]

with zipfile.ZipFile(src) as z:
    styles = z.read('word/styles.xml').decode('utf-8')

# 1) Heading1: insertar <w:pageBreakBefore/> dentro de su <w:pPr>
def edit_h1(block):
    return block.replace('<w:pPr>', '<w:pPr>\n      <w:pageBreakBefore />', 1)

styles = re.sub(
    r'(<w:style\b[^>]*w:styleId="Heading1".*?</w:style>)',
    lambda m: edit_h1(m.group(1)),
    styles, count=1, flags=re.S)

# 2) Interlineado del cuerpo (docDefaults): 1.15 y menos espacio posterior
styles = styles.replace(
    '<w:spacing w:after="200" />',
    '<w:spacing w:after="140" w:line="276" w:lineRule="auto" />', 1)

# Reempaquetar: copiar todo el docx y reemplazar word/styles.xml
with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        if item.filename == 'word/styles.xml':
            zout.writestr(item, styles.encode('utf-8'))
        else:
            zout.writestr(item, zin.read(item.filename))

print('OK ->', dst)
