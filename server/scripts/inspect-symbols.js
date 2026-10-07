const fs = require('fs');

const path = require('path');
const symbolsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../sketch_extracted/pages/78FD6E61-73ED-4C08-94D7-D750709ED21A.json'), 'utf8'));

const targetIds = [
  'CA787F48-7D7F-4616-9126-1C223791D766', // Yellow_Big_Card
  '027561BA-0812-4382-B596-79FF6052F07A', // Small_Cards_Play
  'E51DC11C-10CF-4940-8A3E-C6CC98D45FAB', // Horizontal_Graphs
  '2EDA5C4B-A0E7-4252-8B08-0E10BDBE4E9C', // Contacts
  '24061ECD-F071-4C6C-92CB-22FD48E76804'  // Radial_Progress
];

function printDeep(layer, indent = '  ') {
  let extra = '';
  if (layer.fixedRadius) extra += ' fixedRadius=' + layer.fixedRadius;
  if (layer.points) {
    const radii = layer.points.map(p => p.cornerRadius).filter(Boolean);
    if (radii.length) extra += ' radii=[' + radii.join(',') + ']';
  }
  if (layer.style && layer.style.fills) {
    layer.style.fills.forEach(f => {
      if (f.color) {
        const r = Math.round(f.color.red * 255);
        const g = Math.round(f.color.green * 255);
        const b = Math.round(f.color.blue * 255);
        const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        extra += ` fill=${hex} a=${f.color.alpha}`;
      }
    });
  }
  if (layer.style && layer.style.borders) {
    layer.style.borders.forEach(brd => {
      if (brd.color) {
        const red = Math.round(brd.color.red * 255);
        const green = Math.round(brd.color.green * 255);
        const blue = Math.round(brd.color.blue * 255);
        const hex = '#' + [red, green, blue].map(x => x.toString(16).padStart(2, '0')).join('');
        extra += ` border=${hex} w=${brd.thickness}`;
      }
    });
  }
  if (layer.style && layer.style.shadows) {
    layer.style.shadows.forEach(s => {
      extra += ` shadow(y=${s.offsetY},blur=${s.blurRadius})`;
    });
  }
  if (layer._class === 'text') {
    extra += ` text="${layer.text || ''}"`;
    if (layer.style && layer.style.textStyle) {
      const font = layer.style.textStyle.encodedAttributes.MSAttributedStringFontAttribute?.attributes;
      if (font) extra += ` font=${font.name} size=${font.size}`;
    }
  }
  console.log(indent + layer.name + ' (' + layer._class + ' ' + Math.round(layer.frame.width) + 'x' + Math.round(layer.frame.height) + ')' + extra);
  if (layer.layers) {
    layer.layers.forEach(l => printDeep(l, indent + '  '));
  }
}

for (const id of targetIds) {
  const l = symbolsData.layers.find(x => x.do_objectID === id);
  if (l) {
    console.log('==================================================');
    printDeep(l);
  }
}
