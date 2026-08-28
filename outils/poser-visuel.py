#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# EDIT — poser une illustration neuve dans le matériel
# ---------------------------------------------------------------------------
# `extraire-visuels.py` fabrique les images à partir des PDF d'impression.
# Celui-ci fait l'autre moitié du travail : prendre une illustration livrée à
# part — un dessin neuf, un recadrage — et la mettre aux dimensions et aux
# conventions d'un emplacement du jeu.
#
# Trois choses à respecter, relevées sur les visuels existants :
#
#   — la TAILLE exacte de l'emplacement. Un Plan Moyen fait 421 × 316, un Gros
#     Plan 202 × 316, un Plan Large 642 × 317. Ce sont les proportions de la
#     part de carte qui reste au-dessus de la zone d'information ;
#   — la BOÎTE DU MINUTAGE, repeinte en noir au coin haut-gauche. L'application
#     y réécrit le minutage à partir d'une valeur qu'elle contrôle : sans ce
#     noir, les chiffres flotteraient sur l'illustration ;
#   — le RECADRAGE. L'image source n'a pas les proportions de la cible : on y
#     découpe une fenêtre. Par défaut la plus grande possible, centrée ; sinon
#     celle que l'on désigne, ce qui sert à faire un Gros Plan — un zoom — dans
#     un Plan Moyen.
#
# Usage :
#   poser-visuel.py <source> <cible> [--zoom x0,y0,x1,y1] [--vers <fichier>]
#
#   <cible>   pm/201, gp/303, pl/104 — l'emplacement visé
#   --zoom    la fenêtre à découper dans la source, en fractions de 0 à 1
#             (par exemple 0.45,0,1,1 pour la moitié droite)
#   --vers    écrire ailleurs que dans assets/ — pour regarder avant de poser
#
# Exemples :
#   poser-visuel.py neuf.png pm/201
#   poser-visuel.py neuf.png gp/303 --zoom 0.42,0.05,0.92,0.95
#
# Dépendance : Pillow.

import sys, os
from PIL import Image, ImageDraw

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# Taille de chaque emplacement, et boîte du minutage à repeindre. Mesurées sur
# les visuels livrés : la boîte a la même taille partout, c'est la carte qui
# change de largeur.
GABARITS = {
    'pm': {'taille': (421, 316), 'tc': (0, 0, 131, 42)},
    'gp': {'taille': (202, 316), 'tc': (0, 0, 131, 43)},
    'pl': {'taille': (642, 317), 'tc': (0, 0, 130, 44)},
}

NOIR = (10, 10, 10)


def fenetre(source, ratio, zoom=None):
    """La fenêtre à découper : celle qu'on demande, ou la plus grande centrée."""
    L, H = source.size
    if zoom:
        x0, y0, x1, y1 = (int(round(v * d)) for v, d in zip(zoom, (L, H, L, H)))
        return source.crop((x0, y0, x1, y1))
    # La plus grande fenêtre du bon rapport, centrée. On rogne le côté long.
    if L / H > ratio:
        l = int(round(H * ratio))
        x = (L - l) // 2
        return source.crop((x, 0, x + l, H))
    h = int(round(L / ratio))
    y = (H - h) // 2
    return source.crop((0, y, L, y + h))


def poser(chemin_source, cible, zoom=None, vers=None):
    dossier, numero = cible.split('/')
    if dossier not in GABARITS:
        raise SystemExit(f'emplacement inconnu : {dossier} (attendu pm, gp ou pl)')
    g = GABARITS[dossier]
    large, haut = g['taille']

    src = Image.open(chemin_source).convert('RGB')
    vue = fenetre(src, large / haut, zoom)
    # Le rapport de la fenêtre demandée n'est pas forcément celui de la cible :
    # on le corrige en la recentrant plutôt qu'en déformant le dessin.
    if abs(vue.size[0] / vue.size[1] - large / haut) > 0.001:
        vue = fenetre(vue, large / haut)
    out = vue.resize((large, haut), Image.LANCZOS)

    ImageDraw.Draw(out).rectangle(g['tc'], fill=NOIR)

    dest = vers or os.path.join(RACINE, 'assets', dossier, f'{numero}.webp')
    parent = os.path.dirname(dest)
    if parent:
        os.makedirs(parent, exist_ok=True)
    out.save(dest, 'WEBP', quality=92, method=6)
    print(f'{chemin_source}  →  {dest}')
    print(f'   source {src.size[0]}×{src.size[1]}  ·  fenêtre {vue.size[0]}×{vue.size[1]}'
          f'  ·  posée en {large}×{haut}  ·  boîte du minutage repeinte')
    return dest


if __name__ == '__main__':
    args = sys.argv[1:]
    if len(args) < 2:
        raise SystemExit(__doc__ or 'usage : poser-visuel.py <source> <cible> [--zoom …] [--vers …]')
    source, cible = args[0], args[1]
    zoom = vers = None
    i = 2
    while i < len(args):
        if args[i] == '--zoom':
            zoom = tuple(float(v) for v in args[i + 1].split(',')); i += 2
        elif args[i] == '--vers':
            vers = args[i + 1]; i += 2
        else:
            raise SystemExit(f'option inconnue : {args[i]}')
    poser(source, cible, zoom, vers)
