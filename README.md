# Site web COPHIR

Site vitrine officiel de COPHIR : 5 pages statiques en HTML, CSS et JavaScript, sans framework ni dépendance. Il s'héberge tel quel sur n'importe quel hébergeur statique (Netlify, Cloudflare Pages, OVH, GitHub Pages…).

## Pages

| Fichier | Page | Titre SEO |
|---|---|---|
| `index.html` | Accueil | COPHIR \| Oil & Gas Business Development in West Africa |
| `local-companies.html` | For Local Companies | Technical Partners for Local Oil & Gas Companies \| COPHIR |
| `international-contractors.html` | For International Contractors | Oil & Gas Tenders and Local Partners in West Africa \| COPHIR |
| `about.html` | About | About COPHIR \| West African Oil & Gas |
| `contact.html` | Contact (2 formulaires) | Contact COPHIR \| West African Oil & Gas |

## Structure

```
src/pages/        contenu de chaque page (à modifier)
src/partials/     en-tête et pied de page communs
src/i18n/fr.json  traductions françaises (anglais → français)
css/style.css     styles
js/main.js        menu, animations, lecteur vidéo, langue, formulaires
js/i18n-fr.js     généré par build.py, ne pas modifier
assets/           logo, images (extraites de la VSL), vidéo web
build.py          assemble les pages finales à la racine
```

Les fichiers `*.html` à la racine sont générés. Pour modifier un texte : éditer `src/pages/…`, ajouter sa traduction dans `src/i18n/fr.json`, puis lancer :

```
python3 build.py --strict
```

Le script signale toute phrase anglaise sans traduction française (`--strict` le fait échouer dans ce cas). Seul Python 3 est requis.

## Langue EN / FR

Le site est rédigé en anglais. Le bouton EN/FR de l'en-tête bascule toute la page en français à partir de `src/i18n/fr.json`. Un visiteur dont le navigateur est en français voit le site en français par défaut, et son choix est mémorisé.

## Hébergement Infomaniak et déploiement automatique

À chaque mise à jour de la branche `main`, l'action GitHub `.github/workflows/deploy-infomaniak.yml` reconstruit les pages et les copie par SSH sur l'hébergement Infomaniak. Tant que la configuration ci-dessous n'est pas faite, l'action se contente de passer son tour.

Configuration, une seule fois :

1. **Infomaniak (Manager > Hébergement web)** : créer le site pour le domaine, puis un compte **FTP + SSH**. Noter le nom d'hôte SSH, l'utilisateur et le dossier du site (ex. `sites/cophir.com`).
2. Générer une paire de clés SSH ed25519 sur un ordinateur, ajouter la **clé publique** au compte SSH Infomaniak.
3. **GitHub (dépôt Propal-Web > Settings > Secrets and variables > Actions)** :
   - Secrets : `INFOMANIAK_SSH_HOST`, `INFOMANIAK_SSH_USER`, `INFOMANIAK_SSH_KEY` (la clé **privée**).
   - Variables : `INFOMANIAK_TARGET_DIR` (dossier du site), et `INFOMANIAK_SSH_PORT` seulement si ce n'est pas 22.
4. Onglet **Actions** > « Deploy to Infomaniak » > **Run workflow** pour un premier envoi.

Seuls les fichiers du site sont envoyés (pas `src/`, `build.py`, ni ce README). Les fichiers supprimés du site ne sont pas effacés du serveur.

## Formulaires

Sur Infomaniak, les deux formulaires de contact envoient chaque demande par e-mail à contact@cophir.com via `contact.php` (PHP, inclus dans l'hébergement). L'expéditeur technique est `site@cophir.com` : Infomaniak exige une adresse d'un domaine hébergé sur le même compte, à adapter dans `contact.php` si besoin (constantes `CONTACT_TO` et `CONTACT_FROM`). La réponse au visiteur se fait simplement avec « Répondre », l'adresse du visiteur étant en « Reply-To ». Si l'envoi échoue, le site propose au visiteur un e-mail pré-rempli.

`.htaccess` force le HTTPS, déclare le type des sous-titres de la vidéo, active la compression et le cache.

## Points à valider avant mise en ligne

Le brief marque plusieurs éléments [TO CONFIRM]. Ajouter `#review` à l'adresse de n'importe quelle page (ex. `about.html#review`) pour les afficher encadrés en orange :

- Contrat de 5 M EUR (accueil, chiffres clés, et page About)

Autres points :

- Domaine : `build.py` utilise `https://www.cophir.com` (variable `SITE_URL`) pour les URL canoniques, l'aperçu des liens partagés et le sitemap. À ajuster si le domaine diffère.
- Liens LinkedIn et réseaux sociaux : aucun fourni, donc aucun affiché.
- Images : les visuels des secteurs, de l'accueil, des pages International et Contact sont extraits de la VSL. Les visuels de la page Local Companies et de la page About (hors photo de groupe, fournie par COPHIR) ont été générés via ElevenLabs (modèle Seedream 5 Pro). Aucune image n'est réutilisée d'une section à l'autre.
- Vidéo : `assets/video/cophir-vsl.mp4` (13 Mo) est la VSL v15 recompressée, dont la bande de sous-titres incrustés a été retirée par recadrage. Les sous-titres français sont dans `assets/video/cophir-vsl.fr.vtt`, affichés en grand par le lecteur. Si la VSL change, il faut régénérer les deux fichiers.
