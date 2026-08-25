#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# EDIT — extraction des visuels depuis les PDF d'impression
# ---------------------------------------------------------------------------
# Régénère deux choses :
#
#   assets/{pl,pm,gp}/<num>.webp   l'illustration seule, recadrée au-dessus de
#                                  la zone d'information — pastilles, bandeau
#                                  et libellé sont redessinés par l'application
#                                  et ne doivent plus figurer sur l'image ;
#   assets/icones/<ID>.webp        les huit pastilles, découpées à même les
#                                  cartes pour que l'application affiche
#                                  exactement les icônes imprimées.
#
# Usage :  python3 outils/extraire-visuels.py <dossier-des-pdf>
# Dépendances : poppler-utils (pdftoppm) et Pillow.

import sys, os, glob, re, subprocess, tempfile
from PIL import Image, ImageDraw

# --- Géométrie relevée sur les cartes (fractions de la carte) --------------
# Structure verticale : illustration jusqu'à 69 %, languette des pastilles
# jusqu'à 78,5 %, bandeau jusqu'à 93,7 %, puis le libellé.

HAUT_INFO      = 0.69     # tout ce qui est en dessous est redessiné par l'app
PASTILLE_CY    = 0.7405   # centre vertical de la languette
PASTILLE_CX0   = 0.0640   # centre de la première pastille
PASTILLE_PAS   = 0.0924   # écart entre deux pastilles
PASTILLE_R     = 48       # rayon en pixels, à 300 dpi
BANDEAU_CY     = 0.878    # centre vertical du bandeau d'objectif
BANDEAU_CX     = 0.684    # centre de l'icône, à droite du « n × »
BANDEAU_R      = 50

# Boîte du minutage imprimé, en haut à gauche. Sa taille est la même sur tous
# les formats : on l'exprime donc en fractions de la HAUTEUR de la carte.
# Elle est repeinte en noir avant recadrage — l'application redessine le
# minutage exactement au même endroit, à partir d'une valeur qu'elle contrôle.
TC_X0, TC_X1 = 0.0201, 0.2917
TC_Y0, TC_Y1 = 0.0211, 0.1078
TC_MARGE     = 0.0042

DPI_CARTES = 150   # les illustrations n'ont pas besoin de plus
DPI_ICONES = 300   # les pastilles, si : elles sont petites

PDFS = {
    'pl': 'PLANS_LARGES',
    'pm': 'PLANS_MOYENS',
    'gp': 'GROS_PLANS',
}

# Où trouver chaque icône : (format, page, « pastille n° i » ou 'bandeau')
SOURCES_ICONES = {
    'HEROINE':  ('pl', 5, 0),
    'ENNEMI':   ('pl', 5, 1),
    'ALLIE':    ('pl', 5, 2),
    'ARME':     ('pl', 5, 3),
    'OBJET':    ('pl', 6, 1),
    'VEHICULE': ('pl', 6, 2),
    'MORT':     ('gp', 4, 'bandeau'),
    'NEANT':    ('gp', 5, 'bandeau'),
}


def trouver_pdf(dossier, motif):
    for f in glob.glob(os.path.join(dossier, '*.pdf')):
        if motif in os.path.basename(f):
            return f
    raise SystemExit(f'PDF introuvable pour {motif} dans {dossier}')


def rendre(pdf, dest, dpi, page=None):
    cmd = ['pdftoppm', '-png', '-r', str(dpi)]
    if page:
        cmd += ['-f', str(page), '-l', str(page)]
    subprocess.run(cmd + [pdf, dest], check=True)


def numero_de_page(nom):
    return int(re.search(r'-(\d+)\.png$', nom).group(1))


def effacer_minutage(im):
    """Repeint la boîte du minutage en noir : l'application la redessine."""
    H = im.height
    d = ImageDraw.Draw(im)
    d.rounded_rectangle(
        (int((TC_X0 - TC_MARGE) * H), int((TC_Y0 - TC_MARGE) * H),
         int((TC_X1 + TC_MARGE) * H), int((TC_Y1 + TC_MARGE) * H)),
        radius=int(0.012 * H), fill=(10, 10, 13))


# La carte imprimée porte son propre cadre noir, de six à huit pixels à cette
# résolution. Le laisser dans l'image le faisait s'ajouter au cadre que
# l'application dessine : le noir était deux fois plus épais autour de
# l'illustration qu'autour des bandeaux, qui n'ont que celui de l'application.
# On le rogne donc à l'extraction.
#
# La détection a trois pièges, tous rencontrés :
#   — la compression WebP éclaircit le noir du cadre (jusqu'à ~85 de moyenne) :
#     un seuil trop strict laissait le cadre entier sur certaines cartes ;
#   — les coins arrondis de la carte laissent du blanc aux extrémités d'une
#     ligne de bord, ce qui faisait rater les images étroites (Gros Plans) :
#     on échantillonne le centre du bord, coins exclus ;
#   — une colonne de débord d'impression, blanche, peut précéder le cadre :
#     on la tolère et on la coupe avec lui.
# Enfin le cadre doit SE REFERMER : une image sombre au-delà du plafond n'est
# pas un cadre, c'est le dessin (le Raccord BBG, un chapeau noir au bord) — on
# n'y touche pas.
CADRE_MAX = 12        # profondeur maximale d'un cadre, en pixels à DPI_CARTES
CADRE_SEUIL = 85      # au-delà de cette moyenne par canal, ce n'est plus du noir
CADRE_PART = 0.85     # proportion du bord (coins exclus) qui doit être noire
CADRE_COINS = 0.10    # part du bord écartée à chaque extrémité


def _sombre(im, cote, i):
    """Part de pixels noirs de la i-ième ligne du bord, coins exclus."""
    px = im.load()
    W, H = im.size
    longueur = W if cote in 'hb' else H
    a = int(longueur * CADRE_COINS)
    b = max(a + 1, int(longueur * (1 - CADRE_COINS)))
    if cote == 'h':   pts = [px[x, i] for x in range(a, b, 2)]
    elif cote == 'b': pts = [px[x, H - 1 - i] for x in range(a, b, 2)]
    elif cote == 'g': pts = [px[i, y] for y in range(a, b, 2)]
    else:             pts = [px[W - 1 - i, y] for y in range(a, b, 2)]
    return sum(1 for c in pts if sum(c[:3]) < CADRE_SEUIL * 3) / len(pts)


def _course_noire(im, cote):
    prof_max = min(CADRE_MAX, (im.height if cote in 'hb' else im.width) // 4)
    sombre = lambda i: _sombre(im, cote, i)

    # Le cadre peut commencer une ou deux lignes plus loin (débord blanc).
    depart = -1
    for k in range(0, 3):
        if k + 1 < prof_max and sombre(k) >= CADRE_PART and sombre(k + 1) >= CADRE_PART:
            depart = k
            break
    if depart < 0:
        return 0
    n = depart
    while n < prof_max and sombre(n) >= CADRE_PART:
        n += 1
    # Pas de refermeture dans le plafond : c'est du dessin, pas un cadre.
    if n >= prof_max and sombre(prof_max) >= CADRE_PART:
        return 0
    # La ligne de transition, à moitié teintée par l'anticrénelage, part avec.
    if n < prof_max and sombre(n) >= 0.30:
        n += 1
    return n


def rogner_cadre(im):
    """Retire le cadre noir imprimé, sans entamer le dessin."""
    h, b = _course_noire(im, 'h'), _course_noire(im, 'b')
    g, d = _course_noire(im, 'g'), _course_noire(im, 'd')
    if not (h or b or g or d):
        return im
    return im.crop((g, h, im.width - d, im.height - b))


def rogner_lot(images, cotes='hgd'):
    """Rogne toute une planche d'un coup, à profondeur unique.

    Le cadre imprimé est au même endroit sur toutes les pages d'un même PDF :
    sa profondeur ne varie pas, seule sa détection varie — un dessin sombre
    collé au bord l'empêche de « se refermer », l'anticrénelage la fait fermer
    une ligne trop tôt. On la mesure donc là où elle est nette, on prend la
    médiane de la planche, plus une ligne d'anticrénelage, et l'on coupe
    TOUTES les pages de cette même profondeur. Toutes les images d'une famille
    reçoivent ainsi exactement le même traitement — et les cartes rendues,
    exactement la même bordure.

    Le bas n'est pas rogné par défaut : nos images sont coupées en pleine
    carte, au-dessus de la zone d'information — il n'y a pas de cadre là.
    """
    import statistics
    courses = [{c: _course_noire(im, c) for c in cotes} for im in images]
    coupe = {c: 0 for c in 'hbgd'}
    for c in cotes:
        vals = [x[c] for x in courses if x[c] > 0]
        if vals:
            coupe[c] = round(statistics.median(vals)) + 1
    return [im.crop((coupe['g'], coupe['h'], im.width - coupe['d'], im.height - coupe['b']))
            for im in images]


def main():
    dossier = sys.argv[1] if len(sys.argv) > 1 else '.'
    racine = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

    # --- Correspondance page -> numéro de plan, lue dans js/data.js ---------
    data = open(os.path.join(racine, 'js/data.js'), encoding='utf-8').read()
    scenes = re.findall(r'^\s*S\(\s*(\d+),\s*\d+,\s*\'[^\']+\',\s*(\d+),\s*(\d+),', data, re.M)
    plans = re.findall(r'^\s*PL\((\d+),', data, re.M)
    mapping = {'pm': {}, 'gp': {}, 'pl': {}}
    for idx, pm, gp in scenes:
        mapping['pm'][int(idx)] = pm
        mapping['gp'][int(idx)] = gp
    for i, num in enumerate(plans, start=1):
        mapping['pl'][i] = num

    with tempfile.TemporaryDirectory() as tmp:
        # --- Illustrations recadrées ---------------------------------------
        for fmt, motif in PDFS.items():
            pdf = trouver_pdf(dossier, motif)
            base = os.path.join(tmp, fmt)
            rendre(pdf, base, DPI_CARTES)
            sortie = os.path.join(racine, 'assets', fmt)
            os.makedirs(sortie, exist_ok=True)
            n = 0
            planche = []
            for f in sorted(glob.glob(base + '-*.png')):
                page = numero_de_page(f)
                num = mapping[fmt].get(page)
                if not num:
                    print(f'  page {fmt} {page} sans numéro de plan, ignorée')
                    continue
                im = Image.open(f).convert('RGB')
                effacer_minutage(im)
                planche.append((num, im.crop((0, 0, im.width, int(im.height * HAUT_INFO)))))
            # Le cadre imprimé se rogne planche par planche : les pages où il se
            # referme donnent sa profondeur aux pages noyées dans un dessin sombre.
            rognees = rogner_lot([im for _, im in planche])
            for (num, _), im in zip(planche, rognees):
                im.save(os.path.join(sortie, f'{num}.webp'), 'WEBP', quality=82, method=6)
                n += 1
            print(f'{fmt} : {n} illustrations recadrées')

        # --- Pastilles ------------------------------------------------------
        sortie = os.path.join(racine, 'assets/icones')
        os.makedirs(sortie, exist_ok=True)
        cache = {}
        for nom, (fmt, page, quoi) in SOURCES_ICONES.items():
            cle = (fmt, page)
            if cle not in cache:
                pdf = trouver_pdf(dossier, PDFS[fmt])
                base = os.path.join(tmp, f'ico-{fmt}-{page}')
                rendre(pdf, base, DPI_ICONES, page)
                cache[cle] = Image.open(sorted(glob.glob(base + '-*.png'))[0]).convert('RGB')
            im = cache[cle]
            if quoi == 'bandeau':
                cx, cy, r = im.width * BANDEAU_CX, im.height * BANDEAU_CY, BANDEAU_R
            else:
                cx = im.width * (PASTILLE_CX0 + quoi * PASTILLE_PAS)
                cy, r = im.height * PASTILLE_CY, PASTILLE_R
            decouper_disque(im, cx, cy, r) \
                .resize((128, 128), Image.LANCZOS) \
                .save(os.path.join(sortie, f'{nom}.webp'), 'WEBP', quality=92, method=6)
        print(f'icônes : {len(SOURCES_ICONES)} pastilles extraites')


if __name__ == '__main__':
    main()
