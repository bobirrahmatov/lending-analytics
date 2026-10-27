"""Run the current local regression gates; no live Confluence connection required."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
commands = [[sys.executable, 'tools/verify_page_package.py']]
# The crossfilter name is only a compatibility alias of test_portfolio_journey.
commands += [['node', str(f.relative_to(root))] for f in sorted((root / 'tools').glob('test_*.cjs'))
             if f.name != 'test_portfolio_crossfilter.cjs']
commands += [[sys.executable, str(f.relative_to(root))]
             for f in sorted((root / 'tools').glob('test_*.py'))]
commands += [[sys.executable, 'tools/validate_release.py', folder, '--allow-demo']
             for folder in ['attachments', 'demo-comparison']]
failures = []
for command in commands:
    print('\n' + ' '.join(command), flush=True)
    try:
        result = subprocess.run(command, cwd=root, timeout=180)
        if result.returncode:
            failures.append(' '.join(command))
    except subprocess.TimeoutExpired:
        failures.append(' '.join(command) + ' (timeout)')
if failures:
    print('\nFAILED:\n' + '\n'.join(failures), file=sys.stderr)
    sys.exit(1)
print(f'\nPASS: {len(commands)} local regression commands.')
