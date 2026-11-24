"""Import the campus map from a GeoJSON file.

    python -m app.gis_import /path/to/GBU_map.geojson [--dry-run]

Safe to run again whenever the file is updated; see app/services/gis_import.py for the matching rules.
"""
import json
import sys

from app.db import SessionLocal
from app.services.gis_import import GisImportError, import_geojson


def main(argv: list[str]) -> int:
    args = [a for a in argv if not a.startswith('--')]
    dry_run = '--dry-run' in argv
    if len(args) != 1:
        print(__doc__)
        return 2
    with open(args[0], encoding='utf-8') as fh:
        data = json.load(fh)
    with SessionLocal() as db:
        try:
            report = import_geojson(db, data)
        except GisImportError as exc:
            print(f'error: {exc}')
            return 1
        if dry_run:
            db.rollback()
        else:
            db.commit()
    print(f"{'DRY RUN, nothing saved' if dry_run else 'Imported'}")
    print(f'boundary: {report.boundary or "-"}')
    for title, rows in (('created', report.created), ('updated', report.updated), ('skipped', report.skipped),
                        ('warnings', report.warnings)):
        print(f'{title} ({len(rows)}):')
        for row in rows:
            print(f'  - {row}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
