#!/usr/bin/env python3
"""Recreate web photographs from a reviewed selection; requires Pillow."""

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


def export(selection_path, source_directory):
    project = Path(__file__).resolve().parent.parent
    source_directory = source_directory.resolve()
    selection = json.loads(selection_path.read_text(encoding='utf-8'))
    sources, destinations = set(), set()
    prepared = []

    # Validate the complete selection before writing any derivatives.
    for photo in selection['photos']:
        source = (source_directory / photo['source']).resolve()
        destination = (project / 'public' / photo['src'].lstrip('/')).resolve()
        if not source.is_relative_to(source_directory) or not source.is_file():
            raise ValueError(f'Missing or invalid source: {photo["source"]}')
        if not destination.is_relative_to(project / 'public' / 'photos') or destination.suffix != '.webp':
            raise ValueError(f'Invalid output: {photo["src"]}')
        if source in sources or destination in destinations:
            raise ValueError(f'Repeated source or output: {photo["source"]}')
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if digest != photo['sourceSha256']:
            raise ValueError(f'Source has changed since selection: {photo["source"]}')
        sources.add(source)
        destinations.add(destination)
        prepared.append((photo, source, destination))

    for photo, source, destination in prepared:
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            image.thumbnail((photo['maxEdge'], photo['maxEdge']), Image.Resampling.LANCZOS)
            destination.parent.mkdir(parents=True, exist_ok=True)
            options = {'quality': photo['quality'], 'method': 6}
            if original.info.get('icc_profile'):
                options['icc_profile'] = original.info['icc_profile']
            # No EXIF or XMP is copied; the source remains intact.
            image.save(destination, 'WEBP', **options)
        print(f'{destination.name}: {image.width} × {image.height}, {destination.stat().st_size // 1024} KB')


if __name__ == '__main__':
    project = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--selection', type=Path, default=project / 'content/selections/japan.json')
    parser.add_argument('--source', type=Path, default=project.parent / 'dumps/japan')
    args = parser.parse_args()
    export(args.selection, args.source)
