const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const cover=fs.readFileSync(path.join(root,'assets','cover.webp')).toString('base64');
const style=read('style.css').replace('assets/cover.webp','data:image/webp;base64,'+cover);
let html=read('index.html').replace('<link rel="stylesheet" href="style.css">','<style>'+style+'</style>');
for(const file of ['vendor/three.min.js','assets/textures.js','world.js','endless.js','game.js']){
  const source=read(file).replace(/<\/script/gi,'<\\/script');
  html=html.replace('<script src="'+file+'"></script>',()=>'<script>\n'+source+'\n</script>');
}
const license=read('vendor/three-LICENSE.txt');
html=html.replace('<!doctype html>','<!doctype html>\n<!--\nThree.js license follows.\n'+license+'\nStone texture credits: Poly Haven (CC0), Mossy Stone Wall, Monastery Stone Floor, and Rock Boulder Cracked.\nhttps://polyhaven.com/a/mossy_stone_wall\nhttps://polyhaven.com/a/monastery_stone_floor\nhttps://polyhaven.com/a/rock_boulder_cracked\n-->');
const target=path.resolve(process.argv[2]||path.join(root,'雨蚀神殿.html'));
fs.writeFileSync(target,html);
console.log(target,size(target));
function size(file){return fs.statSync(file).size;}
