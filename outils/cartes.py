#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# EDIT — faire entrer les VRAIES cartes dans le site
# ---------------------------------------------------------------------------
#   python3 outils/cartes.py <dossier des cartes> <dossier de sortie> [--largeur 1200] [--illus]
#
# L'auteur livre ses cartes telles qu'il les imprime : un PNG par face, à
# 300 dpi (1418 × 945 px pour 120 × 80 mm). Le site les montre telles quelles —
# pas un dessin refait —, dans une copie d'écran : WebP, 1200 px de large.
#
# Le nom du fichier est celui de la carte ; ce qui suit entre parenthèses est
# une note de l'auteur et tombe : « L5 (PD1).png » devient L5.webp.
#
# La dernière colonne de pixels de ses exports est à demi transparente : on
# pose la carte sur du NOIR, la couleur de son liseré, pour qu'aucun filet
# clair n'apparaisse au bord.
#
# --illus découpe aussi l'illustration seule (la case du dessin), dans
# <sortie>/illus : elle sert quand le site doit recomposer une carte retouchée.

import os
import re
import sys

from PIL import Image

args = [a for a in sys.argv[1:] if not a.startswith('--')]
if len(args) < 2:
    sys.exit('usage : python3 outils/cartes.py <dossier des cartes> <dossier de sortie> [--largeur 1200] [--illus]')
src, out = args[0], args[1]
largeur = int(sys.argv[sys.argv.index('--largeur') + 1]) if '--largeur' in sys.argv else 1200
illus = '--illus' in sys.argv
os.makedirs(out, exist_ok=True)
if illus:
    os.makedirs(os.path.join(out, 'illus'), exist_ok=True)

total = 0
for f in sorted(os.listdir(src)):
    if f.startswith('.') or not f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
        continue
    nom = re.sub(r'\s*\(.*?\)\s*', '', os.path.splitext(f)[0]).strip()
    im = Image.open(os.path.join(src, f)).convert('RGBA')
    fond = Image.new('RGBA', im.size, (0, 0, 0, 255))
    carte = Image.alpha_composite(fond, im).convert('RGB')
    w, h = carte.size
    ecran = carte if w <= largeur else carte.resize((largeur, round(h * largeur / w)), Image.LANCZOS)
    cible = os.path.join(out, f'{nom}.webp')
    ecran.save(cible, 'WEBP', quality=88, method=6)
    total += os.path.getsize(cible)
    if illus:
        # La case du dessin : à droite de la colonne d'icônes, au-dessus du bandeau.
        case = carte.crop((round(w * 0.17), round(h * 0.02), round(w * 0.99), round(h * 0.70)))
        case = case.resize((900, round(case.size[1] * 900 / case.size[0])), Image.LANCZOS)
        case.save(os.path.join(out, 'illus', f'{nom}.webp'), 'WEBP', quality=84, method=6)
    print(f'{f} → {nom}.webp  {w}×{h} → {ecran.size[0]}×{ecran.size[1]}')
print(f'{total // 1024} ko en tout')
