"""Synchronize the canonical WCSpedia runtime and rebuild the single stylesheet."""
from pathlib import Path
import argparse,subprocess,sys,shutil
p=argparse.ArgumentParser();p.add_argument('wcspedia',type=Path);args=p.parse_args()
out=Path(__file__).resolve().parents[1]/'source/wcspedia'
files=['credit-dashboard.css','ui.js','confluence-upload/attachments/wcspedia-style.css','confluence-upload/attachments/wcspedia-loading-overlay.js']
for name in files:
 if not (args.wcspedia/name).is_file():raise SystemExit('Missing shared source: '+name)
for name in files:
 target=out/name;target.parent.mkdir(parents=True,exist_ok=True)
 if (args.wcspedia/name).resolve()!=target.resolve():shutil.copy2(args.wcspedia/name,target)
subprocess.run([sys.executable,str(Path(__file__).with_name('build_pages.py'))],check=True)
print('One shared stylesheet rebuilt; no standalone UI stylesheet emitted.')
