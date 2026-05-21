import json, csv

print('Leyendo archivo con coordenadas...')
with open('public/data/sepomex_con_coords.json', encoding='utf-8') as f:
    data = json.load(f)

print('Creando CSV...')
with open('sepomex_final.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(['cp','estado','municipio','ciudad','colonia','lat','lng'])
    for r in data:
        w.writerow([
            r.get('d_codigo'),
            r.get('d_estado'),
            r.get('d_mnpio'),
            r.get('d_ciudad'),
            r.get('d_asentamiento'),
            r.get('lat'),
            r.get('lng')
        ])

print('Listo. CSV creado: sepomex_final.csv')