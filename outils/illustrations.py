#!/usr/bin/env python3
"""
EDIT — faire entrer les ILLUSTRATIONS SEULES du Set 3.1

    python3 outils/illustrations.py <dossier>

Le dossier contient une image par plan, nommée par son numéro :
    001.png … 004.png   les Plans de départ
    101.png … 115.png   les Plans Larges
    201.png … 291.png   les Plans Moyens
    301.png … 391.png   les Gros Plans
Une face qui a sa propre illustration se nomme avec sa lettre : 391V.png (la
Fin au recto, « BBG présente » au verso). Un préfixe est toléré : PL101.png.

Chaque image sort en deux définitions, en WebP :
    assets/s31/nu/<clé>.webp   pour l'écran — 1 200 px au plus
    assets/s31/hd/<clé>.webp   pour l'impression — la définition d'origine,
                               jusqu'à 3 200 px
La transparence est posée sur du blanc : c'est la couleur du papier, et une
illustration à ciel transparent virait au noir sur le fond de la carte.

Le script écrit enfin js/illus31.js, la liste de ce qui est arrivé : les cartes
du Set 3.1 prennent ces illustrations aussitôt, et l'Atelier les dessine.
"""
import json
import os
import re
import sys

from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NU = os.path.join(RACINE, 'assets', 's31', 'nu')
HD = os.path.join(RACINE, 'assets', 's31', 'hd')
MOTIF = re.compile(r'^(?:PL|PM|GP|DEP)?\s*(\d{3})\s*([RVrv])?\.(png|jpe?g|webp|tiff?)$', re.I)


def prefixe(n):
    if n < 200:
        return 'pl'          # Plans de départ (0xx) et Plans Larges (1xx)
    return 'pm' if n < 300 else 'gp'


def sur_blanc(im):
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        im = im.convert('RGBA')
        fond = Image.new('RGBA', im.size, (255, 255, 255, 255))
        return Image.alpha_composite(fond, im).convert('RGB')
    return im.convert('RGB')


def reduire(im, cote):
    if max(im.size) <= cote:
        return im
    k = cote / max(im.size)
    return im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)


def main(dossier):
    os.makedirs(NU, exist_ok=True)
    os.makedirs(HD, exist_ok=True)
    cles, ignores = [], []
    for f in sorted(os.listdir(dossier)):
        m = MOTIF.match(f)
        if not m:
            ignores.append(f)
            continue
        n = int(m.group(1))
        cle = f'{prefixe(n)}{m.group(1)}{(m.group(2) or "").upper()}'
        im = sur_blanc(Image.open(os.path.join(dossier, f)))
        reduire(im, 1200).save(os.path.join(NU, f'{cle}.webp'), 'WEBP', quality=84, method=6)
        reduire(im, 3200).save(os.path.join(HD, f'{cle}.webp'), 'WEBP', quality=90, method=6)
        cles.append(cle)
        print(f'  {f:>14} → {cle}  ({im.width} × {im.height})')
    # La liste reprend aussi ce qui était déjà là : un second dépôt complète.
    deja = {x[:-5] for x in os.listdir(NU) if x.endswith('.webp')}
    toutes = sorted(deja | set(cles))
    with open(os.path.join(RACINE, 'js', 'illus31.js'), 'w', encoding='utf-8') as o:
        o.write('// Les illustrations SEULES du Set 3.1 arrivées au site — écrit par\n')
        o.write('// outils/illustrations.py, ne pas retoucher à la main.\n')
        o.write(f'export const NUES = {json.dumps(toutes)};\n')
    print(f'\n{len(cles)} illustration(s) traitée(s), {len(toutes)} en tout.')
    if ignores:
        print(f'Ignorés (nom sans numéro de plan) : {", ".join(ignores)}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
