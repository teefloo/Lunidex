from pathlib import Path
from datetime import datetime, timezone
import json, csv, hashlib
out=Path(__file__).resolve().parent.parent
p=out/'2026-10-02-preuves'
rows=list(csv.DictReader((out/'2026-10-02-matrice-couverture.csv').open(encoding='utf-8-sig')))
report=(out/'2026-10-02-audit-fonctionnel-lunidex.md').read_text()
entries=[]
files=[x for x in p.iterdir() if x.is_file() and x.name!='manifest-preuves.json']+list(out.glob('*.md'))+list(out.glob('*.csv'))
for f in sorted(files):
 refs=[r['identifiant'] for r in rows if r['preuve']==f.name]
 kind='preuve référencée' if refs or str(f) in report else 'artefact secondaire non cité'
 if f.suffix=='.json':
  try:
   data=json.loads(f.read_text())
   if isinstance(data,dict) and 'raw' in data: kind='tentative inconclusive ou bloquée ; aucune réussite fondée sur ce fichier'
  except json.JSONDecodeError:
   kind='fixture JSON invalide intentionnelle' if f.name=='invalid-backup.json' else 'format JSON invalide à examiner'
 if f.parent==out:kind='livrable'
 entries.append({'fichier':str(f.relative_to(out)),'octets':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'artefact_modifie_utc':datetime.fromtimestamp(f.stat().st_mtime,timezone.utc).isoformat(),'classification':kind,'scenarios_matrice':refs,'cite_dans_rapport':str(f)in report})
result={'genere_utc':datetime.now(timezone.utc).isoformat(),'note':'La date est celle du fichier. Voir les horodatages internes pour les observations. Le manifeste exclut sa propre empreinte. Les fichiers secondaires ne prouvent pas seuls une anomalie.','fichiers':entries}
(p/'manifest-preuves.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Manifest:',len(entries),'fichiers')

