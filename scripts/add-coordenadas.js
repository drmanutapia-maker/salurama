const fs = require('fs');
const pgeocode = require('pgeocode'); // npm install pgeocode

const nomi = pgeocode.Nominatim('mx');
const sepomex = JSON.parse(fs.readFileSync('./public/data/sepomex.json', 'utf8'));

console.log('Obteniendo coordenadas para', sepomex.length, 'registros...');

const conCoordenadas = sepomex.map((item, i) => {
  if (i % 5000 === 0) console.log(`Procesando ${i}...`);
  
  const geo = nomi.query_postal_code(item.d_codigo);
  return {
    ...item,
    lat: geo ? geo.latitude : null,
    lng: geo ? geo.longitude : null
  };
});

fs.writeFileSync('./public/data/sepomex_con_coords.json', JSON.stringify(conCoordenadas, null, 2));
console.log('Listo. Archivo con coordenadas creado.');