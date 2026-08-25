#!/usr/bin/env python3
# ---------------------------------------------------------------------------
# EDIT — nettoyage du halo des pastilles
# ---------------------------------------------------------------------------
# Une pastille est découpée à même la carte imprimée, où elle se détache sur le
# fond de son cadrage — vert sur un Plan Large. Le disque découpé étant un peu
# large, et pas tout à fait centré sur la pastille (elle est en fait 3 à 4 px
# plus bas que le centre de l'image), il emportait un croissant de ce fond : un
# halo vert au-dessus des icônes. Invisible à la taille d'une carte à l'écran,
# criant dès qu'on agrandit ou qu'on imprime.
#
# Le contour d'une pastille est son anneau sombre — et c'est un CERCLE. On
# relève le dernier pixel sombre dans 720 directions, on ajuste un cercle sur
# ce nuage, et l'on rend transparent tout ce qui est au-delà.
#
# Ajuster un cercle, et non suivre le bord rayon par rayon : un reflet clair
# sur l'anneau interrompt la trace et le suivi y creusait un trou — c'est ce
# qui avait mangé le bas de l'icône Véhicule.
#
# Usage :  python3 outils/nettoyer-pastilles.py [dossier]   (défaut assets/icones)

import sys, os, math, glob
from PIL import Image

F = 4              # on travaille agrandi, pour un bord lisse au retour
SOMBRE = 105       # luminance en dessous de laquelle un pixel est « l'anneau »
RETRAIT = 3.0      # px agrandis rognés sur le bord : le liseré vert y survivait
FONDU = 4.0        # px agrandis de dégradé, pour ne pas escalier le contour


def cercle(pts):
    """Ajustement algébrique (Kåsa) : x² + y² = 2·cx·x + 2·cy·y + c.

    Le système résout c/2 comme troisième inconnue — d'où le facteur 2 dans le
    rayon, qu'il est facile d'oublier : sans lui l'ajustement rend un cercle
    bien trop grand, et le masque ne rogne plus rien.
    """
    n = len(pts)
    sx = sy = sxx = syy = sxy = sxz = syz = sz = 0.0
    for x, y in pts:
        z = x * x + y * y
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y
        sxz += x * z; syz += y * z; sz += z
    M = [[sxx, sxy, sx, sxz / 2], [sxy, syy, sy, syz / 2], [sx, sy, n, sz / 2]]
    for i in range(3):
        p = max(range(i, 3), key=lambda k: abs(M[k][i]))
        M[i], M[p] = M[p], M[i]
        for k in range(i + 1, 3):
            f = M[k][i] / M[i][i]
            for j in range(i, 4):
                M[k][j] -= f * M[i][j]
    s = [0.0] * 3
    for i in (2, 1, 0):
        s[i] = (M[i][3] - sum(M[i][j] * s[j] for j in range(i + 1, 3))) / M[i][i]
    cx, cy, demi_c = s
    return cx, cy, math.sqrt(max(1e-9, 2 * demi_c + cx * cx + cy * cy))


def bord(px, S, c0):
    """Le dernier pixel sombre dans 720 directions — le nuage de l'anneau."""
    pts = []
    for i in range(720):
        a = math.radians(i * 0.5)
        ca, sa = math.cos(a), math.sin(a)
        r = S / 2
        while r > 0:
            x, y = int(c0 + r * ca), int(c0 + r * sa)
            if 0 <= x < S and 0 <= y < S:
                rr, gg, bb, aa = px[x, y]
                if aa > 100 and (rr + gg + bb) / 3 < SOMBRE:
                    break
            r -= 1
        if r > 0.5 * S / 2:
            pts.append((c0 + r * ca, c0 + r * sa))
    return pts


def nettoyer(chemin):
    im = Image.open(chemin).convert('RGBA')
    W, H = im.size
    gr = im.resize((W * F, H * F), Image.LANCZOS)
    px, S = gr.load(), W * F
    pts = bord(px, S, S / 2 - 0.5)

    # Trois passes de rejet : un reflet ou une entaille laisse un point loin du
    # cercle, et il ne doit pas tirer l'ajustement à lui.
    for _ in range(3):
        cx, cy, R = cercle(pts)
        ec = [abs(math.hypot(x - cx, y - cy) - R) for x, y in pts]
        med = sorted(ec)[len(ec) // 2]
        garde = [p for p, e in zip(pts, ec) if e <= max(2.0, 3 * med)]
        if len(garde) < 100 or len(garde) == len(pts):
            break
        pts = garde
    cx, cy, R = cercle(pts)

    lim = R - RETRAIT
    for y in range(S):
        dy = y - cy
        for x in range(S):
            d = math.hypot(x - cx, dy)
            if d <= lim:
                continue
            rr, gg, bb, aa = px[x, y]
            if not aa:
                continue
            px[x, y] = (rr, gg, bb, int(aa * max(0.0, 1.0 - (d - lim) / FONDU)))
    gr.resize((W, H), Image.LANCZOS).save(chemin, 'WEBP', quality=92, method=6)
    return cx / F, cy / F, R / F


def main():
    dossier = sys.argv[1] if len(sys.argv) > 1 else 'assets/icones'
    for chemin in sorted(glob.glob(os.path.join(dossier, '*.webp'))):
        cx, cy, R = nettoyer(chemin)
        print(f'{os.path.basename(chemin):14s} centre ({cx:.1f}, {cy:.1f}) rayon {R:.1f}')


if __name__ == '__main__':
    main()
