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


def decouper_disque(im, cx, cy, r):
    """Découpe un disque et rend le pourtour transparent."""
    boite = (int(cx - r), int(cy - r), int(cx + r), int(cy + r))
    vignette = im.crop(boite).convert('RGBA')
    masque = Image.new('L', vignette.size, 0)
    ImageDraw.Draw(masque).ellipse((0, 0, vignette.width - 1, vignette.height - 1), fill=255)
    vignette.putalpha(masque)
    return vignette


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
            for f in sorted(glob.glob(base + '-*.png')):
                page = numero_de_page(f)
                num = mapping[fmt].get(page)
                if not num:
                    print(f'  page {fmt} {page} sans numéro de plan, ignorée')
                    continue
                im = Image.open(f).convert('RGB')
                effacer_minutage(im)
                im.crop((0, 0, im.width, int(im.height * HAUT_INFO))) \
                  .save(os.path.join(sortie, f'{num}.webp'), 'WEBP', quality=82, method=6)
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
