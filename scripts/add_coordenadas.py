import json
import pgeocode

print('Cargando SEPOMEX...')
with open('public/data/sepomex.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Quitar encabezado si existe
if data[0]['d_codigo'] == 'd_codigo':
    data = data[1:]

nomi = pgeocode.Nominatim('mx')
print(f'Procesando {len(data)} registros...')

for i, item in enumerate(data):
    if i % 5000 == 0:
        print(f'{i}/{len(data)}')

    geo = nomi.query_postal_code(item['d_codigo'])
    if geo is not None:
        item['lat'] = float(geo.latitude) if geo.latitude else None
        item['lng'] = float(geo.longitude) if geo.longitude else None

with open('public/data/sepomex_con_coords.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Listo. Archivo guardado en public/data/sepomex_con_coords.json')