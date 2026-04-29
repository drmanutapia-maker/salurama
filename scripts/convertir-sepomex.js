const fs = require('fs')
const path = require('path')

console.log('🔄 Convirtiendo SEPOMEX TXT a JSON...')

// Ruta del archivo descargado
const inputFile = path.join(__dirname, '../Listado_Codigos_Postales.txt')
const outputFile = path.join(__dirname, '../public/data/sepomex.json')

// Verificar que existe el archivo
if (!fs.existsSync(inputFile)) {
  console.error('❌ No se encuentra el archivo TXT')
  console.log('📍 Asegúrate de que esté en: mediopen-app/Listado_Codigos_Postales.txt')
  process.exit(1)
}

// Crear carpeta de salida si no existe
const outputDir = path.dirname(outputFile)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
  console.log('📁 Carpeta creada:', outputDir)
}

// Leer y convertir
console.log('📖 Leyendo archivo TXT...')
const content = fs.readFileSync(inputFile, 'utf-8')
const lines = content.split('\n')
const results = []

console.log(`📊 Procesando ${lines.length} líneas...`)

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue
  
  // El formato SEPOMEX es: d_codigo|d_asentamiento|d_tipo_asentamiento|d_mnpio|d_estado|d_ciudad|c_estado|c_mnpio|id_asentamiento_cp
  const values = line.split('|')
  
  if (values.length >= 8) {
    results.push({
      d_codigo: values[0]?.trim() || '',
      d_asentamiento: values[1]?.trim() || '',
      d_tipo_asentamiento: values[2]?.trim() || '',
      d_mnpio: values[3]?.trim() || '',
      d_estado: values[4]?.trim() || '',
      d_ciudad: values[5]?.trim() || '',
      c_estado: values[6]?.trim() || '',
      c_mnpio: values[7]?.trim() || '',
      id_asentamiento_cp: values[8]?.trim() || '',
    })
  }
  
  // Mostrar progreso cada 5000 registros
  if (i % 5000 === 0 && i > 0) {
    console.log(`  ⏳ Progreso: ${i} / ${lines.length} registros...`)
  }
}

// Guardar JSON
console.log('💾 Guardando JSON...')
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2))

// Estadísticas
const fileSize = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2)

console.log('\n✅ ¡Conversión completada exitosamente!')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log(`📊 Total de registros: ${results.length}`)
console.log(`📁 Ubicación: ${outputFile}`)
console.log(`💾 Tamaño del archivo: ${fileSize} MB`)
console.log(`📮 Primer CP: ${results[0]?.d_codigo || 'N/A'}`)
console.log(`📮 Último CP: ${results[results.length - 1]?.d_codigo || 'N/A'}`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('\n🎉 ¡Listo! Ya puedes usar el JSON en tu aplicación')